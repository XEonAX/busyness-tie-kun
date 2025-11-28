## Plan: Busyness Tycoon — Full-Stack Implementation

Build a complete Phase 1 MVP with Tabler UI, .NET Core backend, SQLite persistence, and offline-first PWA architecture. Full E2E testing via Playwright.

### Decisions Made
- **MVP Scope:** Full Phase 1 (5 industries, decay, prestige, leaderboard, shop)
- **Auth:** Deferred (anonymous play with device fingerprint + localStorage UUID)
- **Real-Time:** Minimal SignalR usage, polling fallback acceptable
- **Payments:** Mocked shop/IAP for MVP
- **Deployment:** Local dev → SSH upload to remote compute
- **PWA/Offline:** Core requirement from day 1
- **Admin Panel:** Yes, included
- **Testing:** E2E via Playwright

---

### Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vite + TypeScript + Tabler (Bootstrap) + jQuery |
| Backend | .NET 8 Web API + SignalR |
| Database | SQLite + Dapper |
| Migrations | FluentMigrator |
| Testing | Playwright E2E |
| PWA | Service Worker + Web App Manifest |

---

### Project Structure

```
busyness-tie-kun/
├── frontend/
│   ├── src/
│   │   ├── main.ts                 # Entry point
│   │   ├── game/
│   │   │   ├── state.ts            # Game state management
│   │   │   ├── engine.ts           # Client-side game logic
│   │   │   ├── sync.ts             # Offline queue + server sync
│   │   │   └── constants.ts        # Game balance values
│   │   ├── pages/
│   │   │   ├── home.ts             # Industry dashboard
│   │   │   ├── shop.ts             # Mock IAP store
│   │   │   ├── boosts.ts           # Managers, multipliers
│   │   │   ├── prestige.ts         # Perk tree
│   │   │   ├── events.ts           # Daily wheel
│   │   │   └── admin/
│   │   │       ├── index.ts        # Admin dashboard
│   │   │       ├── events.ts       # Event management
│   │   │       ├── players.ts      # Player lookup
│   │   │       └── config.ts       # Game config editor
│   │   ├── components/
│   │   │   ├── industry-card.ts    # Industry UI card
│   │   │   ├── currency-bar.ts     # Top currency display
│   │   │   ├── nav-tabs.ts         # Bottom navigation
│   │   │   ├── wheel.ts            # Spin wheel component
│   │   │   ├── perk-tree.ts        # Prestige perk tree
│   │   │   └── animations.ts       # Number pops, confetti
│   │   ├── services/
│   │   │   ├── api.ts              # REST client
│   │   │   ├── signalr.ts          # Real-time connection
│   │   │   └── storage.ts          # localStorage wrapper
│   │   └── styles/
│   │       └── custom.scss         # Tabler overrides
│   ├── public/
│   │   ├── manifest.json           # PWA manifest
│   │   ├── sw.js                   # Service worker
│   │   └── icons/                  # App icons
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
├── backend/
│   ├── Controllers/
│   │   ├── GameController.cs       # State sync, actions
│   │   ├── ShopController.cs       # Mock purchases
│   │   ├── LeaderboardController.cs
│   │   ├── EventsController.cs     # Wheel, daily rewards
│   │   └── AdminController.cs      # Admin endpoints
│   ├── Hubs/
│   │   └── GameHub.cs              # SignalR hub
│   ├── Services/
│   │   ├── GameEngine/
│   │   │   ├── DecayCalculator.cs
│   │   │   ├── OfflineEarningsResolver.cs
│   │   │   ├── PrestigeCalculator.cs
│   │   │   ├── WheelSpinner.cs
│   │   │   └── CurrencyService.cs
│   │   ├── PlayerService.cs
│   │   └── LeaderboardService.cs
│   ├── Repositories/
│   │   ├── PlayerRepository.cs
│   │   ├── IndustryRepository.cs
│   │   └── EventRepository.cs
│   ├── Migrations/
│   │   ├── M001_InitialSchema.cs
│   │   ├── M002_Industries.cs
│   │   ├── M003_Currencies.cs
│   │   ├── M004_Prestige.cs
│   │   ├── M005_Events.cs
│   │   └── M006_Shop.cs
│   ├── Models/
│   │   ├── Player.cs
│   │   ├── Industry.cs
│   │   ├── PlayerIndustry.cs
│   │   ├── Currency.cs
│   │   ├── PrestigePerk.cs
│   │   ├── DailyReward.cs
│   │   ├── WheelSpin.cs
│   │   ├── ShopItem.cs
│   │   └── LeaderboardEntry.cs
│   ├── DTOs/
│   │   ├── GameStateDto.cs
│   │   ├── ActionRequestDto.cs
│   │   └── SyncRequestDto.cs
│   ├── Program.cs
│   ├── appsettings.json
│   └── BusynessTycoon.csproj
├── e2e/
│   ├── tests/
│   │   ├── first-session.spec.ts   # Tutorial flow
│   │   ├── decay.spec.ts           # Decay simulation
│   │   ├── prestige.spec.ts        # Prestige cycle
│   │   ├── offline-sync.spec.ts    # Offline/online sync
│   │   ├── wheel.spec.ts           # Spin verification
│   │   └── admin.spec.ts           # Admin panel
│   ├── playwright.config.ts
│   └── package.json
├── scripts/
│   ├── deploy.sh                   # SSH upload script
│   └── seed-data.sql               # Initial game data
├── GDD.md
└── README.md
```

