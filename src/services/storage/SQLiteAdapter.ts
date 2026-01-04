import * as SQLite from "expo-sqlite";

export interface IStorageAdapter {
  query(sql: string, params?: any[]): Promise<any[]>;
  execute(sql: string, params?: any[]): Promise<void>;
  transaction(fn: (tx: SQLite.SQLiteDatabase) => Promise<void>): Promise<void>;
}

export class SQLiteAdapter implements IStorageAdapter {
  private db: SQLite.SQLiteDatabase;

  constructor(databaseName: string = "coachassistant.db") {
    this.db = SQLite.openDatabaseSync(databaseName);

    // 🔄 TEMPORARY RESET - Remove after testing!
    //this.resetDatabaseTables();
    this.initializeTables();
  }

  // 🔄 TEMPORARY METHOD - Remove after testing! wip
  private resetDatabaseTables(): void {
    try {
      console.log("🔄 Resetting database tables...");
      this.db.execSync("DROP TABLE IF EXISTS match_actions");
      this.db.execSync("DROP TABLE IF EXISTS matches");
      this.db.execSync("DROP TABLE IF EXISTS database_version");
      console.log("✅ Database tables reset successfully");
    } catch (error) {
      console.error("❌ Error resetting database:", error);
    }
  }

  private initializeTables(): void {
    // Create matches table (new schema with embedded players)
    this.db.execSync(`
      CREATE TABLE IF NOT EXISTS matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        -- Club & Team
        club_id TEXT,
        team_id TEXT,

        -- Match Info
        my_team_name TEXT,
        opponent_name TEXT NOT NULL,
        is_home INTEGER NOT NULL DEFAULT 1,

        -- Match Configuration
        total_periods INTEGER NOT NULL DEFAULT 4,
        period_duration INTEGER NOT NULL DEFAULT 600,
        overtime_duration INTEGER NOT NULL DEFAULT 300,
        overtime_periods INTEGER NOT NULL DEFAULT 0,

        -- Scores
        my_team_score INTEGER NOT NULL DEFAULT 0,
        opponent_score INTEGER NOT NULL DEFAULT 0,
        score_manually_adjusted INTEGER DEFAULT 0,

        -- Match State (local only)
        status TEXT NOT NULL DEFAULT 'in_progress' CHECK(status IN ('in_progress', 'completed', 'cancelled')),
        current_period INTEGER DEFAULT 1,
        time_elapsed INTEGER DEFAULT 0,

        -- Players data (JSONB stored as TEXT in SQLite)
        players TEXT DEFAULT '[]',
        player_stats TEXT DEFAULT '{}',

        -- Timestamps
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        started_at DATETIME,
        ended_at DATETIME,
        synced_at DATETIME,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,

        -- Legacy
        synced_to_server INTEGER DEFAULT 0,
        created_with_tier TEXT DEFAULT 'not_connected'
      );
    `);

    // Create match_actions table
    this.db.execSync(`
      CREATE TABLE IF NOT EXISTS match_actions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        match_id INTEGER NOT NULL,
        team TEXT NOT NULL CHECK(team IN ('MyTeam', 'Opponent')),
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

    // Add my_team_name column if it doesn't exist (migration for existing databases)
    try {
      this.db.execSync(`
        ALTER TABLE matches ADD COLUMN my_team_name TEXT;
      `);
    } catch (error) {
      // Column might already exist, ignore error
    }

    // Add players column to matches if it doesn't exist (embedded players data)
    try {
      this.db.execSync(`
        ALTER TABLE matches ADD COLUMN players TEXT DEFAULT '[]';
      `);
    } catch (error) {
      // Column might already exist, ignore error
    }

    // Add player_stats column to matches if it doesn't exist (embedded stats data)
    try {
      this.db.execSync(`
        ALTER TABLE matches ADD COLUMN player_stats TEXT DEFAULT '{}';
      `);
    } catch (error) {
      // Column might already exist, ignore error
    }

    // Create indexes
    this.db.execSync(`
      CREATE INDEX IF NOT EXISTS idx_match_actions_match_id ON match_actions(match_id);
    `);

    this.db.execSync(`
      CREATE INDEX IF NOT EXISTS idx_match_actions_timestamp ON match_actions(timestamp);
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
