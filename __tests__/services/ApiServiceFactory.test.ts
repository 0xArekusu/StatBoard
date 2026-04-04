import { ApiServiceFactory } from "../../src/services/config/ApiServiceFactory";

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("../../src/services/api/SupabaseMatchApiService", () => ({
  SupabaseMatchApiService: jest.fn().mockImplementation(() => ({
    uploadMatch: jest.fn(),
  })),
}));

jest.mock("../../src/services/api/adapters/SupabasePayloadAdapter", () => ({
  SupabasePayloadAdapter: jest.fn().mockImplementation(() => ({
    adapt: jest.fn(),
  })),
}));

jest.mock("../../src/services/database/MatchRepository", () => ({
  MatchRepository: jest.fn().mockImplementation(() => ({})),
}));

jest.mock("../../src/services/database/ActionRepository", () => ({
  ActionRepository: jest.fn().mockImplementation(() => ({})),
}));

jest.mock("../../src/services/database/MatchPlayerRepository", () => ({
  MatchPlayerRepository: jest.fn().mockImplementation(() => ({})),
}));

jest.mock("../../src/services/upload/MatchUploadService", () => ({
  MatchUploadService: jest.fn().mockImplementation((...args: any[]) => ({
    uploadAndCleanup: jest.fn(),
    _args: args,
  })),
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ApiServiceFactory", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  // ─── createMatchApiService ─────────────────────────────────────────────────

  describe("createMatchApiService", () => {
    it("crée un service Supabase si API_TYPE='supabase'", () => {
      process.env.API_TYPE = "supabase";
      process.env.SUPABASE_URL = "https://fake.supabase.co";
      process.env.SUPABASE_ANON_KEY = "fake-key";

      const config = ApiServiceFactory.createMatchApiService();

      expect(config.apiService).toBeDefined();
      expect(config.payloadAdapter).toBeDefined();
    });

    it("crée un service Supabase par défaut si API_TYPE n'est pas défini", () => {
      delete process.env.API_TYPE;
      process.env.SUPABASE_URL = "https://fake.supabase.co";
      process.env.SUPABASE_ANON_KEY = "fake-key";

      const config = ApiServiceFactory.createMatchApiService();

      expect(config.apiService).toBeDefined();
    });

    it("lance une erreur si API_TYPE est inconnu", () => {
      process.env.API_TYPE = "firebase";
      process.env.SUPABASE_URL = "https://fake.supabase.co";
      process.env.SUPABASE_ANON_KEY = "fake-key";

      expect(() => ApiServiceFactory.createMatchApiService()).toThrow("Unknown API type");
    });

    it("lance une erreur si les variables Supabase sont manquantes", () => {
      process.env.API_TYPE = "supabase";
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_ANON_KEY;

      expect(() => ApiServiceFactory.createMatchApiService()).toThrow(
        "Supabase configuration missing"
      );
    });
  });

  // ─── createMatchUploadService ──────────────────────────────────────────────

  describe("createMatchUploadService", () => {
    it("crée un MatchUploadService complet avec toutes ses dépendances", () => {
      process.env.SUPABASE_URL = "https://fake.supabase.co";
      process.env.SUPABASE_ANON_KEY = "fake-key";

      const uploadService = ApiServiceFactory.createMatchUploadService();

      expect(uploadService).toBeDefined();
      expect(typeof uploadService.uploadAndCleanup).toBe("function");
    });
  });
});