---

### Database Schema

```sql
-- Players (anonymous with device fingerprint)
CREATE TABLE Players (
    Id TEXT PRIMARY KEY,           -- UUID from client
    DeviceFingerprint TEXT,
    DisplayName TEXT,
    CreatedAt TEXT NOT NULL,
    LastSeenAt TEXT NOT NULL,
    PrestigeCount INTEGER DEFAULT 0,
    PrestigeMultiplier REAL DEFAULT 1.0,
    TotalPlaytimeMinutes INTEGER DEFAULT 0
);

-- Currencies
CREATE TABLE PlayerCurrencies (
    PlayerId TEXT NOT NULL,
    CurrencyType TEXT NOT NULL,    -- Cash, Gems, Influence, Energy
    Amount REAL NOT NULL DEFAULT 0,
    PRIMARY KEY (PlayerId, CurrencyType),
    FOREIGN KEY (PlayerId) REFERENCES Players(Id)
);

-- Industry Definitions (static)
CREATE TABLE Industries (
    Id INTEGER PRIMARY KEY,
    Name TEXT NOT NULL,
    Tier INTEGER NOT NULL,
    BaseCost REAL NOT NULL,
    BaseOutput REAL NOT NULL,
    UnlockCost REAL NOT NULL,
    DecayRatePerHour REAL NOT NULL DEFAULT 5.0
);

-- Player Industry State
CREATE TABLE PlayerIndustries (
    PlayerId TEXT NOT NULL,
    IndustryId INTEGER NOT NULL,
    Level INTEGER DEFAULT 1,
    Stability REAL DEFAULT 100.0,   -- 0-100%
    LastCollectedAt TEXT,
    LastDecayCalculatedAt TEXT,
    IsUnlocked INTEGER DEFAULT 0,
    PRIMARY KEY (PlayerId, IndustryId),
    FOREIGN KEY (PlayerId) REFERENCES Players(Id),
    FOREIGN KEY (IndustryId) REFERENCES Industries(Id)
);

-- Prestige Perks (static)
CREATE TABLE PrestigePerks (
    Id INTEGER PRIMARY KEY,
    Name TEXT NOT NULL,
    Description TEXT,
    Branch TEXT NOT NULL,           -- Efficiency, Core, Resilience
    Cost INTEGER NOT NULL,          -- EP cost
    Effect TEXT NOT NULL,           -- JSON: {"type":"decay_resist","value":0.1}
    PrerequisitePerkId INTEGER
);

-- Player Unlocked Perks
CREATE TABLE PlayerPerks (
    PlayerId TEXT NOT NULL,
    PerkId INTEGER NOT NULL,
    UnlockedAt TEXT NOT NULL,
    PRIMARY KEY (PlayerId, PerkId)
);

-- Daily Rewards
CREATE TABLE PlayerDailyRewards (
    PlayerId TEXT NOT NULL,
    Day INTEGER NOT NULL,           -- 1-7
    ClaimedAt TEXT,
    PRIMARY KEY (PlayerId, Day)
);

-- Wheel Spins
CREATE TABLE PlayerSpins (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    PlayerId TEXT NOT NULL,
    SpinType TEXT NOT NULL,         -- Daily, Premium
    Result TEXT NOT NULL,           -- JSON reward
    SpunAt TEXT NOT NULL,
    FOREIGN KEY (PlayerId) REFERENCES Players(Id)
);

-- Leaderboard (materialized for performance)
CREATE TABLE Leaderboard (
    PlayerId TEXT PRIMARY KEY,
    DisplayName TEXT,
    TotalEarnings REAL NOT NULL,
    PrestigeCount INTEGER NOT NULL,
    Rank INTEGER,
    UpdatedAt TEXT NOT NULL
);

-- Shop Items (static)
CREATE TABLE ShopItems (
    Id TEXT PRIMARY KEY,
    Name TEXT NOT NULL,
    Description TEXT,
    Category TEXT NOT NULL,         -- Bundle, Boost, Currency
    PriceUsd REAL,
    PriceGems INTEGER,
    Contents TEXT NOT NULL,         -- JSON
    IsActive INTEGER DEFAULT 1
);

-- Transactions (mock purchases)
CREATE TABLE Transactions (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    PlayerId TEXT NOT NULL,
    ShopItemId TEXT NOT NULL,
    PurchasedAt TEXT NOT NULL,
    FOREIGN KEY (PlayerId) REFERENCES Players(Id)
);

-- Game Events (admin-managed)
CREATE TABLE GameEvents (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    Name TEXT NOT NULL,
    Type TEXT NOT NULL,             -- FlashSale, DoubleXP, WeekendBonus
    Config TEXT NOT NULL,           -- JSON
    StartsAt TEXT NOT NULL,
    EndsAt TEXT NOT NULL,
    IsActive INTEGER DEFAULT 1
);

-- Offline Action Queue (for sync)
CREATE TABLE OfflineActions (
    Id INTEGER PRIMARY KEY AUTOINCREMENT,
    PlayerId TEXT NOT NULL,
    ActionType TEXT NOT NULL,
    ActionData TEXT NOT NULL,       -- JSON
    ClientTimestamp TEXT NOT NULL,
    ProcessedAt TEXT
);
```

