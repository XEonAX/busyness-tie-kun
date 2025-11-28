// Game Engine - Core game logic (client-side)
import { GameState, PlayerIndustry, getIndustryOutput, getUpgradeCost } from './state';
import { BALANCE } from './constants';

export class GameEngine {
  private state: GameState;
  private tickCount = 0;
  
  constructor(state: GameState) {
    this.state = state;
  }
  
  // Called every second
  tick(): void {
    this.tickCount++;
    
    // Accumulate earnings from all industries
    this.state.industries.forEach(industry => {
      if (industry.isUnlocked && industry.stability >= BALANCE.CRITICAL_THRESHOLD) {
        const outputPerSecond = getIndustryOutput(industry, this.state) / 3600;
        industry.pendingEarnings += outputPerSecond;
      }
    });
    
    // Energy regeneration (every minute)
    if (this.tickCount % 60 === 0) {
      const regenPerMinute = BALANCE.ENERGY_REGEN_PER_HOUR / 60;
      this.state.currencies.energy = Math.min(
        BALANCE.MAX_ENERGY,
        this.state.currencies.energy + regenPerMinute
      );
    }
    
    // Decay calculation (every minute while playing)
    if (this.tickCount % 60 === 0) {
      this.applyDecay(1 / 60); // 1 minute in hours
    }
    
    // Update playtime
    if (this.tickCount % 60 === 0) {
      this.state.totalPlaytimeMinutes++;
    }
  }
  
  // Calculate offline progress when returning
  calculateOfflineProgress(): void {
    const now = Date.now();
    const lastSeen = this.state.lastSeenAt;
    const offlineMs = now - lastSeen;
    const offlineHours = offlineMs / (1000 * 60 * 60);
    
    if (offlineHours < 0.01) return; // Less than 36 seconds, skip
    
    console.log(`⏰ Offline for ${offlineHours.toFixed(2)} hours`);
    
    // Cap offline time
    const cappedHours = Math.min(offlineHours, BALANCE.OFFLINE_CAP_HOURS);
    
    // Calculate earnings and decay
    let totalOfflineEarnings = 0;
    
    this.state.industries.forEach(industry => {
      if (!industry.isUnlocked) return;
      
      // Apply decay
      const decayHours = Math.min(offlineHours, BALANCE.DECAY_CAP_HOURS);
      this.applyDecayToIndustry(industry, decayHours);
      
      // Calculate earnings (with decayed stability)
      if (industry.stability >= BALANCE.CRITICAL_THRESHOLD) {
        const hourlyOutput = getIndustryOutput(industry, this.state);
        const earnings = hourlyOutput * cappedHours;
        totalOfflineEarnings += earnings;
        industry.pendingEarnings += earnings;
      }
    });
    
    // Update timestamps
    this.state.lastSeenAt = now;
    
    console.log(`💰 Offline earnings: $${totalOfflineEarnings.toFixed(0)}`);
  }
  
  private applyDecay(hours: number): void {
    this.state.industries.forEach(industry => {
      if (industry.isUnlocked) {
        this.applyDecayToIndustry(industry, hours);
      }
    });
  }
  
  private applyDecayToIndustry(industry: PlayerIndustry, hours: number): void {
    // Calculate decay rate based on time offline
    let decayRate = industry.definition.decayRatePerHour;
    
    // Accelerated decay (simplified for client)
    if (hours > 8) {
      decayRate = BALANCE.DECAY_ACCELERATE_8H;
    } else if (hours > 4) {
      decayRate = BALANCE.DECAY_ACCELERATE_4H;
    }
    
    // Apply prestige perks (decay resistance)
    // TODO: Check for decay resist perks
    
    const decay = decayRate * hours;
    industry.stability = Math.max(0, industry.stability - decay);
    industry.lastDecayCalculatedAt = Date.now();
  }
  
  // Actions
  collectEarnings(industryId: number): { success: boolean; amount: number } {
    const industry = this.state.industries.find(i => i.id === industryId);
    if (!industry || !industry.isUnlocked) {
      return { success: false, amount: 0 };
    }
    
    const amount = industry.pendingEarnings;
    if (amount <= 0) {
      return { success: false, amount: 0 };
    }
    
    industry.pendingEarnings = 0;
    industry.lastCollectedAt = Date.now();
    this.state.currencies.cash += amount;
    this.state.totalEarnings += amount;
    
    return { success: true, amount };
  }
  
