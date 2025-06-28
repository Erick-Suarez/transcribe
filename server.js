require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const basicAuth = require('express-basic-auth');
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

// Session-based authentication (only in production/Cloud Run environment)
const isProduction = process.env.NODE_ENV === 'production' || process.env.K_SERVICE; // K_SERVICE indicates Cloud Run

// Authentication middleware
function requireAuth(req, res, next) {
    // Check if user is already authenticated via session
    if (req.session && req.session.authenticated) {
        return next();
    }
    
    // Check if request is from PWA (standalone mode)
    // PWA detection: check for display-mode or user-agent headers
    const isPWA = req.headers['sec-fetch-site'] === 'same-origin' && 
                  req.headers['sec-fetch-mode'] === 'navigate' && 
                  req.headers['sec-fetch-dest'] === 'document' &&
                  (req.headers['user-agent']?.includes('Mobile') || 
                   req.headers['user-agent']?.includes('wv') ||
                   req.query.pwa === 'true');
    
    // Also check for standalone display mode indicator
    const isStandalone = req.headers['accept']?.includes('text/html') && 
                        req.headers['sec-fetch-dest'] === 'document' &&
                        !req.headers['sec-fetch-site'];
    
    if (isPWA || isStandalone) {
        console.log('🔓 PWA detected - bypassing authentication');
        req.session.authenticated = true;
        req.session.pwaAccess = true;
        return next();
    }
    
    // If not authenticated, try basic auth
    basicAuth({
        authorizer: (username, password) => {
            // Allow 'user' with either 'transcribe' or the environment password
            if (username === 'user') {
                return password === 'transcribe' || 
                       (process.env.AUTH_PASSWORD && password === process.env.AUTH_PASSWORD);
            }
            return false;
        },
        challenge: true,
        realm: 'Voice Transcription App'
    })(req, res, (err) => {
        if (err) {
            return next(err);
        }
        // If basic auth succeeded, mark session as authenticated
        req.session.authenticated = true;
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
            }
            next();
        });
    });
}

if (isProduction && process.env.AUTH_PASSWORD) {
    console.log('🔒 Session-based authentication enabled for production');
    console.log('🔓 PWA users will bypass authentication automatically');
    
    // Skip authentication for icon files and manifest
    app.use((req, res, next) => {
        const publicPaths = [
            '/apple-touch-icon.png',
            '/icon.svg',
            '/icon-192.svg', 
            '/icon-512.svg',
            '/manifest.json',
            '/sw.js'
        ];
        
        if (publicPaths.includes(req.path)) {
            return next(); // Skip authentication for these files
        }
        
        // Apply session-based authentication for all other routes
        requireAuth(req, res, next);
    });
    

    
} else if (isProduction) {
    console.log('⚠️ Running in production without authentication - consider setting AUTH_PASSWORD');
} else {
    console.log('🏠 Running locally - authentication disabled for development');
}

// Serve static files
app.use(express.static('public'));

// Store STT service instances for each client
const sttConnections = new Map();

// Log available STT services on startup
console.log('🎤 Available STT Services:', STTFactory.getAvailableServices());
console.log('🔧 Current STT Service:', process.env.STT_SERVICE || 'auto');

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('start-transcription', async (options = {}) => {
        console.log('Starting transcription for:', socket.id, 'with options:', options);
        
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
            
            console.log(`[${sttService.getServiceName()}] Started transcription for:`, socket.id);
            
            // Start transcription with callbacks
            await sttService.startTranscription(
                // onTranscript callback
                (transcriptData) => {
                    console.log(`[${sttService.getServiceName()}] Transcript:`, transcriptData);
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
            console.log('No STT connection found for:', socket.id);
        }
    });

    socket.on('stop-transcription', () => {
        console.log('Stopping transcription for:', socket.id);
        const sttService = sttConnections.get(socket.id);
        if (sttService) {
            sttService.stopTranscription();
            sttConnections.delete(socket.id);
        }
    });

    socket.on('get-available-services', () => {
        console.log('Client requested available services:', socket.id);
        socket.emit('available-services', {
            services: STTFactory.getAvailableServices(),
            current: process.env.STT_SERVICE || 'auto'
        });
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
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
        }
    };
    
    return languageMap[language] || languageMap['es'];
}

const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🎤 Voice Transcription Server running on http://localhost:${PORT}`);
}); 