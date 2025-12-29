import { SQLiteAdapter, IStorageAdapter } from '../storage/SQLiteAdapter';

/**
 * Database Service - Singleton Pattern
 * Centralized SQLite database access layer
 *
 * Features:
 * - Singleton instance ensures single database connection
 * - Adapter pattern for potential future database swapping
 * - SQL query execution with parameter binding
 * - Transaction support for atomic operations
 *
 * Usage:
 * - Repositories use this service to access SQLite
 * - Provides abstraction over raw SQLite operations
 * - Ensures consistent database access across the app
 */
export class DatabaseService {
  private static instance: DatabaseService;
  private adapter: IStorageAdapter;

  private constructor() {
    this.adapter = new SQLiteAdapter();
  }

  /**
   * Get singleton instance of DatabaseService
   * Creates instance on first call
   *
   * @returns The DatabaseService singleton instance
   */
  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Get the underlying storage adapter
   * Used by repositories that need direct adapter access
   *
   * @returns The storage adapter instance
   */
  getAdapter(): IStorageAdapter {
    return this.adapter;
  }

  /**
   * Execute a SQL query and return results
   * Use for SELECT queries that return data
   *
   * @param sql - SQL query string with ? placeholders
   * @param params - Optional parameters to bind to placeholders
   * @returns Array of result rows
   */
  async query(sql: string, params?: any[]): Promise<any[]> {
    return this.adapter.query(sql, params);
  }

  /**
   * Execute a SQL statement without returning results
   * Use for INSERT, UPDATE, DELETE statements
   *
   * @param sql - SQL statement string with ? placeholders
   * @param params - Optional parameters to bind to placeholders
   */
  async execute(sql: string, params?: any[]): Promise<void> {
    return this.adapter.execute(sql, params);
  }

  /**
   * Execute multiple operations in a transaction
   * All operations succeed or all fail (atomic)
   *
   * @param fn - Function containing database operations
   */
  async transaction(fn: (adapter: IStorageAdapter) => Promise<void>): Promise<void> {
    return this.adapter.transaction(async () => {
      await fn(this.adapter);
    });
  }
}