// Busyness Tycoon - Main Entry Point
import './styles/custom.scss';
import $ from 'jquery';
import { initializeGameState } from './game/state';
import { GameEngine } from './game/engine';
import { SyncManager } from './game/sync';
import { renderApp, AppContext } from './pages/home';
import { StorageService } from './services/storage';

// Make jQuery globally available for Tabler
(window as unknown as { $: typeof $; jQuery: typeof $ }).$ = $;
(window as unknown as { $: typeof $; jQuery: typeof $ }).jQuery = $;

// Global game state
let appContext: AppContext;

async function bootstrap(): Promise<void> {
  console.log('🎮 Busyness Tycoon starting...');
  
  // Initialize storage
  const storage = new StorageService();
  
  // Get or create player ID
  let playerId = storage.getPlayerId();
  if (!playerId) {
    playerId = crypto.randomUUID();
    storage.setPlayerId(playerId);
    console.log('👤 New player created:', playerId);
  } else {
    console.log('👤 Existing player:', playerId);
  }
  
  // Initialize game state
  const gameState = await initializeGameState(playerId, storage);
  
  // Initialize game engine
  const gameEngine = new GameEngine(gameState);
  
  // Initialize sync manager
  const syncManager = new SyncManager(gameState, storage);
  
  // Store context
  appContext = {
    state: gameState,
    engine: gameEngine,
    storage,
    sync: syncManager,
  };
  
  // Calculate offline earnings/decay
  gameEngine.calculateOfflineProgress();
  
  // Render the app (starts its own game loop)
  renderApp(appContext);
  
  // Register service worker for PWA
  registerServiceWorker();
  
  console.log('✅ Busyness Tycoon ready!');
}

async function registerServiceWorker(): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('📱 Service Worker registered:', registration.scope);
    } catch (error) {
      console.warn('Service Worker registration failed:', error);
    }
  }
}

// Export context for use in other modules
export { appContext };

// Bootstrap on DOM ready
$(document).ready(() => {
  bootstrap().catch(console.error);
});
