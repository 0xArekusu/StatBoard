/**
 * Development Configuration
 * Enable/disable dev features easily
 */

export const DEV_CONFIG = {
  // Enable multi-club feature for admin user
  ENABLE_MULTI_CLUB: true,

  // Admin user ID that has access to dev features
  ADMIN_USER_ID: "25d5f263-4de2-4b3b-94a7-45aa5a1d8018",
};

/**
 * Check if multi-club feature is enabled for a user
 */
export const canUseMultiClub = (userId: string | undefined): boolean => {
  return DEV_CONFIG.ENABLE_MULTI_CLUB && userId === DEV_CONFIG.ADMIN_USER_ID;
};
