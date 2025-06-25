/**
 * Base class for Speech-to-Text services
 */
class STTBase {
    constructor(config = {}) {
        this.config = config;
        this.connection = null;
        this.isConnected = false;
    }

    /**
     * Initialize the STT service
     * @param {Object} options - Service-specific options
     */
    async initialize(options = {}) {
        throw new Error('initialize() must be implemented by subclass');
    }

    /**
     * Start transcription session
     * @param {Function} onTranscript - Callback for transcript results
     * @param {Function} onError - Callback for errors
     */
    async startTranscription(onTranscript, onError) {
        throw new Error('startTranscription() must be implemented by subclass');
    }

    /**
     * Send audio data to the STT service
     * @param {Buffer} audioData - Audio data buffer
     */
    sendAudio(audioData) {
        throw new Error('sendAudio() must be implemented by subclass');
    }

    /**
     * Stop transcription and cleanup
     */
    stopTranscription() {
        throw new Error('stopTranscription() must be implemented by subclass');
    }

    /**
     * Get service name
     */
    getServiceName() {
        throw new Error('getServiceName() must be implemented by subclass');
    }

    /**
     * Check if service is available
     */
    isAvailable() {
        return true; // Override if needed
    }
}

module.exports = STTBase; 