export class AudioManager {
    constructor(onResult) {
        this.onResult = onResult;
        this.recognition = null;
        this.isListening = false;

        this.init();
    }

    init() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.lang = 'zh-CN';
            this.recognition.continuous = true;
            this.recognition.interimResults = true;

            this.recognition.onresult = (event) => {
                let interimTranscript = '';
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }

                // Send both. Logic will be handled in WordManager to avoid double counting.
                // We prioritize final results, but use interim for fast feedback.
                if (finalTranscript || interimTranscript) {
                    this.onResult(finalTranscript, interimTranscript);
                }
            };

            this.recognition.onerror = (event) => {
                console.error('Speech recognition error', event.error);
            };
        } else {
            console.error('Web Speech API not supported');
            alert('Web Speech API not supported in this browser. Please use Chrome.');
        }
    }

    start() {
        if (this.recognition && !this.isListening) {
            this.recognition.start();
            this.isListening = true;
            console.log('Started listening');
        }
    }

    stop() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            this.isListening = false;
            console.log('Stopped listening');
        }
    }
}
