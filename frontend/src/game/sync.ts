// Sync Manager - Handles offline queue and server synchronization
import { GameState } from './state';
import { StorageService, OfflineAction } from '../services/storage';
import { ApiService, PlayerStateResponse } from '../services/api';

export class SyncManager {
  private state: GameState;
  private storage: StorageService;
  private api: ApiService;
  private isSyncing = false;
  
  constructor(state: GameState, storage: StorageService) {
    this.state = state;
    this.storage = storage;
    this.api = new ApiService();
    
    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    // Initial sync if online
    if (navigator.onLine) {
      this.syncWithServer();
    }
  }
  
  private handleOnline(): void {
    console.log('🌐 Back online');
    this.state.isOnline = true;
    this.syncWithServer();
  }
  
  private handleOffline(): void {
    console.log('📴 Gone offline');
    this.state.isOnline = false;
  }
  
  // Queue an action for later sync
  queueAction(type: OfflineAction['type'], payload: Record<string, unknown>): void {
    this.storage.addToOfflineQueue({ type, payload });
  }
  
  // Save current state locally
  saveLocal(): void {
    this.state.lastSeenAt = Date.now();
    this.storage.saveGameState(this.state);
    console.log('💾 Game saved locally');
  }
  
  // Sync with server
  async syncWithServer(): Promise<boolean> {
    if (this.isSyncing || !navigator.onLine) {
      return false;
    }
    
    this.isSyncing = true;
    
    try {
      // First, ensure player exists on server (get or create)
      const playerResponse = await this.api.getGameState(this.state.playerId);
      if (!playerResponse.success) {
        console.warn('Could not verify player on server:', playerResponse.error);
      }
      
      // Send current state to server
      const response = await this.api.syncState(this.state.playerId, {
        currencies: { cash: this.state.currencies.cash },
        industries: this.state.industries
      });
      
      if (response.success && response.data) {
        this.mergeServerState(response.data);
      }
      
      // Clear offline queue on successful sync
      const queue = this.storage.getOfflineQueue();
      for (const action of queue) {
        this.storage.removeFromOfflineQueue(action.id);
      }
      
      this.state.lastSyncAt = Date.now();
      this.saveLocal();
      
      console.log('✅ Sync complete');
      return true;
    } catch (error) {
      console.error('Sync failed:', error);
      return false;
    } finally {
      this.isSyncing = false;
    }
  }
  
  private mergeServerState(serverState: PlayerStateResponse): void {
    // Server is authoritative for:
    // - Gems (premium currency)
    // - Prestige state
    
    // Client is authoritative for:
    // - Cash (calculated locally)
    // - Pending earnings (calculated locally)
    // - Decay state (calculated locally)
    
    // Take server gems (premium currency)
    this.state.currencies.gems = serverState.currencies.gems;
    
    // Merge prestige state from server
    if (serverState.prestige) {
      this.state.prestige = {
        ...this.state.prestige,
        count: serverState.prestige.count,
        multiplier: serverState.prestige.multiplier,
        empirePoints: serverState.prestige.empirePoints,
      };
    }
  }
  
  // Check if there are pending offline actions
  hasPendingActions(): boolean {
    return this.storage.getOfflineQueue().length > 0;
  }
  
  getPendingActionCount(): number {
    return this.storage.getOfflineQueue().length;
  }
}
