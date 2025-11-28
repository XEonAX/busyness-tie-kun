// Industry Card Component
import { INDUSTRIES, DECAY_THRESHOLDS, BALANCE } from '../game/constants';
import { PlayerIndustry } from '../game/state';
import { formatNumber } from '../utils/format';

export interface IndustryCardOptions {
  industry: PlayerIndustry;
  playerCash: number;
  prestigeMultiplier?: number;
  onCollect: (industryId: number) => void;
  onUpgrade: (industryId: number) => void;
  onRepair: (industryId: number) => void;
}

export function getStabilityStatus(stability: number): string {
  if (stability >= DECAY_THRESHOLDS.RUNNING) return 'running';
  if (stability >= DECAY_THRESHOLDS.WEAR) return 'wear';
  if (stability >= DECAY_THRESHOLDS.WARNING) return 'warning';
  if (stability >= DECAY_THRESHOLDS.CRITICAL) return 'critical';
  return 'halted';
}

export function getStatusText(stability: number): string {
  const status = getStabilityStatus(stability);
  switch (status) {
    case 'running': return 'Running';
    case 'wear': return 'Wear';
    case 'warning': return 'Needs Repair!';
    case 'critical': return 'CRITICAL!';
    case 'halted': return 'Halted';
    default: return 'Unknown';
  }
}

export function calculateEarningsPerSecond(industry: PlayerIndustry, prestigeMultiplier: number = 1): number {
  const def = industry.definition;
  if (!def) return 0;
  
  // Match the logic from getIndustryOutput in state.ts
  if (industry.stability < DECAY_THRESHOLDS.CRITICAL) {
    return 0; // Halted below critical threshold
  }
  
  // Base output scaled by level
  const baseOutput = def.baseOutput;
  const levelMultiplier = Math.pow(BALANCE.OUTPUT_MULTIPLIER_PER_LEVEL, industry.level - 1);
  const stabilityMultiplier = industry.stability / 100;
  
  // Hourly output
  const hourlyOutput = baseOutput * levelMultiplier * stabilityMultiplier * prestigeMultiplier;
  
  // Convert to per-second (hourly / 3600)
  return hourlyOutput / 3600;
}

export function calculateUpgradeCost(industry: PlayerIndustry): number {
  const def = industry.definition;
  if (!def) return 0;
  return def.baseCost * Math.pow(BALANCE.UPGRADE_COST_MULTIPLIER, industry.level);
}

export function calculateRepairCost(industry: PlayerIndustry): number {
  const percentMissing = 100 - industry.stability;
  return Math.floor(percentMissing * BALANCE.REPAIR_COST_PER_PERCENT * (industry.definition?.tier || 1));
}

export function renderIndustryCard(options: IndustryCardOptions): string {
  const { industry, playerCash, prestigeMultiplier = 1 } = options;
  const def = industry.definition;
  if (!def) return '';

  const status = getStabilityStatus(industry.stability);
  const canCollect = industry.pendingEarnings > 0;
  const upgradeCost = calculateUpgradeCost(industry);
  const canUpgrade = playerCash >= upgradeCost;
  const repairCost = calculateRepairCost(industry);
  const needsRepair = industry.stability < 80;
  const earningsPerSecond = calculateEarningsPerSecond(industry, prestigeMultiplier);

  return `
    <div class="card industry-card mb-3" 
         data-industry="${industry.id}" 
         data-status="${status}">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <div class="d-flex align-items-center gap-2">
            <span class="industry-icon">${def.icon}</span>
            <div>
              <h5 class="mb-0">${def.name}</h5>
              <span class="industry-level">Lv. ${industry.level}</span>
            </div>
          </div>
          <span class="status-indicator">${getStatusText(industry.stability)}</span>
        </div>
        
        <div class="mb-2">
          <div class="d-flex justify-content-between mb-1">
            <small class="text-muted">Stability</small>
            <small>${Math.floor(industry.stability)}%</small>
          </div>
          <div class="stability-bar-container">
            <div class="stability-bar" style="width: ${industry.stability}%"></div>
          </div>
        </div>
        
        <div class="d-flex justify-content-between align-items-center mb-3">
          <div>
            <small class="text-muted">Earnings</small>
            <div class="pending-earnings">$${formatNumber(industry.pendingEarnings)}</div>
          </div>
          <div class="text-end">
            <small class="text-muted">Per second</small>
            <div>$${formatNumber(earningsPerSecond)}/s</div>
          </div>
        </div>
        
        <div class="btn-group w-100" role="group">
          <button type="button" 
                  class="btn btn-success btn-collect ${!canCollect ? 'disabled' : ''}"
                  data-action="collect"
                  ${!canCollect ? 'disabled' : ''}>
            💰 Collect
          </button>
          <button type="button" 
                  class="btn btn-primary btn-upgrade ${!canUpgrade ? 'disabled' : ''}"
                  data-action="upgrade"
                  ${!canUpgrade ? 'disabled' : ''}>
            ⬆️ $${formatNumber(upgradeCost)}
          </button>
          ${needsRepair ? `
            <button type="button" 
                    class="btn btn-warning btn-repair"
                    data-action="repair">
              🔧 $${formatNumber(repairCost)}
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

export function renderLockedIndustryCard(industryId: number, playerCash: number): string {
  const def = INDUSTRIES.find(i => i.id === industryId);
  if (!def) return '';

  const canUnlock = playerCash >= def.unlockCost;

  return `
    <div class="card industry-card-locked mb-3" data-industry="${industryId}">
      <div class="card-body text-center py-4">
        <div class="industry-icon mb-2 opacity-50">${def.icon}</div>
        <h5 class="mb-1 text-muted">${def.name}</h5>
        <p class="small text-muted mb-3">Unlock to start earning!</p>
        <button type="button" 
                class="btn btn-outline-primary btn-unlock ${!canUnlock ? 'disabled' : ''}"
                data-action="unlock"
                ${!canUnlock ? 'disabled' : ''}>
          🔓 Unlock - $${formatNumber(def.unlockCost)}
        </button>
      </div>
    </div>
  `;
}

// Bind event handlers to industry cards
export function bindIndustryCardEvents(
  container: HTMLElement,
  handlers: {
    onCollect: (industryId: number) => void;
    onUpgrade: (industryId: number) => void;
    onRepair: (industryId: number) => void;
    onUnlock: (industryId: number) => void;
  }
): void {
  // Collect buttons
  container.querySelectorAll<HTMLButtonElement>('.btn-collect:not([disabled])').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const card = btn.closest('.industry-card');
      const industryId = card?.getAttribute('data-industry');
      if (industryId) handlers.onCollect(parseInt(industryId, 10));
    });
  });

  // Upgrade buttons
  container.querySelectorAll<HTMLButtonElement>('.btn-upgrade:not([disabled])').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const card = btn.closest('.industry-card');
      const industryId = card?.getAttribute('data-industry');
      if (industryId) handlers.onUpgrade(parseInt(industryId, 10));
    });
  });

  // Repair buttons
  container.querySelectorAll<HTMLButtonElement>('.btn-repair').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const card = btn.closest('.industry-card');
      const industryId = card?.getAttribute('data-industry');
      if (industryId) handlers.onRepair(parseInt(industryId, 10));
    });
  });

  // Unlock buttons
  container.querySelectorAll<HTMLButtonElement>('.btn-unlock:not([disabled])').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const card = btn.closest('.industry-card-locked');
      const industryId = card?.getAttribute('data-industry');
      if (industryId) handlers.onUnlock(parseInt(industryId, 10));
    });
  });
}
