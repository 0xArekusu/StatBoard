/**
 * ActionQueue
 *
 * In-memory queue for batching and persisting basketball actions to SQLite.
 * Reduces database write overhead during fast-paced match recording.
 *
 * Architecture:
 * - In-memory queue: Buffers actions temporarily
 * - Batch processing: Writes multiple actions in single transaction
 * - Auto-processing: Timer triggers every 3 seconds if queue has items
 * - Immediate processing: Triggers when batch size (10) is reached
 * - Retry logic: 3 attempts with 1-second delay between retries
 *
 * Observer Pattern:
 * - Components can subscribe to success/error events
 * - Used by BoardScreen to show save feedback to user
 *
 * Configuration:
 * - BATCH_SIZE: 10 actions (triggers immediate processing)
 * - PROCESS_INTERVAL: 3000ms (auto-process timer)
 * - MAX_RETRY_ATTEMPTS: 3 retries on failure
 *
 * Lifecycle:
 * - Created: Starts auto-processing timer
 * - Destroyed: Stops timer, clears queue and observers
 * - Flushed: Forces all pending actions to be saved (on match end)
 */
import { ActionRepository, IActionRepository } from '../database/ActionRepository';
import { CreateActionData } from '../../models/types';
import { logInfo, logError, logWarn } from '../../../utils/logger';

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
    logInfo('ActionQueue', '🎯 ActionQueue initialized', {
      batchSize: this.BATCH_SIZE,
      processInterval: this.PROCESS_INTERVAL,
      maxRetries: this.MAX_RETRY_ATTEMPTS
    });
  }

  /**
   * Add an action to the queue
   * Triggers immediate processing if batch size is reached
   */
  enqueue(action: CreateActionData): void {
    this.queue.push(action);

    logInfo('ActionQueue', `📊 Action queued (${this.queue.length} in queue)`, {
      type: action.action_type,
      specification: action.specification,
      player: action.player_number,
      team: action.team,
      period: action.period_number,
      timeInPeriod: `${Math.floor(action.time_in_period / 60)}:${(action.time_in_period % 60).toString().padStart(2, '0')}`,
      order: action.action_order,
      queueSize: this.queue.length
    });

    // If batch size is reached, process immediately
    if (this.queue.length >= this.BATCH_SIZE) {
      logInfo('ActionQueue', '⚡ Batch size reached - triggering immediate processing', {
        queueSize: this.queue.length,
        batchSize: this.BATCH_SIZE
      });
      this.processQueueImmediate();
    }
  }

  /**
   * Subscribe to queue events
   * Used by UI components to show save feedback
   */
  subscribe(observer: ActionObserver): void {
    this.observers.push(observer);
    logInfo('ActionQueue', '👀 Observer subscribed', {
      totalObservers: this.observers.length
    });
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(observer: ActionObserver): void {
    this.observers = this.observers.filter(obs => obs !== observer);
    logInfo('ActionQueue', '👋 Observer unsubscribed', {
      totalObservers: this.observers.length
    });
  }

  /**
   * Process queue immediately (skip timer)
   * Used when batch size is reached or manual flush needed
   */
  async processQueueImmediate(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    await this.processQueue();
  }

  /**
   * Completely flush the queue (for clean shutdown)
   * Stops auto-processing timer and saves all pending actions
   * Called on match end to ensure no data loss
   */
  async flush(): Promise<void> {
    logInfo('ActionQueue', '💾 Flushing queue (forced save)', {
      pendingActions: this.queue.length
    });

    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = null;
    }

    await this.processQueue();
  }

  /**
   * Get current queue size
   * Used for debugging and monitoring
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Start auto-processing timer
   * Checks queue every 3 seconds and processes if not empty
   */
  private startProcessingTimer(): void {
    this.processingTimer = setInterval(() => {
      if (this.queue.length > 0) {
        logInfo('ActionQueue', '⏰ Auto-processing timer triggered', {
          queueSize: this.queue.length
        });
        this.processQueue();
      }
    }, this.PROCESS_INTERVAL);
  }

  /**
   * Process all queued actions with retry logic
   * Empties queue immediately to avoid duplicates
   * Retries up to MAX_RETRY_ATTEMPTS times on failure
   */
  private async processQueue(retryCount = 0): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // Take all elements from the queue
      const actionsToProcess = [...this.queue];
      this.queue = []; // Empty queue immediately to prevent duplicates

      logInfo('ActionQueue', `🔄 Processing ${actionsToProcess.length} actions`, {
        retryAttempt: retryCount,
        totalActions: actionsToProcess.length
      });

      // Process in batches
      const batches = this.createBatches(actionsToProcess, this.BATCH_SIZE);
      let totalProcessed = 0;

      for (const batch of batches) {
        await this.repository.createBatch(batch);
        totalProcessed += batch.length;
      }

      // Notify observers
      this.notifyObservers('success', totalProcessed);

      logInfo('ActionQueue', `✅ Successfully processed ${totalProcessed} actions`, {
        batchCount: batches.length,
        totalProcessed
      });

    } catch (error) {
      logError('ActionQueue', `❌ Error processing queue (attempt ${retryCount + 1})`, {
        retryCount,
        error: error instanceof Error ? error.message : error
      });

      // Retry logic
      if (retryCount < this.MAX_RETRY_ATTEMPTS) {
        logWarn('ActionQueue', `🔄 Retrying in 1 second... (attempt ${retryCount + 2})`, {
          nextAttempt: retryCount + 2,
          maxAttempts: this.MAX_RETRY_ATTEMPTS
        });
        setTimeout(() => {
          this.processQueue(retryCount + 1);
        }, 1000);
      } else {
        // Final failure - notify observers
        this.notifyObservers('error', 0, error as Error);
        logError('ActionQueue', '❌ Max retry attempts reached - actions lost', {
          maxAttempts: this.MAX_RETRY_ATTEMPTS,
          error: error instanceof Error ? error.message : error
        });
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Split array into smaller batches
   * Used for batch database inserts
   */
  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Notify all subscribed observers of success/error
   * Catches observer errors to prevent cascade failures
   */
  private notifyObservers(type: 'success' | 'error', savedCount: number, error?: Error): void {
    this.observers.forEach(observer => {
      try {
        if (type === 'success') {
          observer.onActionsSaved(savedCount);
        } else if (error) {
          observer.onError(error);
        }
      } catch (err) {
        logError('ActionQueue', '❌ Error notifying observer', {
          error: err instanceof Error ? err.message : err
        });
      }
    });
  }

  /**
   * Clean up resources and stop processing
   * Called when ActionQueue is no longer needed
   */
  destroy(): void {
    logInfo('ActionQueue', '🧹 Destroying ActionQueue', {
      pendingActions: this.queue.length,
      observers: this.observers.length
    });

    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = null;
    }
    this.observers = [];
    this.queue = [];
  }
}