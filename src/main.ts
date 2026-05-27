import '@styles/menu.css';
import '@styles/hud.css';
import { Game } from './Game';

/**
 * Application entry point: manage loading screen and boot the game.
 */
async function main(): Promise<void> {
  const loadFill = document.getElementById('loadFill')!;

  loadFill.style.width = '20%';

  // Small delay to allow loading screen to render
  await new Promise(r => setTimeout(r, 50));

  loadFill.style.width = '50%';
  await new Promise(r => setTimeout(r, 50));

  const game = new Game();

  loadFill.style.width = '80%';
  await new Promise(r => setTimeout(r, 50));

  game.init();

  loadFill.style.width = '100%';
  await new Promise(r => setTimeout(r, 300));

  // Hide loading screen
  document.getElementById('loadScreen')!.style.display = 'none';
}

main().catch((err) => {
  console.error('Game initialization failed:', err);
  const loadScreen = document.getElementById('loadScreen');
  if (loadScreen) {
    loadScreen.innerHTML = `<div style="color:#e84040">Error: ${err.message}</div>`;
  }
});
