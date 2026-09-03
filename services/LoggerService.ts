/**
 * LoggerService
 *
 * Centralized logging service that writes logs to both console and file.
 * Automatically rotates log file when it exceeds max size.
 * Logs can be retrieved and shared for debugging purposes.
 *
 * Uses expo-file-system legacy API for compatibility.
 */

import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import * as Sentry from "@sentry/react-native";
import i18n from "../src/i18n";

class LoggerService {
  private static instance: LoggerService;
  private logFilePath: string;
  private maxLogSize = 5 * 1024 * 1024; // 5MB max file size
  private isEnabled = true;
  private currentDate: string;

  private constructor() {
    // Store logs in app's document directory with date
    this.currentDate = this.getDateString();
    this.logFilePath = this.getLogFilePathForDate(this.currentDate);
    console.log("[LoggerService] 📁 Log file path:", this.logFilePath);
    this.initializeLogFile();
  }

  /**
   * Get date string in YYYY-MM-DD format
   */
  private getDateString(): string {
    const now = new Date();
    return now.toISOString().split("T")[0];
  }

  /**
   * Get log file path for a specific date
   */
  private getLogFilePathForDate(date: string): string {
    return `${FileSystem.documentDirectory}app-logs-${date}.txt`;
  }

  /**
   * Check if we need to rotate to a new day's log file
   */
  private async checkDateRotation() {
    const currentDate = this.getDateString();
    if (currentDate !== this.currentDate) {
      // New day, switch to new log file
      this.currentDate = currentDate;
      this.logFilePath = this.getLogFilePathForDate(currentDate);
      await this.initializeLogFile();
      console.log(
        "[LoggerService] 📁 Rotated to new log file:",
        this.logFilePath
      );
    }
  }

  /**
   * Get singleton instance
   */
  static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  /**
   * Initialize log file with header
   */
  private async initializeLogFile() {
    try {
      const fileInfo = await FileSystem.getInfoAsync(this.logFilePath);
      if (!fileInfo.exists) {
        const header = `=== App Logs - Started at ${new Date().toISOString()} ===\n\n`;
        await FileSystem.writeAsStringAsync(this.logFilePath, header);
      }
    } catch (error) {
      console.error("Failed to initialize log file:", error);
    }
  }

  /**
   * Log a message with specified level
   * Writes to both console and file
   */
  async log(
    level: "INFO" | "WARN" | "ERROR",
    tag: string,
    message: string,
    data?: any
  ) {
    if (!this.isEnabled) return;

    const timestamp = new Date().toISOString();
    const dataStr = data ? `\n  Data: ${JSON.stringify(data, null, 2)}` : "";
    const logEntry = `[${timestamp}] [${level}] ${tag}: ${message}${dataStr}\n`;

    // Console log (only add emoji for WARN and ERROR, INFO uses emoji from message)
    // const prefix = level === "ERROR" ? "❌" : level === "WARN" ? "⚠️" : "";
    const prefix = "";
    const logMessage = prefix
      ? `${prefix} [${tag}] ${message}`
      : `[${tag}] ${message}`;

    if (data) {
      console.log(logMessage, data);
    } else {
      console.log(logMessage);
    }

    // Add breadcrumb to Sentry for context
    Sentry.addBreadcrumb({
      category: tag,
      message: message,
      level: level === "ERROR" ? "error" : level === "WARN" ? "warning" : "info",
      data: data,
      timestamp: Date.now() / 1000,
    });

    // Write to file asynchronously (don't await to avoid blocking)
    this.writeToFile(logEntry).catch((err) => {
      console.error("Failed to write log to file:", err);
    });
  }