---

### API Endpoints

#### Game State
```
GET  /api/game/state              # Full game state for player
POST /api/game/sync               # Sync offline actions
POST /api/game/action             # Execute action (upgrade, collect, repair)
```

#### Industries
```
POST /api/industries/unlock       # Unlock new industry
POST /api/industries/upgrade      # Level up industry
POST /api/industries/collect      # Collect earnings
POST /api/industries/repair       # Restore stability
POST /api/industries/bulk-repair  # Repair all (capped)
```

#### Prestige
```
GET  /api/prestige/preview        # EP gain preview
POST /api/prestige/execute        # Perform prestige
POST /api/prestige/unlock-perk    # Unlock perk node
```

#### Events
```
GET  /api/events/active           # Current events
GET  /api/events/daily-reward     # Daily reward status
POST /api/events/claim-daily      # Claim daily reward
POST /api/events/spin             # Spin the wheel
```

#### Shop
```
GET  /api/shop/items              # Available items
POST /api/shop/purchase           # Mock purchase
```

#### Leaderboard
```
GET  /api/leaderboard             # Top players
GET  /api/leaderboard/rank/{id}   # Player rank
```

#### Admin
```
GET  /api/admin/players           # Player list
GET  /api/admin/player/{id}       # Player details
POST /api/admin/grant-currency    # Grant currency
GET  /api/admin/events            # All events
POST /api/admin/events            # Create event
PUT  /api/admin/events/{id}       # Update event
GET  /api/admin/config            # Game config
PUT  /api/admin/config            # Update config
```

---

### SignalR Hub

```csharp
public class GameHub : Hub
{
    // Client → Server
    Task SyncState(SyncRequestDto request);
    
    // Server → Client
    Task ReceiveEvent(GameEventDto evt);      // Flash sales, global modifiers
    Task ReceiveWheelResult(WheelResultDto result);
    Task ForceRefresh();                       // Admin triggered
}
```

---

### Implementation Phases

#### Phase 1A: Foundation (Week 1)
- [ ] Project scaffolding (Vite + .NET)
- [ ] FluentMigrator setup + initial schema
- [ ] Basic Tabler layout shell
- [ ] Player creation (anonymous UUID)
- [ ] Industry definitions seeded

#### Phase 1B: Core Loop (Week 2)
- [ ] Industry cards with Tabler
- [ ] Upgrade/collect/repair actions
- [ ] Decay calculation (client + server)
- [ ] Currency display + transactions
- [ ] localStorage state persistence

#### Phase 1C: Offline PWA (Week 3)
- [ ] Service Worker registration
- [ ] Offline action queue
- [ ] Sync on reconnect
- [ ] PWA manifest + install prompt
- [ ] Background sync API

#### Phase 1D: Progression (Week 4)
- [ ] Prestige system + EP calculation
- [ ] Perk tree UI (3 branches)
- [ ] Leaderboard display
- [ ] Daily rewards calendar
- [ ] Daily spin wheel

#### Phase 1E: Polish (Week 5)
- [ ] Number animations (jQuery)
- [ ] Red dot badge system
- [ ] Sound effects (optional)
- [ ] Mock shop with bundles
- [ ] Admin panel basics