  collectAllEarnings(): { success: boolean; totalAmount: number } {
    let totalAmount = 0;
    
    this.state.industries.forEach(industry => {
      if (industry.isUnlocked && industry.pendingEarnings > 0) {
        totalAmount += industry.pendingEarnings;
        industry.pendingEarnings = 0;
        industry.lastCollectedAt = Date.now();
      }
    });
    
    if (totalAmount > 0) {
      this.state.currencies.cash += totalAmount;
      this.state.totalEarnings += totalAmount;
    }
    
    return { success: totalAmount > 0, totalAmount };
  }
  
  upgradeIndustry(industryId: number): { success: boolean; newLevel: number; cost: number } {
    const industry = this.state.industries.find(i => i.id === industryId);
    if (!industry || !industry.isUnlocked) {
      return { success: false, newLevel: 0, cost: 0 };
    }
    
    const cost = getUpgradeCost(industry);
    if (this.state.currencies.cash < cost) {
      return { success: false, newLevel: industry.level, cost };
    }
    
    this.state.currencies.cash -= cost;
    industry.level++;
    
    return { success: true, newLevel: industry.level, cost };
  }
  
  repairIndustry(industryId: number): { success: boolean; newStability: number; cost: number } {
    const industry = this.state.industries.find(i => i.id === industryId);
    if (!industry || !industry.isUnlocked) {
      return { success: false, newStability: 0, cost: 0 };
    }
    
    const missingStability = 100 - industry.stability;
    if (missingStability <= 0) {
      return { success: false, newStability: 100, cost: 0 };
    }
    
    const cost = Math.floor(missingStability * BALANCE.REPAIR_COST_PER_PERCENT * industry.definition.tier);
    if (this.state.currencies.cash < cost) {
      return { success: false, newStability: industry.stability, cost };
    }
    
    this.state.currencies.cash -= cost;
    industry.stability = 100;
    industry.lastDecayCalculatedAt = Date.now();
    
    return { success: true, newStability: 100, cost };
  }
  
  bulkRepair(): { success: boolean; repairedCount: number; totalCost: number } {
    if (this.state.bulkRepairsUsedToday >= BALANCE.BULK_REPAIR_CAP) {
      return { success: false, repairedCount: 0, totalCost: 0 };
    }
    
    let repairedCount = 0;
    let totalCost = 0;
    
    this.state.industries.forEach(industry => {
      if (industry.isUnlocked && industry.stability < 100) {
        const missingStability = 100 - industry.stability;
        const cost = Math.floor(missingStability * BALANCE.REPAIR_COST_PER_PERCENT * industry.definition.tier);
        
        if (this.state.currencies.cash >= cost) {
          this.state.currencies.cash -= cost;
          industry.stability = 100;
          industry.lastDecayCalculatedAt = Date.now();
          repairedCount++;
          totalCost += cost;
        }
      }
    });
    
    if (repairedCount > 0) {
      this.state.bulkRepairsUsedToday++;
    }
    
    return { success: repairedCount > 0, repairedCount, totalCost };
  }
  
  unlockIndustry(industryId: number): { success: boolean } {
    const industry = this.state.industries.find(i => i.id === industryId);
    if (!industry || industry.isUnlocked) {
      return { success: false };
    }
    
    const cost = industry.definition.unlockCost;
    if (this.state.currencies.cash < cost) {
      return { success: false };
    }
    
    this.state.currencies.cash -= cost;
    industry.isUnlocked = true;
    industry.level = 1;
    industry.stability = 100;
    industry.lastCollectedAt = Date.now();
    industry.lastDecayCalculatedAt = Date.now();
    
    return { success: true };
  }
  
  // Prestige
  calculatePrestigeEP(): number {
    return Math.floor(Math.sqrt(this.state.totalEarnings / BALANCE.EP_BASE_DIVISOR));
  }
  
  executePrestige(): { success: boolean; epGained: number } {
    const epGained = this.calculatePrestigeEP();
    if (epGained <= 0) {
      return { success: false, epGained: 0 };
    }
    
    // Add EP
    this.state.prestige.empirePoints += epGained;
    this.state.prestige.count++;
    this.state.prestige.multiplier *= BALANCE.PRESTIGE_MULTIPLIER;
    
    // Reset progress
    this.state.currencies.cash = BALANCE.STARTING_CASH;
    this.state.totalEarnings = 0;
    
    this.state.industries.forEach((industry, index) => {
      industry.level = index === 0 ? 1 : 0;
      industry.stability = 100;
      industry.pendingEarnings = 0;
      industry.isUnlocked = index === 0;
      industry.lastCollectedAt = Date.now();
      industry.lastDecayCalculatedAt = Date.now();
    });
    
    return { success: true, epGained };
  }
  
  // State access
  getState(): GameState {
    return this.state;
  }
}
