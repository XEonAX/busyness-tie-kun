// Decay status thresholds
export const DECAY_THRESHOLDS = {
  RUNNING: 80,    // 80-100%: Running normally
  WEAR: 50,       // 50-79%: Starting to wear
  WARNING: 30,    // 30-49%: Needs repair soon
  CRITICAL: 20,   // 20-29%: Critical, production halved
  HALTED: 0,      // 0-19%: No production
};

// Game Balance Constants
export const BALANCE = {
  // Decay
  DECAY_BASE_RATE: 5,           // % per hour
  DECAY_ACCELERATE_4H: 8,       // % per hour after 4h
  DECAY_ACCELERATE_8H: 12,      // % per hour after 8h
  DECAY_CAP_HOURS: 48,
  CRITICAL_THRESHOLD: 20,       // Below this = halted (no production)
  
  // Collection
  OFFLINE_CAP_HOURS: 8,
  BULK_REPAIR_CAP: 3,           // Free repairs per day
  REPAIR_COST_PER_PERCENT: 10,  // Cash cost per % restored
  
  // Prestige
  EP_BASE_DIVISOR: 1e6,         // EP = sqrt(totalEarnings / this)
  PRESTIGE_MULTIPLIER: 1.5,     // Earnings multiplier per prestige
  
  // Industries
  UPGRADE_COST_MULTIPLIER: 1.15,
  OUTPUT_MULTIPLIER_PER_LEVEL: 1.1,
  ENDOWED_PROGRESS: 0.75,       // New tiers start 75% filled
  
  // Currencies
  STARTING_CASH: 0,
  STARTING_GEMS: 50,            // Enough to taste, not enough to satisfy
  STARTING_ENERGY: 100,
  ENERGY_REGEN_PER_HOUR: 25,
  MAX_ENERGY: 100,
  
  // Wheel
  WHEEL_WEIGHTS: {
    common: 60,
    uncommon: 25,
    rare: 12,
    epic: 2.5,
    legendary: 0.5,
  } as Record<string, number>,
  PITY_THRESHOLD: 7,            // Guaranteed uncommon after X commons
  
  // Tick rate
  TICK_INTERVAL_MS: 1000,
  AUTO_SAVE_INTERVAL_MS: 30000,
};

// Industry definitions
export interface IndustryDefinition {
  id: number;
  name: string;
  tier: number;
  baseCost: number;
  baseOutput: number;
  unlockCost: number;
  decayRatePerHour: number;
  icon: string;
}

export const INDUSTRIES: IndustryDefinition[] = [
  {
    id: 1,
    name: 'Lemonade Stand',
    tier: 1,
    baseCost: 10,
    baseOutput: 3600,      // $3600/hour = $1/sec → upgrade ($10) in ~10 secs
    unlockCost: 0,
    decayRatePerHour: 5,
    icon: '🍋',
  },
  {
    id: 2,
    name: 'Food Truck',
    tier: 2,
    baseCost: 100,
    baseOutput: 36000,     // $10/sec
    unlockCost: 100,
    decayRatePerHour: 5,
    icon: '🚚',
  },
  {
    id: 3,
    name: 'Coffee Shop',
    tier: 3,
    baseCost: 1000,
    baseOutput: 360000,    // $100/sec
    unlockCost: 1000,
    decayRatePerHour: 5,
    icon: '☕',
  },
  {
    id: 4,
    name: 'Boutique Store',
    tier: 4,
    baseCost: 10000,
    baseOutput: 3600000,   // $1K/sec
    unlockCost: 10000,
    decayRatePerHour: 5,
    icon: '🏪',
  },
  {
    id: 5,
    name: 'Restaurant Chain',
    tier: 5,
    baseCost: 100000,
    baseOutput: 36000000,  // $10K/sec
    unlockCost: 100000,
    decayRatePerHour: 5,
    icon: '🍽️',
  },
];

// Prestige perks
export interface PerkDefinition {
  id: number;
  name: string;
  description: string;
  branch: 'efficiency' | 'core' | 'resilience';
  cost: number;
  effect: {
    type: string;
    value: number;
  };
  prerequisiteId: number | null;
}