#### Phase 1F: Testing & Deploy (Week 6)
- [ ] Playwright E2E test suite
- [ ] Performance optimization
- [ ] Deploy script (SSH)
- [ ] Production config
- [ ] Documentation

---

### Offline Sync Strategy

**Approach:** Queue-based merge with server timestamp validation

```typescript
interface OfflineAction {
  id: string;
  type: 'upgrade' | 'collect' | 'repair' | 'prestige';
  payload: Record<string, unknown>;
  clientTimestamp: number;
  retryCount: number;
}

// On reconnect:
// 1. Send queued actions to server
// 2. Server validates timestamps (reject if state changed)
// 3. Server returns authoritative state
// 4. Client merges, notifies user of conflicts
```

---

### Admin Auth

**Approach:** Simple hardcoded password for MVP

```csharp
// AdminController.cs
[HttpPost("auth")]
public IActionResult Authenticate([FromBody] AdminLoginDto dto)
{
    var adminPassword = Environment.GetEnvironmentVariable("ADMIN_PASSWORD") 
        ?? "admin123"; // Default for dev
    
    if (dto.Password == adminPassword)
        return Ok(new { token = GenerateSimpleToken() });
    
    return Unauthorized();
}
```

Frontend stores token in sessionStorage, sent as `Authorization: Bearer {token}`.

---

### Key Game Balance Constants

```typescript
// frontend/src/game/constants.ts
export const BALANCE = {
  // Decay
  DECAY_BASE_RATE: 5,           // % per hour
  DECAY_ACCELERATE_4H: 8,       // % per hour after 4h
  DECAY_ACCELERATE_8H: 12,      // % per hour after 8h
  DECAY_CAP_HOURS: 48,
  CRITICAL_THRESHOLD: 20,       // Below this = halted
  
  // Collection
  OFFLINE_CAP_HOURS: 8,
  BULK_REPAIR_CAP: 3,           // Free repairs per day
  
  // Prestige
  EP_BASE_FORMULA: 'floor(sqrt(totalEarnings / 1e6))',
  PRESTIGE_MULTIPLIER: 1.5,
  
  // Industries
  UPGRADE_COST_MULTIPLIER: 1.15,
  OUTPUT_MULTIPLIER_PER_LEVEL: 1.1,
  
  // Wheel
  WHEEL_WEIGHTS: {
    common: 60,
    uncommon: 25,
    rare: 12,
    epic: 2.5,
    legendary: 0.5,
  },
  PITY_THRESHOLD: 7,            // Guaranteed uncommon after X commons
};
```

---

### E2E Test Scenarios

```typescript
// e2e/tests/first-session.spec.ts
test('new player completes tutorial flow', async ({ page }) => {
  await page.goto('/');
  
  // Verify first industry visible
  await expect(page.locator('.industry-card')).toHaveCount(1);
  
  // Tap to collect
  await page.click('[data-action="collect"]');
  await expect(page.locator('.currency-cash')).toContainText('$');
  
  // Upgrade
  await page.click('[data-action="upgrade"]');
  await expect(page.locator('.industry-level')).toContainText('2');
  
  // Second industry unlocks
  await expect(page.locator('.industry-card')).toHaveCount(2);
});

// e2e/tests/decay.spec.ts
test('industries decay over time', async ({ page }) => {
  await page.goto('/');
  
  // Fast-forward time (mock)
  await page.evaluate(() => {
    window.__TEST_TIME_OFFSET = 4 * 60 * 60 * 1000; // 4 hours
  });
  
  await page.reload();
  
  // Verify decay visualization
  await expect(page.locator('.stability-meter')).toHaveAttribute('data-status', 'warning');
});

// e2e/tests/offline-sync.spec.ts
test('offline actions sync on reconnect', async ({ page, context }) => {
  await page.goto('/');
  
  // Go offline
  await context.setOffline(true);
  
  // Perform actions
  await page.click('[data-action="upgrade"]');
  await page.click('[data-action="collect"]');
  
  // Verify queued
  const queue = await page.evaluate(() => localStorage.getItem('offlineQueue'));
  expect(JSON.parse(queue)).toHaveLength(2);
  
  // Reconnect
  await context.setOffline(false);
  await page.waitForSelector('.sync-complete');
  
  // Verify synced
  const emptyQueue = await page.evaluate(() => localStorage.getItem('offlineQueue'));
  expect(JSON.parse(emptyQueue)).toHaveLength(0);
});
```

---

### Next Steps

1. Confirm this plan looks good
2. Initialize the project structure
3. Begin Phase 1A: Foundation

Ready to proceed?
