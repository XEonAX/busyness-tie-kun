// Home Page - Main Game Dashboard
import { GameState } from '../game/state';
import { GameEngine } from '../game/engine';
import { StorageService } from '../services/storage';
import { SyncManager } from '../game/sync';
import { BALANCE } from '../game/constants';
import { formatNumber } from '../utils/format';
import { 
  renderIndustryCard, 
  renderLockedIndustryCard, 
  bindIndustryCardEvents 
} from '../components/industry-card';

export interface AppContext {
  state: GameState;
  engine: GameEngine;
  storage: StorageService;
  sync: SyncManager;
}

let context: AppContext | null = null;
let tickInterval: number | null = null;

// Main render function
export function renderApp(appContext: AppContext): void {
  context = appContext;
  
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <!-- Currency Bar -->
    <div class="currency-bar">
      <div class="container-xl">
        <div class="row align-items-center">
          <div class="col">
            <div class="d-flex gap-4 justify-content-center justify-content-sm-start">
              <div class="currency-item currency-cash">
                <span class="currency-icon">💰</span>
                <span class="currency-value" id="currency-cash">$${formatNumber(context.state.currencies.cash)}</span>
              </div>
              <div class="currency-item currency-gems">
                <span class="currency-icon">💎</span>
                <span class="currency-value" id="currency-gems">${formatNumber(context.state.currencies.gems)}</span>
              </div>
              <div class="currency-item currency-energy">
                <span class="currency-icon">⚡</span>
                <span class="currency-value" id="currency-energy">${context.state.currencies.energy}/${BALANCE.MAX_ENERGY}</span>
              </div>
            </div>
          </div>
          <div class="col-auto d-none d-sm-block">
            <span class="text-muted small" id="sync-status">
              ${context.state.isOnline ? '🟢 Online' : '🔴 Offline'}
            </span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Main Content -->
    <div class="page-content">
      <div class="container-xl py-3">
        <!-- Stats Row -->
        <div class="row g-2 mb-3">
          <div class="col-6 col-md-3">
            <div class="card">
              <div class="card-body p-2 text-center">
                <div class="text-muted small">Prestige</div>
                <div class="h5 mb-0">×${context.state.prestige.multiplier.toFixed(1)}</div>
              </div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="card">
              <div class="card-body p-2 text-center">
                <div class="text-muted small">Empire Points</div>
                <div class="h5 mb-0">${formatNumber(context.state.prestige.empirePoints)}</div>
              </div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="card">
              <div class="card-body p-2 text-center">
                <div class="text-muted small">Total Earned</div>
                <div class="h5 mb-0">$${formatNumber(context.state.totalEarnings)}</div>
              </div>
            </div>
          </div>
          <div class="col-6 col-md-3">
            <div class="card">
              <div class="card-body p-2 text-center">
                <div class="text-muted small">Streak</div>
                <div class="h5 mb-0">🔥 ${context.state.daily.streakCount} days</div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Industries Grid -->
        <h5 class="mb-3">Your Businesses</h5>
        <div class="row g-3" id="industries-container">
          ${renderIndustriesHTML()}
        </div>
        
        <!-- Quick Actions -->
        <div class="mt-4">
          <div class="d-flex gap-2 flex-wrap">
            <button class="btn btn-outline-success" id="btn-collect-all">
              💰 Collect All
            </button>
            <button class="btn btn-outline-warning" id="btn-repair-all"
                    ${context.state.bulkRepairsUsedToday >= BALANCE.BULK_REPAIR_CAP ? 'disabled' : ''}>
              🔧 Repair All (${BALANCE.BULK_REPAIR_CAP - context.state.bulkRepairsUsedToday} free left)
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Bottom Navigation -->
    <nav class="bottom-nav">
      <ul class="nav">
        <li class="nav-item">
          <a class="nav-link active" href="#" data-page="home">
            <span class="nav-icon">🏠</span>
            <span>Home</span>
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="#" data-page="prestige">
            <span class="nav-icon">⭐</span>
            <span>Prestige</span>
            ${context.state.prestige.empirePoints > 0 ? '<span class="badge-dot"></span>' : ''}
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="#" data-page="wheel">
            <span class="nav-icon">🎰</span>
            <span>Wheel</span>
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="#" data-page="shop">
            <span class="nav-icon">🛒</span>
            <span>Shop</span>
          </a>
        </li>
        <li class="nav-item">
          <a class="nav-link" href="#" data-page="leaderboard">
            <span class="nav-icon">🏆</span>
            <span>Ranks</span>
          </a>
        </li>
      </ul>
    </nav>
    
    <!-- Toast Container -->
    <div class="toast-container"></div>
  `;

  // Bind event handlers
  bindEventHandlers();
  
  // Start game loop
  startGameLoop();
}

function renderIndustriesHTML(): string {
  if (!context) return '';
  
  let html = '';
  
  for (const industry of context.state.industries) {
    if (industry.isUnlocked && industry.level > 0) {
      html += `<div class="col-12 col-md-6 col-lg-4">${renderIndustryCard({
        industry,
        playerCash: context.state.currencies.cash,
        prestigeMultiplier: context.state.prestige.multiplier,
        onCollect: handleCollect,
        onUpgrade: handleUpgrade,
        onRepair: handleRepair,
      })}</div>`;
    } else {
      html += `<div class="col-12 col-md-6 col-lg-4">${renderLockedIndustryCard(
        industry.id,
        context.state.currencies.cash
      )}</div>`;
    }
  }
  
  return html;
}

function bindEventHandlers(): void {
  if (!context) return;
  
  const container = document.getElementById('industries-container');
  if (container) {
    bindIndustryCardEvents(container, {
      onCollect: handleCollect,
      onUpgrade: handleUpgrade,
      onRepair: handleRepair,
      onUnlock: handleUnlock,
    });
  }
  
  // Collect all
  document.getElementById('btn-collect-all')?.addEventListener('click', handleCollectAll);
  
  // Repair all
  document.getElementById('btn-repair-all')?.addEventListener('click', handleRepairAll);
  
  // Bottom navigation
  document.querySelectorAll('.bottom-nav .nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = (e.currentTarget as HTMLElement).getAttribute('data-page');
      navigateTo(page || 'home');
    });
  });
}

function handleCollect(industryId: number): void {
  if (!context) return;
  
  const industry = context.state.industries.find(i => i.id === industryId);
  if (!industry) return;
  
  const earnings = industry.pendingEarnings;
  if (earnings <= 0) return;
  
  // Collect
  context.state.currencies.cash += earnings;
  context.state.totalEarnings += earnings;
  industry.pendingEarnings = 0;
  industry.lastCollectedAt = Date.now();
  
  // Show floating number
  showFloatingNumber(earnings);
  
  // Queue for sync
  context.sync.queueAction('collect', { industryId });
  
  // Update UI
  updateUI();
}

function handleCollectAll(): void {
  if (!context) return;
  
  let totalCollected = 0;
  
  for (const industry of context.state.industries) {
    if (industry.isUnlocked && industry.pendingEarnings > 0) {
      totalCollected += industry.pendingEarnings;
      context.state.currencies.cash += industry.pendingEarnings;
      context.state.totalEarnings += industry.pendingEarnings;
      industry.pendingEarnings = 0;
      industry.lastCollectedAt = Date.now();
    }
  }
  
  if (totalCollected > 0) {
    showFloatingNumber(totalCollected, true);
    showToast(`Collected $${formatNumber(totalCollected)}!`, 'success');
    
    context.sync.queueAction('collectAll', {});
    
    updateUI();
  }
}

function handleUpgrade(industryId: number): void {
  if (!context) return;
  
  const result = context.engine.upgradeIndustry(industryId);
  if (result) {
    context.sync.queueAction('upgrade', { industryId });
    
    showToast(`Upgraded to level ${result.newLevel}!`, 'success');
    updateUI();
  }
}

function handleRepair(industryId: number): void {
  if (!context) return;
  
  const result = context.engine.repairIndustry(industryId);
  if (result) {
    context.sync.queueAction('repair', { industryId });
    
    showToast('Industry repaired!', 'success');
    updateUI();
  }
}

function handleRepairAll(): void {
  if (!context) return;
  
  if (context.state.bulkRepairsUsedToday >= BALANCE.BULK_REPAIR_CAP) {
    showToast('No free repairs left today!', 'warning');
    return;
  }
  
  let repaired = 0;
  for (const industry of context.state.industries) {
    if (industry.isUnlocked && industry.stability < 80) {
      industry.stability = 100;
      repaired++;
    }
  }
  
  if (repaired > 0) {
    context.state.bulkRepairsUsedToday++;
    
    context.sync.queueAction('repairAll', {});
    
    showToast(`Repaired ${repaired} businesses!`, 'success');
    updateUI();
  }
}

function handleUnlock(industryId: number): void {
  if (!context) return;
  
  const result = context.engine.unlockIndustry(industryId);
  if (result) {
    context.sync.queueAction('unlock', { industryId });
    
    showToast('New business unlocked!', 'success');
    updateUI();
  }
}

function navigateTo(page: string): void {
  // Update nav active state
  document.querySelectorAll('.bottom-nav .nav-link').forEach(link => {
    link.classList.toggle('active', link.getAttribute('data-page') === page);
  });
  
  // For MVP, just show a toast for other pages
  if (page !== 'home') {
    showToast(`${page.charAt(0).toUpperCase() + page.slice(1)} coming soon!`, 'info');
  }
}

function startGameLoop(): void {
  if (tickInterval) {
    clearInterval(tickInterval);
  }
  
  tickInterval = window.setInterval(() => {
    if (!context) return;
    
    // Run game tick
    context.engine.tick();
    
    // Update UI
    updateCurrencies();
    updateIndustries();
    
    // Auto-save
    context.storage.saveGameState(context.state);
  }, BALANCE.TICK_INTERVAL_MS);
}

function updateUI(): void {
  updateCurrencies();
  updateIndustries();
  
  // Save state
  if (context) {
    context.storage.saveGameState(context.state);
  }
}

function updateCurrencies(): void {
  if (!context) return;
  
  const cashEl = document.getElementById('currency-cash');
  if (cashEl) cashEl.textContent = `$${formatNumber(context.state.currencies.cash)}`;
  
  const gemsEl = document.getElementById('currency-gems');
  if (gemsEl) gemsEl.textContent = formatNumber(context.state.currencies.gems);
  
  const energyEl = document.getElementById('currency-energy');
  if (energyEl) energyEl.textContent = `${context.state.currencies.energy}/${BALANCE.MAX_ENERGY}`;
}

function updateIndustries(): void {
  if (!context) return;
  
  const container = document.getElementById('industries-container');
  if (!container) return;
  
  container.innerHTML = renderIndustriesHTML();
  
  bindIndustryCardEvents(container, {
    onCollect: handleCollect,
    onUpgrade: handleUpgrade,
    onRepair: handleRepair,
    onUnlock: handleUnlock,
  });
}

function showFloatingNumber(amount: number, isCrit: boolean = false): void {
  const el = document.createElement('div');
  el.className = `floating-number ${isCrit ? 'floating-number-crit' : ''}`;
  el.textContent = `+$${formatNumber(amount)}`;
  
  // Position near center of screen
  el.style.left = `${50 + (Math.random() - 0.5) * 20}%`;
  el.style.top = '40%';
  
  document.body.appendChild(el);
  
  setTimeout(() => el.remove(), 1500);
}

function showToast(message: string, type: 'success' | 'warning' | 'info' | 'error' = 'info'): void {
  const container = document.querySelector('.toast-container');
  if (!container) return;
  
  const bgClass = {
    success: 'bg-success',
    warning: 'bg-warning',
    info: 'bg-info',
    error: 'bg-danger',
  }[type];
  
  const toast = document.createElement('div');
  toast.className = `toast show ${bgClass} text-white`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <div class="toast-body d-flex justify-content-between align-items-center">
      ${message}
      <button type="button" class="btn-close btn-close-white ms-2" data-bs-dismiss="toast"></button>
    </div>
  `;
  
  container.appendChild(toast);
  
  // Auto dismiss
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
  
  // Manual dismiss
  toast.querySelector('.btn-close')?.addEventListener('click', () => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  });
}

// Export for cleanup
export function destroyApp(): void {
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
  context = null;
}
