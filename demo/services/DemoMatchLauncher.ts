/**
 * DemoMatchLauncher
 *
 * Decides which match the demo opens: the match left in progress in the
 * browser storage (so a page reload resumes it), or a brand new one.
 * Depends on a narrow slice of the match repository interface (ISP + DIP).
 */

import { IMatchRepository } from "../../src/services/database/MatchRepository";
import { MatchStatus } from "../../src/models/types";
import { RootStackParamList } from "../../types/navigation";
import { logInfo, logWarn } from "../../utils/logger";
import { buildDemoMatchData } from "./demoMatchDataBuilder";

/** Repository operations the launcher relies on */
export type DemoMatchSource = Pick<IMatchRepository, "findActiveMatch" | "updateStatus">;

export type DemoLaunchParams = RootStackParamList["LiveMatch"];

export class DemoMatchLauncher {
  constructor(
    private readonly matchSource: DemoMatchSource,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /**
   * Returns the LiveMatch route params: resume the match in progress, or
   * start a new one when there is none or when a reset is requested.
   */
  async resolveLaunchParams(shouldReset: boolean): Promise<DemoLaunchParams> {
    const activeMatch = await this.matchSource.findActiveMatch();

    if (activeMatch && !shouldReset) {
      logInfo("DemoMatchLauncher", "🔄 Resuming demo match", { matchId: activeMatch.id });
      return { matchId: activeMatch.id };
    }

    if (activeMatch) {
      await this.discardMatch(activeMatch.id);
    }

    logInfo("DemoMatchLauncher", "🆕 Starting a new demo match");
    return { matchData: buildDemoMatchData(this.now()) };
  }

  /**
   * Cancels the match in progress. A failure is not blocking: the new match is
   * more recent, so it is the one found as active on the next launch.
   */
  private async discardMatch(matchId: string): Promise<void> {
    try {
      await this.matchSource.updateStatus(matchId, MatchStatus.CANCELLED, this.now());
      logInfo("DemoMatchLauncher", "🧹 Demo match cancelled on reset", { matchId });
    } catch (error) {
      logWarn("DemoMatchLauncher", "⚠️ Could not cancel the previous demo match", {
        matchId,
        error,
      });
    }
  }
}
