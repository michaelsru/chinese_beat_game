import * as THREE from 'three';

export class WordManager {
    constructor(scene, onComplete) {
        this.scene = scene;
        this.onComplete = onComplete;
        this.words = [];
        this.spawnTimer = 0;
        this.spawnInterval = 1500; // Faster spawn for sentences
        this.speed = 2.0; // units per second

        // Sentence Mode Data
        this.sentences = [];
        this.currentSentenceIndex = 0;
        this.currentWordIndexInSentence = 0;
        this.isFinishedSpawning = false;
    }

    setSentences(sentences) {
        this.sentences = sentences;
        this.currentSentenceIndex = 0;
        this.currentWordIndexInSentence = 0;
        this.isFinishedSpawning = false;
        this.words.forEach(w => this.scene.remove(w.mesh));
        this.words = [];
    }

    update(deltaTime) {
        if (this.isFinishedSpawning && this.words.length === 0) {
            // All words spawned and cleared/missed
            // We trigger complete only once
            if (this.onComplete) {
                this.onComplete();
                this.onComplete = null; // Prevent multiple calls
            }
            return;
        }

        this.spawnTimer += deltaTime * 1000;
        if (!this.isFinishedSpawning && this.spawnTimer > this.spawnInterval) {
            this.spawnNextWord();
            this.spawnTimer = 0;
        }

        // Move words
        for (let i = this.words.length - 1; i >= 0; i--) {
            const wordObj = this.words[i];
            wordObj.mesh.position.x -= this.speed * deltaTime;

            // Remove if off screen
            if (wordObj.mesh.position.x < -10) {
                this.removeWord(i);
                // TODO: Trigger miss event
            }
        }
    }

    createTextTexture(text, pinyin, color) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 512; // Increased resolution
        canvas.height = 512;

        ctx.fillStyle = 'rgba(0, 0, 0, 0)'; // Transparent background
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw Chinese Character
        ctx.font = 'Bold 150px Arial';
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2 - 40);

        // Draw Pinyin
        ctx.font = 'Bold 60px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(pinyin, canvas.width / 2, canvas.height / 2 + 80);

        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }

    spawnNextWord() {
        if (this.currentSentenceIndex >= this.sentences.length) {
            this.isFinishedSpawning = true;
            return;
        }

        const sentence = this.sentences[this.currentSentenceIndex];
        if (this.currentWordIndexInSentence < sentence.length) {
            const wordData = sentence[this.currentWordIndexInSentence];
            this.spawnWord(wordData);
            this.currentWordIndexInSentence++;
        } else {
            // Move to next sentence
            this.currentSentenceIndex++;
            this.currentWordIndexInSentence = 0;
            // Immediate check for next sentence to avoid double delay or empty spawn
            if (this.currentSentenceIndex < this.sentences.length) {
                // Optional: Add a pause between sentences?
                // For now, just let the timer handle the next spawn
            } else {
                this.isFinishedSpawning = true;
            }
        }
    }

    spawnWord(wordData) {
        // Create text texture
        const texture = this.createTextTexture(wordData.text, wordData.pinyin, '#00ff88');
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);

        sprite.scale.set(4, 4, 1); // Increased scale for visibility
        sprite.position.set(15, 1, 0); // Start further right

        this.scene.add(sprite);

        this.words.push({
            mesh: sprite,
            data: wordData
        });

        // console.log('Spawned word'); 
    }

    createExplosion(position) {
        const particleCount = 20;
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const velocities = [];

        for (let i = 0; i < particleCount; i++) {
            positions.push(position.x, position.y, position.z);
            velocities.push(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            );
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        const material = new THREE.PointsMaterial({ color: 0x00ff88, size: 0.5, transparent: true });
        const particles = new THREE.Points(geometry, material);

        this.scene.add(particles);

        // Animate particles
        const animate = () => {
            const positions = particles.geometry.attributes.position.array;
            for (let i = 0; i < particleCount; i++) {
                positions[i * 3] += velocities[i * 3] * 0.1;
                positions[i * 3 + 1] += velocities[i * 3 + 1] * 0.1;
                positions[i * 3 + 2] += velocities[i * 3 + 2] * 0.1;
            }
            particles.geometry.attributes.position.needsUpdate = true;
            material.opacity -= 0.02;

            if (material.opacity > 0) {
                requestAnimationFrame(animate);
            } else {
                this.scene.remove(particles);
            }
        };
        animate();
    }

    removeWord(index, isHit = false) {
        const wordObj = this.words[index];
        if (isHit) {
            this.createExplosion(wordObj.mesh.position);
        }
        this.scene.remove(wordObj.mesh);
        this.words.splice(index, 1);
    }

    checkInput(finalTranscript, interimTranscript) {
        // Combine transcripts or check both.
        // We prioritize the "oldest" word (first in list)

        if (this.words.length === 0) return false;

        const targetWord = this.words[0]; // Always target the leftmost word

        // Optimization: Truncate input to last 50 characters
        let combinedInput = (finalTranscript + interimTranscript);
        if (combinedInput.length > 50) {
            combinedInput = combinedInput.slice(-50);
        }

        // Revert to direct character matching
        if (combinedInput.includes(targetWord.data.text)) {
            // console.log(`Matched: ${targetWord.data.text}`);
            this.removeWord(0, true);
            return true;
        }

        return false;
    }
}
