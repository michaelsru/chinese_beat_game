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
    this.translationQueue = new Map(); // lineId -> pending promise

    this.committedInterim = "";
    this.isProcessingCut = false;

    this.audioManager = new AudioManager(async (final, interim) => {
      if (final) {
        console.debug('[Main] 🟢 Engine Final:', final);
        console.debug('[Main] 🧊 Current Buffer:', this.committedInterim);
        let remainingFinal = final;
        // Dedup against what we already committed
        if (this.committedInterim) {
          // Always strip the length of what we already finalized. 
          // If the engine changed the past words ('Hello' -> 'Hullo'), we ignore the change 
          // to prevent "HelloHullo" duplication on screen.
          remainingFinal = final.substring(this.committedInterim.length);
        }

        // If there's new content in Final, finalize it.
        // Reset state IMMEDIATELY for next sentence
        // This ensures new speech (arriving while we translate) isn't blocked or mis-deduped.
        this.committedInterim = "";
        this.lastInterimTime = 0;
        this.lastInterimLength = 0;
        this.isProcessingCut = false;

        if (remainingFinal.trim()) {
          console.log('[Main] Finalizing Remaining:', remainingFinal);
          const finalizedLine = this.visualizer.finalizeInterim(remainingFinal, "...");

          const lineId = finalizedLine.id;
          const translationPromise = this.translator.translate(remainingFinal)
            .then(t => {
              if (this.translationQueue.get(lineId) === translationPromise) {
                console.debug('[Main] ✅ Queue: Translation applied for line:', lineId);
                this.visualizer.updateLineTranslation(finalizedLine, t);
                this.translationQueue.delete(lineId);
              } else {
                console.debug('[Main] ❌ Queue: Stale translation discarded for line:', lineId);
              }
            })
            .catch(e => console.error(e));
          console.debug('[Main] ➡️ Queueing translation for line:', lineId);
          this.translationQueue.set(lineId, translationPromise);
        }
        return;
      }

      // 2. Handle Interim Result (Manual Cutting)
      if (interim && !this.isProcessingCut) {
        console.debug('[Main] 🟡 Interim:', interim, '| Buffer:', this.committedInterim);
        let effectiveInterim = interim;
        // Dedup
        if (this.committedInterim && interim.startsWith(this.committedInterim)) {
          effectiveInterim = interim.substring(this.committedInterim.length);
        } else if (this.committedInterim) {
          // Diverged (Engine corrected earlier words). 
          // We ignore slight divergences and trust the engine's new hypothesis is mostly new content
          // If the new interim is longer than what we committed, show the tail.
          // Example: Committed "Hello," (6). Interim "Hello world" (11).
          // We can't safely dedup, but we can assume the user added " world".
          if (interim.length > this.committedInterim.length) {
            console.warn('[Main] ⚠️ Divergence! Diff:', interim.substring(this.committedInterim.length));
            effectiveInterim = interim.substring(this.committedInterim.length);
          }
        }

        // Check for Punctuation Split
        // Matches: (Text)(Punctuation)(Remainder)
        // Chinese: ， 。 ？ ！ ；  English: , . ? ! ;
        const match = effectiveInterim.match(/^(.+?)([，。？！；,!?.])(.*)/);

        if (match) {
          this.isProcessingCut = true; // Lock to prevent race
          const chunk = match[1] + match[2];
          const remainder = match[3];

          console.log('[Main] ✂️ Punctuation Cut:', chunk);

          // Commit immediately to prevent re-processing
          this.committedInterim += chunk;

          // Commit UI immediately with placeholder
          const finalizedLine = this.visualizer.finalizeInterim(chunk, "...");

          // Unlock processing IMMEDIATELY so we don't drop frames while translating
          this.isProcessingCut = false;
          this.lastInterimTime = 0;
          this.lastInterimLength = 0;

          // Fetch translation in background
          const lineId = finalizedLine.id;
          const translationPromise = this.translator.translate(chunk)
            .then(translation => {
              if (this.translationQueue.get(lineId) === translationPromise) {
                console.debug('[Main] ✅ Queue: Translation applied for line:', lineId);
                this.visualizer.updateLineTranslation(finalizedLine, translation);
                this.translationQueue.delete(lineId);
              } else {
                console.debug('[Main] ❌ Queue: Stale translation discarded for line:', lineId);
              }
            })
            .catch(e => console.error(e));
          console.debug('[Main] ➡️ Queueing translation for line:', lineId);
          this.translationQueue.set(lineId, translationPromise);

        } else {
          // Standard Interim Update (Transcription Only)
          if (effectiveInterim.trim()) {
            this.visualizer.updateInterim(effectiveInterim, "...");
          }
        }
      }
    }, () => {
      // ON SESSION START / RESET
      // The audio manager has restarted the engine (due to VAD or error).
      // We must clear our committed buffer because the new engine session starts from scratch.
      console.log("🔄 Session Reset: Clearing local buffers");
      this.committedInterim = "";
      this.isProcessingCut = false;
      this.visualizer.updateInterim("", ""); // Clear flickering interim
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