  /**
   * Write log entry to file
   * Automatically rotates log when size limit is reached or date changes
   */
  private async writeToFile(entry: string) {
    try {
      // Check if we need to rotate to a new day
      await this.checkDateRotation();

      // Check if file size exceeds limit
      const fileInfo = await FileSystem.getInfoAsync(this.logFilePath);

      if (fileInfo.exists && fileInfo.size && fileInfo.size > this.maxLogSize) {
        // Create a new log file with sequential number
        const timestamp = new Date()
          .toISOString()
          .replace(/[:.]/g, "-")
          .slice(0, -5);
        const oldFilePath = this.logFilePath;
        this.logFilePath = `${FileSystem.documentDirectory}app-logs-${this.currentDate}-${timestamp}.txt`;
        console.log(
          "[LoggerService] 📁 Log size exceeded, rotated to:",
          this.logFilePath
        );
        await this.initializeLogFile();
      }

      // Append log entry - read current content and append
      let currentContent = "";
      const fileInfo2 = await FileSystem.getInfoAsync(this.logFilePath);
      if (fileInfo2.exists) {
        currentContent = await FileSystem.readAsStringAsync(this.logFilePath);
      }
      await FileSystem.writeAsStringAsync(
        this.logFilePath,
        currentContent + entry
      );
    } catch (error) {
      // Silent fail - don't spam console with file write errors
    }
  }

