// Storage Service - localStorage wrapper with offline support
import { GameState } from '../game/state';

const STORAGE_KEYS = {
  PLAYER_ID: 'busyness_player_id',
  GAME_STATE: 'busyness_game_state',
  OFFLINE_QUEUE: 'busyness_offline_queue',
  SETTINGS: 'busyness_settings',
};

export interface OfflineAction {
  id: string;
  type: 'upgrade' | 'collect' | 'collectAll' | 'repair' | 'repairAll' | 'prestige' | 'unlock' | 'spin';
  payload: Record<string, unknown>;
  clientTimestamp: number;
  retryCount: number;
}

export interface Settings {
  soundEnabled: boolean;
  notificationsEnabled: boolean;
  reducedMotion: boolean;
  theme: 'dark' | 'light';
}

const DEFAULT_SETTINGS: Settings = {
  soundEnabled: true,
  notificationsEnabled: true,
  reducedMotion: false,
  theme: 'dark',
};

export class StorageService {
  // Player ID
  getPlayerId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.PLAYER_ID);
  }
  
  setPlayerId(id: string): void {
    localStorage.setItem(STORAGE_KEYS.PLAYER_ID, id);
  }
  
  // Game State
  loadGameState(): GameState | null {
    const json = localStorage.getItem(STORAGE_KEYS.GAME_STATE);
    if (!json) return null;
    
    try {
      return JSON.parse(json) as GameState;
    } catch (e) {
      console.error('Failed to parse game state:', e);
      return null;
    }
  }
  
  saveGameState(state: GameState): void {
    const json = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEYS.GAME_STATE, json);
  }
  
  // Offline Queue
  getOfflineQueue(): OfflineAction[] {
    const json = localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
    if (!json) return [];
    
    try {
      return JSON.parse(json) as OfflineAction[];
    } catch {
      return [];
    }
  }
  
  addToOfflineQueue(action: Omit<OfflineAction, 'id' | 'clientTimestamp' | 'retryCount'>): void {
    const queue = this.getOfflineQueue();
    queue.push({
      ...action,
      id: crypto.randomUUID(),
      clientTimestamp: Date.now(),
      retryCount: 0,
    });
    localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
  }
  
  clearOfflineQueue(): void {
    localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, '[]');
  }
  
  removeFromOfflineQueue(actionId: string): void {
    const queue = this.getOfflineQueue().filter(a => a.id !== actionId);
    localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
  }
  
  // Settings
  getSettings(): Settings {
    const json = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!json) return DEFAULT_SETTINGS;
    
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(json) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }
  
  saveSettings(settings: Partial<Settings>): void {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
  }
  
  // Clear all data
  clearAll(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }
}
