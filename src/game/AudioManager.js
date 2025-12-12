export class AudioManager {
    constructor(onResult, onSessionStart) {
        this.onResult = onResult;
        this.onSessionStart = onSessionStart;
        this.recognition = null;
        this.isListening = false;

        // VAD / Audio Context
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.dataArray = null;

        // Configuration
        this.volumeThreshold = 0.15;     // Lower threshold to catch quiet speech
        this.minSilenceDuration = 200;
        this.maxSilenceDuration = 400;

        // State
        this.lastSpeechTime = Date.now();
        this.lastApiActivity = Date.now(); // Track when API last did something
        this.checkInterval = null;
        this.currentInterimLength = 0;
        this.isSpeechDetected = false;
        this.continuousSpeechFrames = 0; // For watchdog

        this.init();
    }

    init() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.lang = 'zh-CN';
            this.recognition.continuous = true;
            this.recognition.interimResults = true;

            this.recognition.onstart = () => {
                this.lastApiActivity = Date.now();
                this.onSessionStart?.();
            };

            this.recognition.onresult = (event) => {
                this.lastApiActivity = Date.now();
                this.continuousSpeechFrames = 0; // Reset watchdog since API is working

                let interimTranscript = '';
                let finalTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }

                // Update state for our VAD logic
                this.currentInterimLength = interimTranscript.length;

                // Pass data up
                if (finalTranscript || interimTranscript) {
                    console.debug('[Audio] Raw Result:', { final: finalTranscript, interim: interimTranscript });
                    this.onResult(finalTranscript, interimTranscript);
                }

                if (finalTranscript) {
                    this.currentInterimLength = 0;
                }
            };

            this.recognition.onend = () => {
                if (this.isListening) {
                    setTimeout(() => {
                        try {
                            console.log('♻️ Restarting recognition session...');
                            this.recognition.start();
                        } catch (e) { }
                    }, 10);
                }
            }

            this.recognition.onerror = (event) => {
                if (event.error !== 'no-speech') {
                    console.warn('Speech recognition warning:', event.error);
                }
                // Determine if we need to restart on error
                this.lastApiActivity = Date.now();
            };
        } else {
            console.error('Web Speech API not supported');
        }
    }

    async setupAudioContext() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();

            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.analyser.smoothingTimeConstant = 0.3;

            this.microphone = this.audioContext.createMediaStreamSource(stream);
            this.microphone.connect(this.analyser);

            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);

            this.startSmartVAD();
        } catch (err) {
            console.error('Error accessing microphone for VAD:', err);
        }
    }

    startSmartVAD() {
        if (this.checkInterval) clearInterval(this.checkInterval);

        this.checkInterval = setInterval(() => {
            if (!this.analyser) return;

            this.analyser.getByteFrequencyData(this.dataArray);

            let sum = 0;
            for (let i = 0; i < this.dataArray.length; i++) {
                sum += (this.dataArray[i] * this.dataArray[i]);
            }
            const rms = Math.sqrt(sum / this.dataArray.length) / 255;

            // 1. Detect Speech
            if (rms > this.volumeThreshold) {
                this.lastSpeechTime = Date.now();
                this.isSpeechDetected = true;
                this.continuousSpeechFrames++;
            } else {
                this.continuousSpeechFrames = 0;
            }

            // --- WATCHDOG --- 
            // If we hear speech for > 1.5s but the API hasn't said ANYTHING for > 2s
            // It's likely dead. Kill it.
            if (this.continuousSpeechFrames > 30 && (Date.now() - this.lastApiActivity > 4000)) {
                console.warn("🐶 Watchdog bark! Audio detected but API silent. Forcing restart...");
                this.continuousSpeechFrames = 0;
                this.recognition.abort(); // abort() is harsher than stop(), kills it immediately
                // onend will fire and restart
            }
            // ----------------

            // 2. Logic: Should we cut?
            const silenceDuration = Date.now() - this.lastSpeechTime;
            const sessionDuration = Date.now() - this.sessionStartTime;

            if (this.currentInterimLength > 0) {
                const isLongPhrase = this.currentInterimLength > 20;
                const dynamicThreshold = isLongPhrase ? this.minSilenceDuration : this.maxSilenceDuration;

                if (silenceDuration > dynamicThreshold) {
                    console.log(`✂️ Cutting phrase. Length: ${this.currentInterimLength}, Silence: ${silenceDuration}ms`);
                    this.forceFinalize();
                }
            }
            else if (silenceDuration > 1000 && sessionDuration > 30000) {
                // If we've been running for >30s and have 1s of silence, refresh the connection
                console.log("♻️ Proactive session refresh during silence");
                this.recognition.stop(); // Graceful stop, not abort
                this.sessionStartTime = Date.now(); // Reset tracker
            }

        }, 100);
    }

    forceFinalize() {
        // Stopping the recognition instance forces it to emit the current interim results as 'final'
        // and trigger 'onend', which will restart the cycle via our auto-restart logic.
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            // Reset trackers immediately so we don't double-cut
            this.currentInterimLength = 0;
            this.lastSpeechTime = Date.now();
        }
    }

    start() {
        if (this.recognition && !this.isListening) {
            this.isListening = true;
            try {
                this.recognition.start();
                console.log('🎙️ Started listening');
            } catch (e) { console.warn('Recognition already started'); }

            if (!this.audioContext) {
                this.setupAudioContext();
            } else {
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }
                // Ensure VAD loop is running even if we just resumed
                this.startSmartVAD();
            }
        }
    }

    stop() {
        if (this.recognition && this.isListening) {
            this.isListening = false;
            this.recognition.stop();
            console.log('🛑 Stopped listening');

            if (this.checkInterval) clearInterval(this.checkInterval);
        }
    }
}