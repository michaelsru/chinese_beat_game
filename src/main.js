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

    this.committedInterim = "";
    this.isProcessingCut = false;

    this.audioManager = new AudioManager(async (final, interim) => {
      // 1. Handle Final Result (Engine Authority)
      if (final) {
        let remainingFinal = final;
        // Dedup against what we already committed
        if (this.committedInterim && final.startsWith(this.committedInterim)) {
          remainingFinal = final.substring(this.committedInterim.length);
        }

        // If there's new content in Final, finalize it.
        if (remainingFinal.trim()) {
          try {
            const translation = await this.translator.translate(remainingFinal);
            this.visualizer.finalizeInterim(remainingFinal, translation);
          } catch (e) { console.error(e); }
        }

        // Reset state for next sentence
        this.committedInterim = "";
        this.lastInterimTime = 0;
        this.lastInterimLength = 0;
        this.isProcessingCut = false;
        return;
      }

      // 2. Handle Interim Result (Manual Cutting)
      if (interim && !this.isProcessingCut) {
        let effectiveInterim = interim;
        // Dedup
        if (this.committedInterim && interim.startsWith(this.committedInterim)) {
          effectiveInterim = interim.substring(this.committedInterim.length);
        } else if (this.committedInterim) {
          // Diverged (Engine corrected earlier words). 
          // We ignore slight divergences and trust the engine's new hypothesis is mostly new content
          // or we pause processing. For now, assume sync.
        }

        // Check for Punctuation Split
        // Matches: (Text)(Punctuation)(Remainder)
        // Chinese: ， 。 ？ ！ ；  English: , . ? ! ;
        const match = effectiveInterim.match(/^(.+?)([，。？！；,!?.])(.*)/);

        if (match) {
          this.isProcessingCut = true; // Lock to prevent race
          const chunk = match[1] + match[2];
          const remainder = match[3];

          // Commit immediately to prevent re-processing
          this.committedInterim += chunk;

          try {
            const translation = await this.translator.translate(chunk);
            this.visualizer.finalizeInterim(chunk, translation);

            // If remainder exists, allow it to display as next interim
            if (remainder.trim()) {
              // We can optionally translate remainder here or let next frame do it.
              // Let's let next frame do it to keep logic simple, 
              // unless frame rate is low.
              // But we locked processing! We must unlock.
            }
          } catch (e) { console.error(e); }

          this.isProcessingCut = false;
          this.lastInterimTime = 0; // Reset throttle for new block
          this.lastInterimLength = 0;

        } else {
          // Standard Interim Update (Throttled)
          const now = Date.now();
          if (now - this.lastInterimTime > 600 || (effectiveInterim.length - this.lastInterimLength > 2)) {
            this.lastInterimTime = now;
            this.lastInterimLength = effectiveInterim.length;
            try {
              const translation = await this.translator.translate(effectiveInterim);
              // Only show if we have something
              if (effectiveInterim.trim()) {
                this.visualizer.updateInterim(effectiveInterim, translation);
              }
            } catch (e) { }
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
