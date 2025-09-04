import { ActionRepository, IActionRepository } from '../database/ActionRepository';
import { CreateActionData } from '../../models/types';

export interface ActionObserver {
  onActionsSaved: (savedCount: number) => void;
  onError: (error: Error) => void;
}

export class ActionQueue {
  private queue: CreateActionData[] = [];
  private repository: IActionRepository;
  private observers: ActionObserver[] = [];
  private processingTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;
  
  // Configuration
  private readonly BATCH_SIZE = 10; // Traiter par lots de 10 actions
  private readonly PROCESS_INTERVAL = 3000; // Toutes les 3 secondes
  private readonly MAX_RETRY_ATTEMPTS = 3;

  constructor() {
    this.repository = new ActionRepository();
    this.startProcessingTimer();
  }

  /**
   * Ajouter une action à la queue
   */
  enqueue(action: CreateActionData): void {
    this.queue.push(action);
    
    console.log(`📊 Action queued (${this.queue.length} in queue):`, {
      type: action.action_type,
      player: action.player_number,
      team: action.team
    });

    // Si on atteint la taille de batch, traiter immédiatement
    if (this.queue.length >= this.BATCH_SIZE) {
      this.processQueueImmediate();
    }
  }

  /**
   * S'abonner aux événements de la queue
   */
  subscribe(observer: ActionObserver): void {
    this.observers.push(observer);
  }

  /**
   * Se désabonner des événements
   */
  unsubscribe(observer: ActionObserver): void {
    this.observers = this.observers.filter(obs => obs !== observer);
  }

  /**
   * Traiter la queue immédiatement
   */
  async processQueueImmediate(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    await this.processQueue();
  }

  /**
   * Vider complètement la queue (pour arrêt propre)
   */
  async flush(): Promise<void> {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = null;
    }

    await this.processQueue();
  }

  /**
   * Obtenir la taille actuelle de la queue
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  private startProcessingTimer(): void {
    this.processingTimer = setInterval(() => {
      if (this.queue.length > 0) {
        this.processQueue();
      }
    }, this.PROCESS_INTERVAL);
  }

  private async processQueue(retryCount = 0): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // Prendre tous les éléments de la queue
      const actionsToProcess = [...this.queue];
      this.queue = []; // Vider la queue immédiatement

      console.log(`🔄 Processing ${actionsToProcess.length} actions...`);

      // Traiter par batch
      const batches = this.createBatches(actionsToProcess, this.BATCH_SIZE);
      let totalProcessed = 0;

      for (const batch of batches) {
        await this.repository.createBatch(batch);
        totalProcessed += batch.length;
      }

      // Notifier les observateurs
      this.notifyObservers('success', totalProcessed);

      console.log(`✅ Successfully processed ${totalProcessed} actions`);

    } catch (error) {
      console.error(`❌ Error processing queue (attempt ${retryCount + 1}):`, error);

      // Retry logic
      if (retryCount < this.MAX_RETRY_ATTEMPTS) {
        console.log(`🔄 Retrying in 1 second... (attempt ${retryCount + 2})`);
        setTimeout(() => {
          this.processQueue(retryCount + 1);
        }, 1000);
      } else {
        // Échec définitif - notifier les observateurs
        this.notifyObservers('error', 0, error as Error);
        console.error('❌ Max retry attempts reached. Actions lost.');
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  private notifyObservers(type: 'success' | 'error', savedCount: number, error?: Error): void {
    this.observers.forEach(observer => {
      try {
        if (type === 'success') {
          observer.onActionsSaved(savedCount);
        } else if (error) {
          observer.onError(error);
        }
      } catch (err) {
        console.error('❌ Error notifying observer:', err);
      }
    });
  }

  /**
   * Nettoyer les ressources
   */
  destroy(): void {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = null;
    }
    this.observers = [];
    this.queue = [];
  }
}