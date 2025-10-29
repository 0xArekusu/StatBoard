import * as SQLite from "expo-sqlite";

export interface IStorageAdapter {
  query(sql: string, params?: any[]): Promise<any[]>;
  execute(sql: string, params?: any[]): Promise<void>;
  transaction(fn: (tx: SQLite.SQLiteDatabase) => Promise<void>): Promise<void>;
}

export class SQLiteAdapter implements IStorageAdapter {
  private db: SQLite.SQLiteDatabase;

  constructor(databaseName: string = "statboard.db") {
    this.db = SQLite.openDatabaseSync(databaseName);

    // 🔄 TEMPORARY RESET - Remove after testing!
    //this.resetDatabaseTables();
    //this.initializeTables();
  }

  // 🔄 TEMPORARY METHOD - Remove after testing! wip
  private resetDatabaseTables(): void {
    try {
      console.log("🔄 Resetting database tables...");
      this.db.execSync("DROP TABLE IF EXISTS match_actions");
      this.db.execSync("DROP TABLE IF EXISTS match_players");
      this.db.execSync("DROP TABLE IF EXISTS matches");
      this.db.execSync("DROP TABLE IF EXISTS database_version");
      console.log("✅ Database tables reset successfully");
    } catch (error) {
      console.error("❌ Error resetting database:", error);
    }
  }

  private initializeTables(): void {
    // Create matches table
    this.db.execSync(`
      CREATE TABLE IF NOT EXISTS matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_a_name TEXT NOT NULL,
        team_b_name TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('in_progress', 'completed', 'paused', 'abandoned')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        started_at DATETIME,
        ended_at DATETIME,
        team_mode TEXT NOT NULL CHECK(team_mode IN ('A', 'B', 'both')),
        match_format TEXT NOT NULL DEFAULT '2_halves' CHECK(match_format IN ('2_halves', '4_quarters')),
        period_duration INTEGER NOT NULL DEFAULT 1200,
        current_period INTEGER DEFAULT 1,
        time_elapsed INTEGER DEFAULT 0,
        final_score_a INTEGER DEFAULT 0,
        final_score_b INTEGER DEFAULT 0,
        score_manually_adjusted INTEGER DEFAULT 0,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create match_actions table
    this.db.execSync(`
      CREATE TABLE IF NOT EXISTS match_actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        match_id INTEGER NOT NULL,
        team TEXT NOT NULL CHECK(team IN ('A', 'B')),
        player_number INTEGER NOT NULL,
        action_type TEXT NOT NULL,
        specification TEXT NOT NULL,
        points INTEGER,
        semantic_x REAL NOT NULL,
        semantic_y REAL NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        action_order INTEGER NOT NULL,
        period_number INTEGER NOT NULL,
        time_in_period INTEGER NOT NULL,
        FOREIGN KEY (match_id) REFERENCES matches (id) ON DELETE CASCADE
      );
    `);

    // Add points column if it doesn't exist (migration for existing databases)
    try {
      this.db.execSync(`
        ALTER TABLE match_actions ADD COLUMN points INTEGER;
      `);
    } catch (error) {
      // Column might already exist, ignore error
    }

    // Add final score columns if they don't exist (migration for existing databases)
    try {
      this.db.execSync(`
        ALTER TABLE matches ADD COLUMN final_score_a INTEGER DEFAULT 0;
      `);
    } catch (error) {
      // Column might already exist, ignore error
    }

    try {
      this.db.execSync(`
        ALTER TABLE matches ADD COLUMN final_score_b INTEGER DEFAULT 0;
      `);
    } catch (error) {
      // Column might already exist, ignore error
    }

    try {
      this.db.execSync(`
        ALTER TABLE matches ADD COLUMN score_manually_adjusted INTEGER DEFAULT 0;
      `);
    } catch (error) {
      // Column might already exist, ignore error
    }

    // Add synced_to_server column if it doesn't exist (for cloud sync feature)
    try {
      this.db.execSync(`
        ALTER TABLE matches ADD COLUMN synced_to_server INTEGER DEFAULT 0;
      `);
    } catch (error) {
      // Column might already exist, ignore error
    }

    // Add created_with_tier column if it doesn't exist (to track subscription tier at creation)
    try {
      this.db.execSync(`
        ALTER TABLE matches ADD COLUMN created_with_tier TEXT DEFAULT 'not_connected';
      `);
    } catch (error) {
      // Column might already exist, ignore error
    }

    // Add club_id column if it doesn't exist (to filter matches by club)
    try {
      this.db.execSync(`
        ALTER TABLE matches ADD COLUMN club_id TEXT;
      `);
    } catch (error) {
      // Column might already exist, ignore error
    }

    // Create match_players table
    this.db.execSync(`
      CREATE TABLE IF NOT EXISTS match_players (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        match_id INTEGER NOT NULL,
        player_number INTEGER NOT NULL,
        player_name TEXT NOT NULL,
        team TEXT NOT NULL CHECK(team IN ('A', 'B')),
        is_starter INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (match_id) REFERENCES matches (id) ON DELETE CASCADE,
        UNIQUE(match_id, player_number, team)
      );
    `);

    // Create indexes
    this.db.execSync(`
      CREATE INDEX IF NOT EXISTS idx_match_actions_match_id ON match_actions(match_id);
    `);

    this.db.execSync(`
      CREATE INDEX IF NOT EXISTS idx_match_actions_timestamp ON match_actions(timestamp);
    `);

    this.db.execSync(`
      CREATE INDEX IF NOT EXISTS idx_match_players_match_id ON match_players(match_id);
    `);
  }

  async query(sql: string, params: any[] = []): Promise<any[]> {
    try {
      const result = this.db.getAllSync(sql, params);
      return result;
    } catch (error) {
      console.error("SQLite query error:", error);
      throw error;
    }
  }

  async execute(sql: string, params: any[] = []): Promise<void> {
    try {
      this.db.runSync(sql, params);
    } catch (error) {
      console.error("SQLite execute error:", error);
      throw error;
    }
  }

  async transaction(
    fn: (tx: SQLite.SQLiteDatabase) => Promise<void>
  ): Promise<void> {
    try {
      await fn(this.db);
    } catch (error) {
      console.error("SQLite transaction error:", error);
      throw error;
    }
  }

  getDatabase(): SQLite.SQLiteDatabase {
    return this.db;
  }
}
