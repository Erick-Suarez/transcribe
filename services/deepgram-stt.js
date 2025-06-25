const { createClient, LiveTranscriptionEvents } = require("@deepgram/sdk");
const STTBase = require('./stt-base');

class DeepgramSTT extends STTBase {
    constructor(config = {}) {
        super(config);
        this.apiKey = config.apiKey || process.env.DEEPGRAM_API_KEY;
        this.deepgram = null;
        
        if (!this.apiKey) {
            throw new Error('Deepgram API key is required');
        }
    }

    async initialize(options = {}) {
        const defaultOptions = {
            punctuate: true,
            model: 'nova-2',
            language: 'es',
            encoding: 'linear16',
            sample_rate: 16000,
            channels: 1,
            interim_results: true,
            smart_format: true
        };

        // Merge options, with passed options taking precedence
        this.options = { ...defaultOptions, ...options };
        this.deepgram = createClient(this.apiKey);
        
        console.log(`[Deepgram] Initialized with model: ${this.options.model}, language: ${this.options.language}`);
    }

    async startTranscription(onTranscript, onError) {
        if (!this.deepgram) {
            throw new Error('Deepgram not initialized. Call initialize() first.');
        }

        // Create a websocket connection to Deepgram
        this.connection = this.deepgram.listen.live(this.options);

        // Listen for the connection to open
        this.connection.on(LiveTranscriptionEvents.Open, () => {
            console.log('[Deepgram] Connection opened');
            this.isConnected = true;
        });

        // Listen for any transcripts received from Deepgram
        this.connection.on(LiveTranscriptionEvents.Transcript, (data) => {
            console.log('[Deepgram] Raw transcript data:', JSON.stringify(data, null, 2));
            if (data.channel && data.channel.alternatives && data.channel.alternatives[0]) {
                const transcript = data.channel.alternatives[0].transcript;
                console.log('[Deepgram] Extracted transcript:', transcript, 'is_final:', data.is_final);
                if (transcript && transcript.trim() !== '') {
                    console.log('[Deepgram] Sending transcript to client:', transcript);
                    onTranscript({
                        text: transcript,
                        is_final: data.is_final || false,
                        confidence: data.channel.alternatives[0].confidence || 0,
                        service: 'deepgram'
                    });
                } else {
                    console.log('[Deepgram] Empty transcript, not sending');
                }
            } else {
                console.log('[Deepgram] No alternatives in transcript data');
            }
        });

        // Listen for any metadata received from Deepgram
        this.connection.on(LiveTranscriptionEvents.Metadata, (data) => {
            console.log('[Deepgram] Metadata received:', data);
        });

        // Listen for any errors
        this.connection.on(LiveTranscriptionEvents.Error, (error) => {
            console.error('[Deepgram] Error:', error);
            onError(error);
        });

        // Listen for the connection to close
        this.connection.on(LiveTranscriptionEvents.Close, () => {
            console.log('[Deepgram] Connection closed');
            this.isConnected = false;
        });
    }

    sendAudio(audioData) {
        if (this.connection && this.isConnected) {
            try {
                const buffer = Buffer.isBuffer(audioData) ? audioData : Buffer.from(audioData);
                this.connection.send(buffer);
            } catch (error) {
                console.error('[Deepgram] Error sending audio data:', error);
            }
        }
    }

    stopTranscription() {
        if (this.connection) {
            this.connection.finish();
            this.connection = null;
            this.isConnected = false;
            console.log('[Deepgram] Transcription stopped');
        }
    }

    getServiceName() {
        return 'deepgram';
    }

    isAvailable() {
        return !!this.apiKey;
    }
}

module.exports = DeepgramSTT; 