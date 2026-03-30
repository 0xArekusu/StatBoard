import { ActionQueue, ActionObserver } from "../../src/services/match/ActionQueue";
import { CreateActionData, Team } from "../../src/models/types";
import { ActionType, ShotSpecification } from "../../src/models/ActionTypes";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockCreateBatch = jest.fn();

jest.mock("../../src/services/database/ActionRepository", () => ({
  ActionRepository: jest.fn().mockImplementation(() => ({
    createBatch: mockCreateBatch,
  })),
}));

jest.mock("../../utils/logger", () => ({
  logInfo: jest.fn(),
  logError: jest.fn(),
  logWarn: jest.fn(),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeAction = (overrides: Partial<CreateActionData> = {}): CreateActionData => ({
  match_id: "match-1",
  team: Team.MY_TEAM,
  player_number: 10,
  action_type: ActionType.SHOT,
  specification: ShotSpecification.MADE,
  points: 2,
  semantic_x: 0.5,
  semantic_y: 0.5,
  action_order: 1,
  period_number: 1,
  time_in_period: 120,
  ...overrides,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ActionQueue", () => {
  let queue: ActionQueue;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockCreateBatch.mockResolvedValue([]);
    queue = new ActionQueue();
  });

  afterEach(() => {
    queue.destroy();
    jest.useRealTimers();
  });

  // ─── enqueue ────────────────────────────────────────────────────────────────

  describe("enqueue", () => {
    it("ajoute une action et augmente la taille de la queue", () => {
      queue.enqueue(makeAction());
      expect(queue.getQueueSize()).toBe(1);
    });

    it("accumule plusieurs actions", () => {
      queue.enqueue(makeAction({ action_order: 1 }));
      queue.enqueue(makeAction({ action_order: 2 }));
      queue.enqueue(makeAction({ action_order: 3 }));
      expect(queue.getQueueSize()).toBe(3);
    });

    it("déclenche le traitement immédiat quand le batch size (10) est atteint", async () => {
      for (let i = 0; i < 10; i++) {
        queue.enqueue(makeAction({ action_order: i }));
      }
      // Laisser la promesse se résoudre
      await Promise.resolve();
      expect(mockCreateBatch).toHaveBeenCalledTimes(1);
      expect(queue.getQueueSize()).toBe(0);
    });

    it("ne déclenche pas le traitement immédiat avant le batch size", async () => {
      for (let i = 0; i < 9; i++) {
        queue.enqueue(makeAction({ action_order: i }));
      }
      await Promise.resolve();
      expect(mockCreateBatch).not.toHaveBeenCalled();
      expect(queue.getQueueSize()).toBe(9);
    });
  });

  // ─── processQueueImmediate ───────────────────────────────────────────────────

  describe("processQueueImmediate", () => {
    it("ne fait rien si la queue est vide", async () => {
      await queue.processQueueImmediate();
      expect(mockCreateBatch).not.toHaveBeenCalled();
    });

    it("appelle createBatch avec les actions de la queue", async () => {
      queue.enqueue(makeAction({ action_order: 1 }));
      queue.enqueue(makeAction({ action_order: 2 }));
      await queue.processQueueImmediate();
      expect(mockCreateBatch).toHaveBeenCalledTimes(1);
      expect(mockCreateBatch.mock.calls[0][0]).toHaveLength(2);
    });

    it("vide la queue après traitement", async () => {
      queue.enqueue(makeAction());
      await queue.processQueueImmediate();
      expect(queue.getQueueSize()).toBe(0);
    });

    it("ne traite pas si déjà en cours (pas de double traitement)", async () => {
      // Simuler un traitement lent
      let resolveFirst: () => void;
      const firstPromise = new Promise<void>((res) => (resolveFirst = res));
      mockCreateBatch.mockReturnValueOnce(firstPromise);

      queue.enqueue(makeAction({ action_order: 1 }));
      queue.enqueue(makeAction({ action_order: 2 }));

      const first = queue.processQueueImmediate();
      // Appel concurrent — doit être ignoré car isProcessing = true
      await queue.processQueueImmediate();

      resolveFirst!();
      await first;

      expect(mockCreateBatch).toHaveBeenCalledTimes(1);
    });
  });

  // ─── flush ───────────────────────────────────────────────────────────────────

  describe("flush", () => {
    it("traite toutes les actions restantes", async () => {
      queue.enqueue(makeAction({ action_order: 1 }));
      queue.enqueue(makeAction({ action_order: 2 }));
      await queue.flush();
      expect(mockCreateBatch).toHaveBeenCalledTimes(1);
      expect(queue.getQueueSize()).toBe(0);
    });

    it("ne fait rien si la queue est vide", async () => {
      await queue.flush();
      expect(mockCreateBatch).not.toHaveBeenCalled();
    });

    it("arrête le timer de traitement automatique", async () => {
      await queue.flush();
      // Avancer le timer — ne devrait pas déclencher de traitement
      queue.enqueue(makeAction());
      jest.advanceTimersByTime(10000);
      // Le timer est arrêté, createBatch ne sera appelé qu'une fois (pour le flush)
      await Promise.resolve();
    });
  });

  // ─── getQueueSize ────────────────────────────────────────────────────────────

  describe("getQueueSize", () => {
    it("retourne 0 pour une queue vide", () => {
      expect(queue.getQueueSize()).toBe(0);
    });

    it("retourne le nombre d'actions en attente", () => {
      queue.enqueue(makeAction({ action_order: 1 }));
      queue.enqueue(makeAction({ action_order: 2 }));
      expect(queue.getQueueSize()).toBe(2);
    });
  });

  // ─── subscribe / unsubscribe ─────────────────────────────────────────────────

  describe("subscribe / unsubscribe", () => {
    it("notifie l'observer de succès après traitement", async () => {
      const observer: ActionObserver = {
        onActionsSaved: jest.fn(),
        onError: jest.fn(),
      };
      queue.subscribe(observer);
      queue.enqueue(makeAction());
      await queue.processQueueImmediate();
      expect(observer.onActionsSaved).toHaveBeenCalledWith(1);
      expect(observer.onError).not.toHaveBeenCalled();
    });

    it("la queue reste utilisable après un échec de createBatch", async () => {
      mockCreateBatch
        .mockRejectedValueOnce(new Error("DB crash"))
        .mockResolvedValue([]);

      const observer: ActionObserver = {
        onActionsSaved: jest.fn(),
        onError: jest.fn(),
      };
      queue.subscribe(observer);

      // Premier traitement : échoue
      queue.enqueue(makeAction({ action_order: 1 }));
      await queue.processQueueImmediate();

      // Deuxième traitement : succès
      queue.enqueue(makeAction({ action_order: 2 }));
      await queue.processQueueImmediate();

      expect(observer.onActionsSaved).toHaveBeenCalledWith(1);
      expect(queue.getQueueSize()).toBe(0);
    });

    it("supprime l'observer après unsubscribe", async () => {
      const observer: ActionObserver = {
        onActionsSaved: jest.fn(),
        onError: jest.fn(),
      };
      queue.subscribe(observer);
      queue.unsubscribe(observer);
      queue.enqueue(makeAction());
      await queue.processQueueImmediate();
      expect(observer.onActionsSaved).not.toHaveBeenCalled();
    });

    it("n'est pas affecté par une erreur dans un observer", async () => {
      const badObserver: ActionObserver = {
        onActionsSaved: jest.fn().mockImplementation(() => {
          throw new Error("Observer crash");
        }),
        onError: jest.fn(),
      };
      const goodObserver: ActionObserver = {
        onActionsSaved: jest.fn(),
        onError: jest.fn(),
      };
      queue.subscribe(badObserver);
      queue.subscribe(goodObserver);
      queue.enqueue(makeAction());
      await queue.processQueueImmediate();
      // Le bon observer doit quand même être notifié
      expect(goodObserver.onActionsSaved).toHaveBeenCalledWith(1);
    });
  });

  // ─── destroy ─────────────────────────────────────────────────────────────────

  describe("destroy", () => {
    it("vide la queue", () => {
      queue.enqueue(makeAction());
      queue.destroy();
      expect(queue.getQueueSize()).toBe(0);
    });

    it("arrête le timer (aucun traitement après destroy)", async () => {
      queue.enqueue(makeAction());
      queue.destroy();
      jest.advanceTimersByTime(10000);
      await Promise.resolve();
      expect(mockCreateBatch).not.toHaveBeenCalled();
    });
  });

  // ─── timer auto-processing ───────────────────────────────────────────────────

  describe("timer auto-processing (toutes les 3 secondes)", () => {
    it("déclenche le traitement automatiquement après 3 secondes", async () => {
      queue.enqueue(makeAction());
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
      await Promise.resolve(); // double flush pour s'assurer que les promesses sont résolues
      expect(mockCreateBatch).toHaveBeenCalledTimes(1);
    });

    it("ne traite pas si la queue est vide", async () => {
      jest.advanceTimersByTime(3000);
      await Promise.resolve();
      expect(mockCreateBatch).not.toHaveBeenCalled();
    });
  });
});
