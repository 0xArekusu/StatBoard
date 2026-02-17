import { supabase } from '../src/config/supabase';

/**
 * Service Layer Pattern - Admin Management
 *
 * Manages admin user verification with caching.
 * Follows SOLID principles:
 * - Single Responsibility: Only handles admin status verification
 * - Open/Closed: Extensible via configuration
 * - Dependency Inversion: Depends on Supabase abstraction
 *
 * Features:
 * - Singleton pattern for global access
 * - In-memory cache to avoid repeated database queries
 * - Automatic cache invalidation on auth state changes
 *
 * Usage:
 * ```typescript
 * const adminService = AdminService.getInstance();
 * const isAdmin = await adminService.isAdmin();
 * if (isAdmin) {
 *   // Show admin features
 * }
 * ```
 */
export class AdminService {
  private static instance: AdminService;
  private adminStatusCache: boolean | null = null;
  private currentUserId: string | null = null;

  private constructor() {
    // Listen to auth changes to invalidate cache
    supabase.auth.onAuthStateChange((event, session) => {
      const newUserId = session?.user?.id || null;

      // Clear cache if user changed or logged out
      if (newUserId !== this.currentUserId) {
        this.clearCache();
        this.currentUserId = newUserId;
      }
    });
  }

  /**
   * Get singleton instance of AdminService
   * Ensures only one instance exists throughout the app
   */
  public static getInstance(): AdminService {
    if (!AdminService.instance) {
      AdminService.instance = new AdminService();
    }
    return AdminService.instance;
  }

  /**
   * Check if the current user is an admin
   * Uses cache to avoid repeated database queries
   *
   * @returns Promise<boolean> - true if user is admin, false otherwise
   */
  public async isAdmin(): Promise<boolean> {
    // Return cached value if available
    if (this.adminStatusCache !== null) {
      return this.adminStatusCache;
    }

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        this.adminStatusCache = false;
        return false;
      }

      // Check if user exists in admins table
      const { data, error } = await supabase
        .from('admins')
        .select('user_id')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // PGRST116 = no rows returned (not an admin)
        if (error.code === 'PGRST116') {
          this.adminStatusCache = false;
          return false;
        }

        // Other errors, log and return false for safety
        console.error('Error checking admin status:', error);
        this.adminStatusCache = false;
        return false;
      }

      // User found in admins table
      this.adminStatusCache = !!data;
      return this.adminStatusCache;

    } catch (error) {
      console.error('Unexpected error in isAdmin:', error);
      this.adminStatusCache = false;
      return false;
    }
  }

  /**
   * Force refresh admin status from database
   * Useful after granting/revoking admin privileges
   *
   * @returns Promise<boolean> - Updated admin status
   */
  public async refreshAdminStatus(): Promise<boolean> {
    this.clearCache();
    return await this.isAdmin();
  }

  /**
   * Clear the admin status cache
   * Automatically called on auth state changes
   */
  public clearCache(): void {
    this.adminStatusCache = null;
  }

  /**
   * Get cached admin status without hitting database
   * Returns null if not yet cached
   *
   * @returns boolean | null - Cached admin status or null
   */
  public getCachedStatus(): boolean | null {
    return this.adminStatusCache;
  }
}
