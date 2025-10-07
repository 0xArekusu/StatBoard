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
  private readonly BATCH_SIZE = 10; // Process in batches of 10 actions
  private readonly PROCESS_INTERVAL = 3000; // Every 3 seconds
  private readonly MAX_RETRY_ATTEMPTS = 3;

  constructor() {
    this.repository = new ActionRepository();
    this.startProcessingTimer();
  }

  /**
   * Add an action to the queue
   */
  enqueue(action: CreateActionData): void {
    this.queue.push(action);
    
    console.log(`📊 Action queued (${this.queue.length} in queue):`, {
      type: action.action_type,
      specification: action.specification,
      player: action.player_number,
      team: action.team,
      period: action.period_number,
      timeInPeriod: `${Math.floor(action.time_in_period / 60)}:${(action.time_in_period % 60).toString().padStart(2, '0')}`,
      order: action.action_order
    });

    // If batch size is reached, process immediately
    if (this.queue.length >= this.BATCH_SIZE) {
      this.processQueueImmediate();
    }
  }

  /**
   * Subscribe to queue events
   */
  subscribe(observer: ActionObserver): void {
    this.observers.push(observer);
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(observer: ActionObserver): void {
    this.observers = this.observers.filter(obs => obs !== observer);
  }

  /**
   * Process queue immediately
   */
  async processQueueImmediate(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    await this.processQueue();
  }

  /**
   * Completely flush the queue (for clean shutdown)
   */
  async flush(): Promise<void> {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = null;
    }

    await this.processQueue();
  }

  /**
   * Get current queue size
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
      // Take all elements from the queue
      const actionsToProcess = [...this.queue];
      this.queue = []; // Empty queue immediately

      console.log(`🔄 Processing ${actionsToProcess.length} actions...`);

      // Process in batches
      const batches = this.createBatches(actionsToProcess, this.BATCH_SIZE);
      let totalProcessed = 0;

      for (const batch of batches) {
        await this.repository.createBatch(batch);
        totalProcessed += batch.length;
      }

      // Notify observers
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
        // Final failure - notify observers
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
   * Clean up resources
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