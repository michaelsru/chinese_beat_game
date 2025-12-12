
export class VisualizerManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            // Create if not exists (it won't, so we make it)
            this.container = document.createElement('div');
            this.container.id = containerId;
            this.container.style.position = 'absolute';
            this.container.style.bottom = '20%';
            this.container.style.left = '50%';
            this.container.style.transform = 'translateX(-50%)';
            this.container.style.width = '80%';
            this.container.style.textAlign = 'center';
            this.container.style.display = 'flex';
            this.container.style.flexDirection = 'column';
            this.container.style.gap = '16px';
            this.container.style.pointerEvents = 'none';
            document.body.appendChild(this.container);
        }

        this.lines = []; // Array of { element, text, translation }
        this.MAX_LINES = 4;
        this.activeLine = null;
    }

    update(deltaTime) {
        // No visual loop needed for HTML
    }

    createLineElement(text, translation, isInterim) {
        const div = document.createElement('div');
        div.style.padding = '10px';
        div.style.borderRadius = '8px';
        div.style.background = 'rgba(0, 0, 0, 0.5)';
        div.style.transition = 'all 0.2s ease';

        const zh = document.createElement('div');
        zh.innerText = text;
        zh.style.fontSize = '32px';
        zh.style.fontWeight = 'bold';
        zh.style.color = isInterim ? '#ffff00' : '#00ff88';

        const en = document.createElement('div');
        en.innerText = translation;
        en.style.fontSize = '32px';
        en.style.color = '#cccccc';

        div.appendChild(zh);
        div.appendChild(en);

        return { div, zh, en };
    }

    spawnText(text, translation) {
        this.finalizeInterim(text, translation);
    }

    updateInterim(text, translation) {
        if (!text) return;

        if (this.activeLine) {
            // Update existing
            this.activeLine.zh.innerText = text;
            this.activeLine.en.innerText = translation;
        } else {
            // Create new interim line
            const lineObj = this.createLineElement(text, translation, true);
            this.container.appendChild(lineObj.div);
            this.lines.push(lineObj);
            this.activeLine = lineObj;

            this.pruneLines();
        }
    }

    finalizeInterim(text, translation) {
        const lineObj = this.createLineElement(text, translation, false);
        lineObj.id = Date.now() + Math.random(); // Unique ID
        lineObj.isRemoved = false;

        if (!text) return null;

        let finalizedLine = null;

        if (this.activeLine) {
            this.activeLine.zh.innerText = text;
            this.activeLine.en.innerText = translation;
            this.activeLine.zh.style.color = '#00ff88'; // Turn green
            finalizedLine = this.activeLine;
            this.activeLine = null;
        } else {
            const lineObj = this.createLineElement(text, translation, false);
            this.container.appendChild(lineObj.div);
            this.lines.push(lineObj);
            this.pruneLines();
            finalizedLine = lineObj;
        }
        return finalizedLine;
    }

    updateLineTranslation(lineObj, translation) {
        if (lineObj && !lineObj.isRemoved && lineObj.en) {
            lineObj.en.innerText = translation;
        }
    }

    pruneLines() {
        while (this.lines.length > this.MAX_LINES) {
            const removed = this.lines.shift();
            removed.isRemoved = true;
            if (this.container.contains(removed.div)) {
                this.container.removeChild(removed.div);
            }
            if (removed === this.activeLine) {
                this.activeLine = null;
            }
        }
    }

    removeWord(index) { } // No op
    clear() {
        this.container.innerHTML = '';
        this.lines = [];
        this.activeLine = null;
    }
}

