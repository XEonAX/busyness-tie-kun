// Game State Management
import { BALANCE, INDUSTRIES, IndustryDefinition } from './constants';
import { StorageService } from '../services/storage';

export interface PlayerIndustry {
  id: number;
  definition: IndustryDefinition;
  level: number;
  stability: number;
  lastCollectedAt: number;
  lastDecayCalculatedAt: number;
  isUnlocked: boolean;
  pendingEarnings: number;
}

export interface Currencies {
  cash: number;
  gems: number;
  influence: number;
  energy: number;
}

export interface PrestigeState {
  count: number;
  multiplier: number;
  empirePoints: number;
  unlockedPerks: number[];
}

export interface DailyState {
  lastLoginDate: string;
  streakCount: number;
  claimedDays: number[];
  lastSpinDate: string | null;
  spinPityCount: number;
}

export interface GameState {
  playerId: string;
  displayName: string;
  createdAt: number;
  lastSeenAt: number;
  totalPlaytimeMinutes: number;
  totalEarnings: number;
  
  currencies: Currencies;
  industries: PlayerIndustry[];
  prestige: PrestigeState;
  daily: DailyState;
  
  // Runtime state
  isOnline: boolean;
  lastSyncAt: number;
  bulkRepairsUsedToday: number;
}

export async function initializeGameState(
  playerId: string,
  storage: StorageService
): Promise<GameState> {
  // Try to load existing state
  const savedState = storage.loadGameState();
  
  if (savedState && savedState.playerId === playerId) {
    console.log('📂 Loaded saved game state');
    // Hydrate industry definitions
    savedState.industries = savedState.industries.map(ind => ({
      ...ind,
      definition: INDUSTRIES.find(d => d.id === ind.id) || INDUSTRIES[0],
    }));
    return savedState;
  }
  
  // Create new state
  console.log('🆕 Creating new game state');
  const now = Date.now();
  const today = new Date().toISOString().split('T')[0];
  
  const newState: GameState = {
    playerId,
    displayName: `Tycoon${Math.floor(Math.random() * 10000)}`,
    createdAt: now,
    lastSeenAt: now,
    totalPlaytimeMinutes: 0,
    totalEarnings: 0,
    
    currencies: {
      cash: BALANCE.STARTING_CASH,
      gems: BALANCE.STARTING_GEMS,
      influence: 0,
      energy: BALANCE.STARTING_ENERGY,
    },
    
    industries: INDUSTRIES.map((def, index) => ({
      id: def.id,
      definition: def,
      level: index === 0 ? 1 : 0,
      stability: 100,
      lastCollectedAt: now,
      lastDecayCalculatedAt: now,
      isUnlocked: index === 0, // First industry unlocked
      pendingEarnings: 0,
    })),
    
    prestige: {
      count: 0,
      multiplier: 1.0,
      empirePoints: 0,
      unlockedPerks: [],
    },
    
    daily: {
      lastLoginDate: today,
      streakCount: 1,
      claimedDays: [],
      lastSpinDate: null,
      spinPityCount: 0,
    },
    
    isOnline: navigator.onLine,
    lastSyncAt: now,
    bulkRepairsUsedToday: 0,
  };
  
  // Save initial state
  storage.saveGameState(newState);
  
  return newState;
}

export function getIndustryOutput(industry: PlayerIndustry, state: GameState): number {
  if (!industry.isUnlocked || industry.level === 0) return 0;
  if (industry.stability < BALANCE.CRITICAL_THRESHOLD) return 0;
  
  const baseOutput = industry.definition.baseOutput;
  const levelMultiplier = Math.pow(BALANCE.OUTPUT_MULTIPLIER_PER_LEVEL, industry.level - 1);
  const stabilityMultiplier = industry.stability / 100;
  const prestigeMultiplier = state.prestige.multiplier;
  
  return baseOutput * levelMultiplier * stabilityMultiplier * prestigeMultiplier;
}

export function getUpgradeCost(industry: PlayerIndustry): number {
  const baseCost = industry.definition.baseCost;
  const level = industry.level;
  return Math.floor(baseCost * Math.pow(BALANCE.UPGRADE_COST_MULTIPLIER, level));
}

export function getNextIndustryToUnlock(state: GameState): PlayerIndustry | null {
  return state.industries.find(ind => !ind.isUnlocked) || null;
}