export const PERKS: PerkDefinition[] = [
  // Efficiency Branch
  { id: 1, name: 'Auto-Collect I', description: 'Collect 10% of earnings automatically', branch: 'efficiency', cost: 1, effect: { type: 'auto_collect', value: 0.1 }, prerequisiteId: null },
  { id: 2, name: 'Auto-Collect II', description: 'Collect 25% of earnings automatically', branch: 'efficiency', cost: 3, effect: { type: 'auto_collect', value: 0.25 }, prerequisiteId: 1 },
  { id: 3, name: 'Offline Earnings I', description: '+25% offline earnings', branch: 'efficiency', cost: 2, effect: { type: 'offline_bonus', value: 0.25 }, prerequisiteId: 1 },
  
  // Core Branch
  { id: 10, name: 'Boost Duration I', description: '+30% boost duration', branch: 'core', cost: 1, effect: { type: 'boost_duration', value: 0.3 }, prerequisiteId: null },
  { id: 11, name: 'Crit Chance I', description: '+5% critical hit chance', branch: 'core', cost: 2, effect: { type: 'crit_chance', value: 0.05 }, prerequisiteId: 10 },
  { id: 12, name: 'Crit Multiplier I', description: '+50% critical hit multiplier', branch: 'core', cost: 3, effect: { type: 'crit_multi', value: 0.5 }, prerequisiteId: 11 },
  
  // Resilience Branch
  { id: 20, name: 'Decay Resist I', description: '-10% decay rate', branch: 'resilience', cost: 1, effect: { type: 'decay_resist', value: 0.1 }, prerequisiteId: null },
  { id: 21, name: 'Decay Resist II', description: '-25% decay rate', branch: 'resilience', cost: 3, effect: { type: 'decay_resist', value: 0.25 }, prerequisiteId: 20 },
  { id: 22, name: 'Shield Duration I', description: '+50% immunity window duration', branch: 'resilience', cost: 2, effect: { type: 'shield_duration', value: 0.5 }, prerequisiteId: 20 },
];

// Wheel rewards
export interface WheelReward {
  tier: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  type: 'cash' | 'gems' | 'energy' | 'boost';
  multiplier: number;
  label: string;
}

export const WHEEL_REWARDS: WheelReward[] = [
  { tier: 'common', type: 'cash', multiplier: 100, label: '$100' },
  { tier: 'common', type: 'cash', multiplier: 250, label: '$250' },
  { tier: 'common', type: 'energy', multiplier: 10, label: '+10 Energy' },
  { tier: 'uncommon', type: 'cash', multiplier: 1000, label: '$1K' },
  { tier: 'uncommon', type: 'gems', multiplier: 5, label: '+5 Gems' },
  { tier: 'rare', type: 'cash', multiplier: 5000, label: '$5K' },
  { tier: 'rare', type: 'gems', multiplier: 20, label: '+20 Gems' },
  { tier: 'epic', type: 'gems', multiplier: 100, label: '+100 Gems' },
  { tier: 'legendary', type: 'gems', multiplier: 500, label: '💎 JACKPOT!' },
];

// Daily rewards
export const DAILY_REWARDS = [
  { day: 1, type: 'cash', amount: 100, label: '$100' },
  { day: 2, type: 'cash', amount: 250, label: '$250' },
  { day: 3, type: 'gems', amount: 10, label: '10 Gems' },
  { day: 4, type: 'cash', amount: 500, label: '$500' },
  { day: 5, type: 'energy', amount: 50, label: '50 Energy' },
  { day: 6, type: 'gems', amount: 25, label: '25 Gems' },
  { day: 7, type: 'gems', amount: 100, label: '💎 100 Gems!' },
];

// Shop items (mock)
export const SHOP_ITEMS = [
  { id: 'starter_pack', name: 'Starter Pack', description: '500 Gems + 24h Manager + Badge', priceUsd: 0.99, category: 'bundle' },
  { id: 'booster_pack', name: 'Booster Pack', description: '1500 Gems + 3-Day Manager', priceUsd: 4.99, category: 'bundle' },
  { id: 'empire_pack', name: 'Empire Pack', description: '5000 Gems + 7-Day Manager + EP Boost', priceUsd: 9.99, category: 'bundle' },
  { id: 'gems_100', name: '100 Gems', description: '', priceUsd: 0.99, category: 'currency' },
  { id: 'gems_500', name: '500 Gems', description: '+50 Bonus', priceUsd: 4.99, category: 'currency' },
  { id: 'gems_1200', name: '1200 Gems', description: '+200 Bonus', priceUsd: 9.99, category: 'currency' },
];
