const speech = require('@google-cloud/speech');
const STTBase = require('./stt-base');

class GoogleSTT extends STTBase {
    constructor(config = {}) {
        super(config);
        this.client = null;
        this.recognizeStream = null;
        
        // Check for Google Cloud credentials
        if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !config.keyFilename) {
            console.warn('[Google STT] Warning: No credentials found. Set GOOGLE_APPLICATION_CREDENTIALS or provide keyFilename in config.');
        }
    }

    async initialize(options = {}) {
        const defaultOptions = {
            encoding: 'LINEAR16',
            sampleRateHertz: 16000,
            languageCode: 'es-ES', // Spanish
            enableAutomaticPunctuation: true,
            enableWordTimeOffsets: true,
            enableWordConfidence: true,
            useEnhanced: true,
            model: 'latest_long'
        };

        // Merge options, with passed options taking precedence
        this.options = { ...defaultOptions, ...options };
        
        // Initialize the Google Cloud Speech client
        this.client = new speech.SpeechClient(this.config);
        
        console.log(`[Google STT] Initialized with language: ${this.options.languageCode}, model: ${this.options.model}`);
    }

    async startTranscription(onTranscript, onError) {
        if (!this.client) {
            throw new Error('Google STT not initialized. Call initialize() first.');
        }

        const request = {
            config: this.options,
            interimResults: true
        };

        // Create a recognize stream
        this.recognizeStream = this.client
            .streamingRecognize(request)
            .on('error', (error) => {
                console.error('[Google STT] Error:', error);
                onError(error);
                this.isConnected = false;
            })
            .on('data', (data) => {
                console.log('[Google STT] Raw transcript data:', JSON.stringify(data, null, 2));
                if (data.results && data.results.length > 0) {
                    const result = data.results[0];
                    if (result.alternatives && result.alternatives.length > 0) {
                        const transcript = result.alternatives[0].transcript;
                        console.log('[Google STT] Extracted transcript:', transcript, 'is_final:', result.isFinal);
                        if (transcript && transcript.trim() !== '') {
                            console.log('[Google STT] Sending transcript to client:', transcript);
                            onTranscript({
                                text: transcript,
                                is_final: result.isFinal || false,
                                confidence: result.alternatives[0].confidence || 0,
                                service: 'google'
                            });
                        } else {
                            console.log('[Google STT] Empty transcript, not sending');
                        }
                    } else {
                        console.log('[Google STT] No alternatives in result');
                    }
                } else {
                    console.log('[Google STT] No results in data');
                }
            })
            .on('end', () => {
                console.log('[Google STT] Stream ended');
                this.isConnected = false;
            });

        this.isConnected = true;
        console.log('[Google STT] Transcription started');
    }

    sendAudio(audioData) {
        if (this.recognizeStream && this.isConnected) {
            try {
                const buffer = Buffer.isBuffer(audioData) ? audioData : Buffer.from(audioData);
                this.recognizeStream.write(buffer);
            } catch (error) {
                console.error('[Google STT] Error sending audio data:', error);
            }
        }
    }

    stopTranscription() {
        if (this.recognizeStream) {
            this.recognizeStream.end();
            this.recognizeStream = null;
            this.isConnected = false;
            console.log('[Google STT] Transcription stopped');
        }
    }

    getServiceName() {
        return 'google';
    }

    isAvailable() {
        try {
            // Try to create a client to check if credentials are available
            new speech.SpeechClient(this.config);
            return true;
        } catch (error) {
            console.warn('[Google STT] Service not available:', error.message);
            return false;
        }
    }
}

module.exports = GoogleSTT; 