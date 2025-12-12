export class ScoreManager {
    constructor() {
        this.score = 0;
        this.scoreElement = document.getElementById('score');
    }

    addScore(points) {
        this.score += points;
        this.updateDisplay();
    }

    reset() {
        this.score = 0;
        this.updateDisplay();
    }

    updateDisplay() {
        if (this.scoreElement) {
            this.scoreElement.innerText = `Score: ${this.score}`;
        }
    }
}
