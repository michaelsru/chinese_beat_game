import { SceneManager } from './game/SceneManager.js';
import { WordManager } from './game/WordManager.js';
import { AudioManager } from './game/AudioManager.js';
import { ScoreManager } from './game/ScoreManager.js';
import { stories } from './data/stories.js';

class Game {
  constructor() {
    this.container = document.getElementById('game-container');
    this.sceneManager = new SceneManager(this.container);

    // Pass onComplete callback
    this.wordManager = new WordManager(this.sceneManager.scene, () => this.onGameComplete());

    this.scoreManager = new ScoreManager();

    this.audioManager = new AudioManager((final, interim) => {
      if (!this.isPlaying) return;
      const hit = this.wordManager.checkInput(final, interim);
      if (hit) {
        this.scoreManager.addScore(100);
      }
    });

    this.lastTime = 0;
    this.isPlaying = false;

    this.setupUI();
  }

  setupUI() {
    const storyList = document.getElementById('story-list');
    const startScreen = document.getElementById('start-screen');
    const backBtn = document.getElementById('back-btn');
    const restartBtn = document.getElementById('restart-btn');
    const gameOverModal = document.getElementById('game-over-modal');

    // Back Button
    backBtn.addEventListener('click', () => {
      this.stopGame();
    });

    // Restart / Back to Menu from Modal
    restartBtn.addEventListener('click', () => {
      gameOverModal.style.display = 'none';
      this.stopGame();
    });

    stories.forEach(story => {
      const btn = document.createElement('div');
      btn.className = 'story-btn';
      btn.innerHTML = `
                <span class="story-title">${story.title}</span>
                <span class="story-desc">${story.description}</span>
            `;
      btn.onclick = () => {
        this.wordManager.setSentences(story.sentences);
        startScreen.style.display = 'none';
        this.start();
      };
      storyList.appendChild(btn);
    });
  }

  start() {
    this.isPlaying = true;
    this.scoreManager.reset();
    document.getElementById('back-btn').style.display = 'block';
    this.audioManager.start();
    this.loop(0);
  }

  stopGame() {
    this.isPlaying = false;
    this.audioManager.stop();
    document.getElementById('back-btn').style.display = 'none';
    document.getElementById('start-screen').style.display = 'block';

    // Clear words
    this.wordManager.setSentences([]);
  }

  onGameComplete() {
    this.isPlaying = false;
    this.audioManager.stop();
    document.getElementById('back-btn').style.display = 'none';

    const modal = document.getElementById('game-over-modal');
    const finalScore = document.getElementById('final-score');
    finalScore.innerText = `Final Score: ${this.scoreManager.score}`;
    modal.style.display = 'block';
  }

  loop(time) {
    if (!this.isPlaying) return;

    requestAnimationFrame((t) => this.loop(t));

    const deltaTime = (time - this.lastTime) / 1000;
    this.lastTime = time;

    this.wordManager.update(deltaTime);
    this.sceneManager.render();
  }
}

// Initialize game
new Game();
