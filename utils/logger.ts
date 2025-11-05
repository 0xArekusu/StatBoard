/**
 * Logger Utility Functions
 *
 * Convenient wrapper functions for the LoggerService.
 * Use these throughout the app instead of console.log.
 *
 * Usage:
 *   import { logInfo, logError } from '../utils/logger';
 *
 *   logInfo("ScreenName", "User logged in", { userId: user.id });
 *   logError("ScreenName", "Failed to load data", { error: err.message });
 */

import { logger } from '../services/LoggerService';

/**
 * Log informational message
 * @param tag - Component/screen/service name
 * @param message - Log message
 * @param data - Optional data object
 */
export const logInfo = (tag: string, message: string, data?: any) => {
  logger.log('INFO', tag, message, data);
};

/**
 * Log warning message
 * @param tag - Component/screen/service name
 * @param message - Warning message
 * @param data - Optional data object
 */
export const logWarn = (tag: string, message: string, data?: any) => {
  logger.log('WARN', tag, message, data);
};

/**
 * Log error message
 * @param tag - Component/screen/service name
 * @param message - Error message
 * @param data - Optional data object
 */
export const logError = (tag: string, message: string, data?: any) => {
  logger.log('ERROR', tag, message, data);
};

/**
 * Get all logs from file
 * @returns Promise with log content as string
 */
export const getLogs = () => logger.getLogs();

/**
 * Clear all logs
 */
export const clearLogs = () => logger.clearLogs();

/**
 * Share logs file
 */
export const shareLogs = () => logger.shareLogs();

/**
 * Enable/disable logging
 */
export const setLoggingEnabled = (enabled: boolean) => logger.setEnabled(enabled);

/**
 * Get log file path
 */
export const getLogFilePath = () => logger.getLogFilePath();
