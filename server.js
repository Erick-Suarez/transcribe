require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const session = require('express-session');
const crypto = require('crypto');
const STTFactory = require('./services/stt-factory');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Configure session middleware
const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true in production with HTTPS
        httpOnly: true,
        maxAge: 90 * 24 * 60 * 60 * 1000 // 90 days
    }
}));

// Parse JSON bodies for API routes
app.use(express.json());

// Serve static files
app.use(express.static('public'));

// Store STT service instances for each client
const sttConnections = new Map();

io.on('connection', (socket) => {
    socket.on('start-transcription', async (options = {}) => {        
        try {
            // Create STT service instance with specified service
            const requestedService = options.service || 'auto';
            const requestedLanguage = options.language || 'es';
            const sttService = STTFactory.createService(requestedService);
            
            // Initialize the service with language
            const initOptions = getLanguageOptions(requestedLanguage);
            await sttService.initialize(initOptions);
            
            // Store the service instance
            sttConnections.set(socket.id, sttService);
                        
            // Start transcription with callbacks
            await sttService.startTranscription(
                // onTranscript callback
                (transcriptData) => {
                    socket.emit('transcript', {
                        text: transcriptData.text,
                        is_final: transcriptData.is_final,
                        confidence: transcriptData.confidence,
                        service: transcriptData.service
                    });
                },
                // onError callback
                (error) => {
                    console.error(`[${sttService.getServiceName()}] Error:`, error);
                    socket.emit('error', { message: 'Transcription error', service: sttService.getServiceName() });
                }
            );
            
            // Send service info back to client
            socket.emit('service-selected', { 
                service: sttService.getServiceName(),
                available: STTFactory.getAvailableServices()
            });
            
        } catch (error) {
            console.error('Failed to start transcription:', error);
            socket.emit('error', { message: 'Failed to start transcription' });
        }
    });

    socket.on('audio-data', (audioData) => {
        const sttService = sttConnections.get(socket.id);
        if (sttService) {
            try {
                // Convert the audio data to Buffer if it's not already
                const buffer = Buffer.isBuffer(audioData) ? audioData : Buffer.from(audioData);
                sttService.sendAudio(buffer);
            } catch (error) {
                console.error(`[${sttService.getServiceName()}] Error sending audio data:`, error);
            }
        } else {
            console.warn('No STT connection found for:', socket.id);
        }
    });

    socket.on('stop-transcription', () => {
        const sttService = sttConnections.get(socket.id);
        if (sttService) {
            sttService.stopTranscription();
            sttConnections.delete(socket.id);
        }
    });

    socket.on('get-available-services', () => {
        socket.emit('available-services', {
            services: STTFactory.getAvailableServices(),
            current: process.env.STT_SERVICE || 'auto'
        });
    });

    socket.on('disconnect', () => {
        const sttService = sttConnections.get(socket.id);
        if (sttService) {
            sttService.stopTranscription();
            sttConnections.delete(socket.id);
        }
    });
});

// Helper function to get language-specific options for STT services
function getLanguageOptions(language) {
    const languageMap = {
        'es': {
            // Deepgram options
            language: 'es',
            // Google STT options  
            languageCode: 'es-ES'
        },
        'en': {
            // Deepgram options
            language: 'en-US',
            // Google STT options
            languageCode: 'en-US'
        },
        'ko': {
            // Deepgram options
            language: 'ko',
            // Google STT options
            languageCode: 'ko-KR'
        },
        'zh': {
            // Deepgram options (Mandarin Simplified)
            language: 'zh-CN',
            // Google STT options (Mandarin Simplified)
            languageCode: 'cmn-Hans-CN'
        },
        'zh-tw': {
            // Deepgram options (not supported)
            language: null,
            // Google STT options (Mandarin Traditional)
            languageCode: 'cmn-Hant-TW'
        },
        'tl': {
            // Deepgram options (not supported)
            language: null,
            // Google STT options (Filipino/Tagalog)
            languageCode: 'tl-PH'
        }
    };
    
    return languageMap[language] || languageMap['es'];
}



const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`server running on http://localhost:${PORT}`);
}); 