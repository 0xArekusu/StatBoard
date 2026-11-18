/**
 * DemoServiceFactory
 *
 * Factory + Singleton for the demo services, mirroring ServiceFactory.
 * Wires the launcher to the existing SQLite repository without modifying it.
 */

import { MatchRepository } from "../../src/services/database/MatchRepository";
import { DemoMatchLauncher } from "./DemoMatchLauncher";

export class DemoServiceFactory {
  private static matchLauncherInstance: DemoMatchLauncher | null = null;

  static getMatchLauncher(): DemoMatchLauncher {
    if (!this.matchLauncherInstance) {
      this.matchLauncherInstance = new DemoMatchLauncher(new MatchRepository());
    }
    return this.matchLauncherInstance;
  }

  /** Clears the singleton (for tests) */
  static reset(): void {
    this.matchLauncherInstance = null;
  }
}
