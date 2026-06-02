import { DatabaseService } from './DatabaseService';
import { generateUUID } from '../../utils/uuid';

export interface TemplatePlayer {
  number: number;
  name: string;
  isStarter: boolean;
  licenseNumber?: string;
}

export interface OpponentTemplate {
  id: string;
  name: string;
  players: TemplatePlayer[];
  created_at: string;
  updated_at: string;
}

export class OpponentTemplateRepository {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  async getAll(): Promise<OpponentTemplate[]> {
    const rows = await this.db.query(
      'SELECT * FROM opponent_templates ORDER BY updated_at DESC'
    );
    return rows.map(row => ({
      ...row,
      players: JSON.parse(row.players),
    }));
  }

  async upsertByName(name: string, players: TemplatePlayer[]): Promise<void> {
    const existing = await this.db.query(
      'SELECT id FROM opponent_templates WHERE name = ?',
      [name]
    );
    const now = new Date().toISOString();
    if (existing.length > 0) {
      await this.db.execute(
        'UPDATE opponent_templates SET players = ?, updated_at = ? WHERE name = ?',
        [JSON.stringify(players), now, name]
      );
    } else {
      await this.db.execute(
        'INSERT INTO opponent_templates (id, name, players, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [generateUUID(), name, JSON.stringify(players), now, now]
      );
    }
  }

  async delete(id: string): Promise<void> {
    await this.db.execute('DELETE FROM opponent_templates WHERE id = ?', [id]);
  }
}
