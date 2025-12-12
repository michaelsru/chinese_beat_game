import { SceneManager } from './game/SceneManager.js';
import { VisualizerManager } from './game/VisualizerManager.js';
import { AudioManager } from './game/AudioManager.js';
import { TranslationManager } from './game/TranslationManager.js';

class App {
  constructor() {
    this.container = document.getElementById('game-container');
    // this.sceneManager = new SceneManager(this.container); // Disabled 3D scene

    // Create container for subtitles
    this.visualizer = new VisualizerManager('subtitle-container');
    this.translator = new TranslationManager();

    this.lastInterimTime = 0;
    this.lastInterimLength = 0;

    this.audioManager = new AudioManager(async (final, interim) => {
      const now = Date.now();

      // Handle Final Result
      if (final) {
        console.log('Final:', final);
        try {
          const translation = await this.translator.translate(final);
          this.visualizer.finalizeInterim(final, translation);
        } catch (e) {
          console.error(e);
          this.visualizer.finalizeInterim(final, "Translation Failed");
        }
        // Reset interim trackers
        this.lastInterimTime = 0;
        this.lastInterimLength = 0;
        return;
      }

      // Handle Interim Result (Throttled)
      if (interim) {
        // Throttle: Translate every 600ms OR if significant new text added (e.g. 4+ chars)
        // Note: Chinese characters are information dense, so 2-3 chars is significant.
        if (now - this.lastInterimTime > 600 || (interim.length - this.lastInterimLength > 2)) {
          this.lastInterimTime = now;
          this.lastInterimLength = interim.length;

          try {
            const translation = await this.translator.translate(interim);
            this.visualizer.updateInterim(interim, translation);
          } catch (e) {
            // Silent fail for interim
          }
        }
      }
    });

    this.lastTime = 0;
    this.isPlaying = false;

    this.setupUI();
  }

  setupUI() {
    const uiLayer = document.getElementById('ui-layer');
    uiLayer.innerHTML = `
        <div style="position: absolute; top: 20px; left: 20px; color: white; pointer-events: auto; z-index: 100;">
            <h1>Live Translator (CN -> EN)</h1>
            <button id="toggle-btn" style="padding: 10px 20px; font-size: 18px; cursor: pointer;">Start Listening</button>
            <div id="status" style="margin-top: 10px; opacity: 0.7;">Microphone off</div>
        </div>
    `;

    const toggleBtn = document.getElementById('toggle-btn');
    const status = document.getElementById('status');

    toggleBtn.addEventListener('click', () => {
      if (this.isPlaying) {
        this.stop();
        toggleBtn.innerText = "Start Listening";
        status.innerText = "Microphone off";
        toggleBtn.style.background = ""; // Default
      } else {
        this.start();
        toggleBtn.innerText = "Stop Listening";
        status.innerText = "Listening...";
        toggleBtn.style.background = "#ff4444";
        toggleBtn.style.color = "white";
      }
    });

    // Handle resize logic or remove old listeners if any
  }

  start() {
    this.isPlaying = true;
    this.visualizer.clear();
    this.audioManager.start();
    this.loop(0);
  }

  stop() {
    this.isPlaying = false;
    this.audioManager.stop();
  }

  loop(time) {
    if (!this.isPlaying) return;

    requestAnimationFrame((t) => this.loop(t));

    const deltaTime = (time - this.lastTime) / 1000;
    this.lastTime = time;

    this.visualizer.update(deltaTime);
    // this.sceneManager.render(); // Disabled 3D render
  }
}

// Initialize app
new App();
