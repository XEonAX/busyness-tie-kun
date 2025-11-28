// API Service - REST client for backend communication
import { PlayerIndustry } from '../game/state';

const API_BASE = '/api';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PlayerStateResponse {
  playerId: string;
  displayName: string;
  currencies: {
    cash: number;
    gems: number;
    influence: number;
    energy: number;
  };
  prestige: {
    count: number;
    multiplier: number;
    empirePoints: number;
    unlockedPerks: string[];
  };
  daily: {
    lastLoginDate: string;
    streakCount: number;
    claimedDays: number[];
    lastSpinDate: string | null;
    spinPityCount: number;
  };
  industries: Array<{
    industryId: number;
    level: number;
    stability: number;
    lastCollectedAt: number;
    isUnlocked: boolean;
    pendingEarnings: number;
  }>;
  lastSyncAt: number;
}

export class ApiService {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });
      
      if (!response.ok) {
        console.error(`API error: ${response.status} ${response.statusText}`);
        return { success: false, error: `HTTP ${response.status}` };
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      return { success: false, error: String(error) };
    }
  }
  
  // Game State - Get or create player
  async getGameState(playerId: string): Promise<ApiResponse<PlayerStateResponse>> {
    return this.request<PlayerStateResponse>(`/game/state/${playerId}`);
  }
  
  // Sync state to server
  async syncState(playerId: string, state: {
    currencies: { cash: number };
    industries: PlayerIndustry[];
  }): Promise<ApiResponse<PlayerStateResponse>> {
    return this.request<PlayerStateResponse>(`/game/sync/${playerId}`, {
      method: 'POST',
      body: JSON.stringify({
        cash: state.currencies.cash,
        industries: state.industries.map(ind => ({
          industryId: ind.id,
          level: ind.level,
          stability: ind.stability,
          lastCollectedAt: ind.lastCollectedAt,
          isUnlocked: ind.isUnlocked
        }))
      }),
    });
  }
  
  // Get leaderboard
  async getLeaderboard(playerId?: string): Promise<ApiResponse<{
    entries: Array<{
      rank: number;
      playerId: string;
      displayName: string;
      totalLifetimeEarnings: number;
      prestigeCount: number;
    }>;
    playerRank?: number;
  }>> {
    const url = playerId 
      ? `/game/leaderboard?playerId=${playerId}` 
      : '/game/leaderboard';
    return this.request(url);
  }
  
  // Spin the wheel
  async spinWheel(playerId: string): Promise<ApiResponse<{
    rewardType: string;
    amount: number;
    nextSpinAvailable: number;
  }>> {
    return this.request(`/game/spin/${playerId}`, {
      method: 'POST',
    });
  }
  
  // Execute prestige
  async executePrestige(playerId: string, perksToPurchase: string[] = []): Promise<ApiResponse<PlayerStateResponse>> {
    return this.request<PlayerStateResponse>(`/game/prestige/${playerId}`, {
      method: 'POST',
      body: JSON.stringify({ perksToPurchase }),
    });
  }
}
