import { DatabaseService } from "../../src/services/database/DatabaseService";

// ─── SQLiteAdapter mock ───────────────────────────────────────────────────────

const mockAdapterQuery = jest.fn();
const mockAdapterExecute = jest.fn();
const mockAdapterTransaction = jest.fn();

jest.mock("../../src/services/storage/SQLiteAdapter", () => ({
  SQLiteAdapter: jest.fn().mockImplementation(() => ({
    query: (...args: any[]) => mockAdapterQuery(...args),
    execute: (...args: any[]) => mockAdapterExecute(...args),
    transaction: (...args: any[]) => mockAdapterTransaction(...args),
  })),
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("DatabaseService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton between tests
    (DatabaseService as any).instance = undefined;
  });

  // ─── Singleton ───────────────────────────────────────────────────────────

  describe("getInstance", () => {
    it("retourne toujours la même instance", () => {
      const a = DatabaseService.getInstance();
      const b = DatabaseService.getInstance();
      expect(a).toBe(b);
    });

    it("crée une nouvelle instance si inexistante", () => {
      const instance = DatabaseService.getInstance();
      expect(instance).toBeInstanceOf(DatabaseService);
    });
  });

  // ─── getAdapter ───────────────────────────────────────────────────────────

  describe("getAdapter", () => {
    it("retourne l'adaptateur SQLite sous-jacent", () => {
      const service = DatabaseService.getInstance();
      const adapter = service.getAdapter();
      expect(adapter).toBeDefined();
      expect(typeof adapter.query).toBe("function");
    });
  });

  // ─── query ────────────────────────────────────────────────────────────────

  describe("query", () => {
    it("délègue à l'adaptateur et retourne les résultats", async () => {
      const rows = [{ id: "1", name: "test" }];
      mockAdapterQuery.mockResolvedValue(rows);

      const service = DatabaseService.getInstance();
      const result = await service.query("SELECT * FROM matches", []);

      expect(mockAdapterQuery).toHaveBeenCalledWith("SELECT * FROM matches", []);
      expect(result).toEqual(rows);
    });

    it("propage l'erreur de l'adaptateur", async () => {
      mockAdapterQuery.mockRejectedValue(new Error("SQLite error"));

      const service = DatabaseService.getInstance();

      await expect(service.query("SELECT 1")).rejects.toThrow("SQLite error");
    });
  });

  // ─── execute ──────────────────────────────────────────────────────────────

  describe("execute", () => {
    it("délègue à l'adaptateur", async () => {
      mockAdapterExecute.mockResolvedValue(undefined);

      const service = DatabaseService.getInstance();
      await service.execute("DELETE FROM matches WHERE id = ?", ["match-1"]);

      expect(mockAdapterExecute).toHaveBeenCalledWith(
        "DELETE FROM matches WHERE id = ?",
        ["match-1"]
      );
    });

    it("propage l'erreur de l'adaptateur", async () => {
      mockAdapterExecute.mockRejectedValue(new Error("Execute error"));

      const service = DatabaseService.getInstance();

      await expect(service.execute("INSERT INTO matches VALUES (?)")).rejects.toThrow(
        "Execute error"
      );
    });
  });

  // ─── transaction ──────────────────────────────────────────────────────────

  describe("transaction", () => {
    it("appelle transaction sur l'adaptateur et exécute la fonction fournie", async () => {
      mockAdapterTransaction.mockImplementation(async (fn: any) => {
        await fn();
      });

      const service = DatabaseService.getInstance();
      const userFn = jest.fn().mockResolvedValue(undefined);

      await service.transaction(userFn);

      expect(mockAdapterTransaction).toHaveBeenCalledTimes(1);
      expect(userFn).toHaveBeenCalledWith(expect.any(Object));
    });

    it("propage l'erreur si la transaction échoue", async () => {
      mockAdapterTransaction.mockRejectedValue(new Error("Transaction error"));

      const service = DatabaseService.getInstance();

      await expect(service.transaction(jest.fn())).rejects.toThrow("Transaction error");
    });
  });
});
