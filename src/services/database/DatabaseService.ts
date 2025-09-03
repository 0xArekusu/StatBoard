import { SQLiteAdapter, IStorageAdapter } from '../storage/SQLiteAdapter';

export class DatabaseService {
  private static instance: DatabaseService;
  private adapter: IStorageAdapter;

  private constructor() {
    this.adapter = new SQLiteAdapter();
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  getAdapter(): IStorageAdapter {
    return this.adapter;
  }

  async query(sql: string, params?: any[]): Promise<any[]> {
    return this.adapter.query(sql, params);
  }

  async execute(sql: string, params?: any[]): Promise<void> {
    return this.adapter.execute(sql, params);
  }

  async transaction(fn: (adapter: IStorageAdapter) => Promise<void>): Promise<void> {
    return this.adapter.transaction(async () => {
      await fn(this.adapter);
    });
  }
}