  /**
   * Get all logs from file
   */
  async getLogs(): Promise<string> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(this.logFilePath);
      if (fileInfo.exists) {
        return await FileSystem.readAsStringAsync(this.logFilePath);
      }
      return "No logs found";
    } catch (error) {
      return `Error reading logs: ${error}`;
    }
  }

  /**
   * Clear all logs
   */
  async clearLogs() {
    try {
      await FileSystem.deleteAsync(this.logFilePath, { idempotent: true });
      await this.initializeLogFile();
      console.log("[LoggerService] ✅ Logs cleared");
    } catch (error) {
      console.error("[LoggerService] ❌ Error clearing logs:", error);
    }
  }

  /**
   * Share logs file (for debugging)
   * On iOS: Uses native share sheet
   * On Android: Saves to user-selected directory (usually Downloads)
   */
  async shareLogs() {
    try {
      // Find all log files in the directory
      const dirInfo = await FileSystem.readDirectoryAsync(
        FileSystem.documentDirectory || ""
      );
      const logFiles = dirInfo.filter((file) => file.startsWith("app-logs-"));

      if (logFiles.length === 0) {
        console.warn("[LoggerService] ⚠️  No log files to share");
        return { success: false, message: i18n.t("loggerService.noLogFiles") };
      }

      // Read all log files and combine them
      let combinedLogs = `=== Coach Assistant Logs Export ===\n`;
      combinedLogs += `=== Platform: ${Platform.OS} ===\n`;
      combinedLogs += `=== Exported at ${new Date().toISOString()} ===\n`;
      combinedLogs += `=== Total files: ${logFiles.length} ===\n\n`;

      for (const file of logFiles.sort()) {
        const filePath = `${FileSystem.documentDirectory}${file}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);

        if (fileInfo.exists) {
          combinedLogs += `\n========================================\n`;
          combinedLogs += `=== File: ${file} ===\n`;
          combinedLogs += `========================================\n\n`;
          const content = await FileSystem.readAsStringAsync(filePath);
          combinedLogs += content + "\n";
        }
      }

      // Generate filename with timestamp
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, -5);
      const filename = `coach-assistant-logs-${timestamp}.txt`;
      const tempFilePath = `${FileSystem.cacheDirectory}${filename}`;

      // Write combined logs to temporary file
      await FileSystem.writeAsStringAsync(tempFilePath, combinedLogs, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (Platform.OS === "ios") {
        // iOS: Use native share sheet
        const isAvailable = await Sharing.isAvailableAsync();
        if (!isAvailable) {
          console.error("[LoggerService] ❌ Sharing is not available on this device");
          return { success: false, message: i18n.t("loggerService.sharingUnavailable") };
        }

        await Sharing.shareAsync(tempFilePath, {
          mimeType: "text/plain",
          dialogTitle: i18n.t("loggerService.shareDialogTitle"),
          UTI: "public.plain-text",
        });

        console.log("[LoggerService] ✅ Logs shared via share sheet");
        return { success: true, message: i18n.t("loggerService.sharedSuccessfully") };
      } else {
        // Android: Use Storage Access Framework to save to Downloads
        const permissions =
          await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

        if (permissions.granted) {
          // Save to user-selected directory
          const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
            permissions.directoryUri,
            filename,
            "text/plain"
          );
          await FileSystem.writeAsStringAsync(fileUri, combinedLogs, {
            encoding: FileSystem.EncodingType.UTF8,
          });
          console.log("[LoggerService] ✅ Logs saved to:", fileUri);
          return { success: true, message: i18n.t("loggerService.savedSuccessfully") };
        } else {
          console.warn("[LoggerService] ⚠️  Permission denied to save file");
          return { success: false, message: i18n.t("loggerService.permissionDenied") };
        }
      }
    } catch (error) {
      console.error("[LoggerService] ❌ Error sharing logs:", error);
      return {
        success: false,
        message: i18n.t("loggerService.exportErrorPrefix", {
          message: error instanceof Error ? error.message : i18n.t("errorAlert.unknownError"),
        }),
      };
    }
  }

  /**
   * Enable/disable logging
   */
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    console.log(
      `${enabled ? "✅" : "❌"} [LoggerService] Logging ${
        enabled ? "enabled" : "disabled"
      }`
    );
  }

  /**
   * Get log file path
   */
  getLogFilePath(): string {
    return this.logFilePath;
  }

  /**
   * Get last N lines from all log files (sorted chronologically)
   * Used for attaching to Sentry errors
   */
  async getLastLines(lineCount: number = 2000): Promise<string> {
    try {
      const dirInfo = await FileSystem.readDirectoryAsync(
        FileSystem.documentDirectory || ""
      );
      const logFiles = dirInfo
        .filter((file) => file.startsWith("app-logs-"))
        .sort();

      if (logFiles.length === 0) {
        return "No logs available";
      }

      let allLines: string[] = [];
      for (const file of logFiles) {
        const filePath = `${FileSystem.documentDirectory}${file}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (fileInfo.exists) {
          const content = await FileSystem.readAsStringAsync(filePath);
          allLines = allLines.concat(content.split("\n"));
        }
      }

      return allLines.slice(-lineCount).join("\n");
    } catch (error) {
      return `Error reading logs: ${error}`;
    }
  }

  /**
   * Send last N lines of logs to Sentry
   * Used for user-initiated log export to help with debugging
   */
  async sendLogsToSentry(lineCount: number = 2000): Promise<{ success: boolean; message: string; eventId?: string }> {
    try {
      const logs = await this.getLastLines(lineCount);

      if (logs === "No logs available" || logs.startsWith("Error reading logs")) {
        return { success: false, message: i18n.t("loggerService.noLogsToSend") };
      }

      // Send logs as a message to Sentry with context
      const eventId = Sentry.captureMessage("User-initiated log export", {
        level: "info",
        contexts: {
          logs: {
            content: logs,
            lineCount: lineCount,
            timestamp: new Date().toISOString(),
            platform: Platform.OS,
          },
        },
      });

      console.log("[LoggerService] ✅ Logs sent to Sentry, Event ID:", eventId);
      return {
        success: true,
        message: i18n.t("loggerService.sentToSentrySuccessfully"),
        eventId: eventId
      };
    } catch (error) {
      console.error("[LoggerService] ❌ Error sending logs to Sentry:", error);
      return {
        success: false,
        message: i18n.t("loggerService.sendErrorPrefix", {
          message: error instanceof Error ? error.message : i18n.t("errorAlert.unknownError"),
        }),
      };
    }
  }
}

// Export singleton instance
export const logger = LoggerService.getInstance();
