const DeepgramSTT = require('./deepgram-stt');
const GoogleSTT = require('./google-stt');

class STTFactory {
    /**
     * Create STT service instance based on environment variable
     * @param {string} serviceName - Service name ('deepgram', 'google', or 'auto')
     * @param {Object} config - Service-specific configuration
     * @returns {STTBase} STT service instance
     */
    static createService(serviceName = null, config = {}) {
        // Use environment variable if no service name provided
        const selectedService = serviceName || process.env.STT_SERVICE || 'auto';
        
        console.log(`[STT Factory] Requested service: ${selectedService}`);

        switch (selectedService.toLowerCase()) {
            case 'deepgram':
                return new DeepgramSTT(config);
                
            case 'google':
                return new GoogleSTT(config);
                
            case 'auto':
                // Auto-select based on available credentials
                return this.autoSelectService(config);
                
            default:
                throw new Error(`Unknown STT service: ${selectedService}. Available: deepgram, google, auto`);
        }
    }

    /**
     * Auto-select the best available STT service
     * @param {Object} config - Service configuration
     * @returns {STTBase} STT service instance
     */
    static autoSelectService(config = {}) {
        console.log('[STT Factory] Auto-selecting STT service...');

        // Priority order: Deepgram -> Google
        const services = [
            { name: 'deepgram', class: DeepgramSTT },
            { name: 'google', class: GoogleSTT }
        ];

        for (const service of services) {
            try {
                const instance = new service.class(config);
                if (instance.isAvailable()) {
                    console.log(`[STT Factory] Selected: ${service.name}`);
                    return instance;
                }
            } catch (error) {
                console.warn(`[STT Factory] ${service.name} not available:`, error.message);
            }
        }

        // Fallback to Deepgram (most likely to work)
        console.warn('[STT Factory] No services available, falling back to Deepgram');
        return new DeepgramSTT(config);
    }

    /**
     * Get list of available services
     * @returns {Array} Array of available service names
     */
    static getAvailableServices() {
        const services = [];
        
        try {
            const deepgram = new DeepgramSTT();
            if (deepgram.isAvailable()) services.push('deepgram');
        } catch (e) {}

        try {
            const google = new GoogleSTT();
            if (google.isAvailable()) services.push('google');
        } catch (e) {}

        return services;
    }
}

module.exports = STTFactory; 