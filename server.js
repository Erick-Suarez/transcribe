require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { createClient, LiveTranscriptionEvents } = require("@deepgram/sdk");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static('public'));

// Store Deepgram connections for each client
const deepgramConnections = new Map();

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('start-transcription', () => {
        console.log('Starting transcription for:', socket.id);
        
        // Initialize the Deepgram SDK with the new API key
        const deepgram = createClient("6f530ff14289d5c371aa80fa4f9550ed9150ebc8");

        // Create a websocket connection to Deepgram
        const connection = deepgram.listen.live({
            punctuate: true,
            model: 'nova-2',
            language: 'es',
            encoding: 'linear16',
            sample_rate: 16000,
            channels: 1,
            interim_results: true,
            smart_format: true
        });

        // Store the connection
        deepgramConnections.set(socket.id, connection);

        // Listen for the connection to open
        connection.on(LiveTranscriptionEvents.Open, () => {
            console.log('Deepgram connection opened for:', socket.id);
        });

        // Listen for any transcripts received from Deepgram
        connection.on(LiveTranscriptionEvents.Transcript, (data) => {
            console.log('Transcript received:', data);
            if (data.channel && data.channel.alternatives && data.channel.alternatives[0]) {
                const transcript = data.channel.alternatives[0].transcript;
                if (transcript && transcript.trim() !== '') {
                    socket.emit('transcript', {
                        text: transcript,
                        is_final: data.is_final || false
                    });
                }
            }
        });

        // Listen for any metadata received from Deepgram
        connection.on(LiveTranscriptionEvents.Metadata, (data) => {
            console.log('Metadata received:', data);
        });

        // Listen for any errors
        connection.on(LiveTranscriptionEvents.Error, (error) => {
            console.error('Deepgram error:', error);
        });

        // Listen for the connection to close
        connection.on(LiveTranscriptionEvents.Close, () => {
            console.log('Deepgram connection closed for:', socket.id);
        });
    });

    socket.on('audio-data', (audioData) => {
        const connection = deepgramConnections.get(socket.id);
        if (connection) {
            try {
                // Convert the audio data to Buffer if it's not already
                const buffer = Buffer.isBuffer(audioData) ? audioData : Buffer.from(audioData);
                console.log('Sending audio data to Deepgram, size:', buffer.length);
                connection.send(buffer);
            } catch (error) {
                console.error('Error sending audio data:', error);
            }
        } else {
            console.log('No Deepgram connection found for:', socket.id);
        }
    });

    socket.on('stop-transcription', () => {
        console.log('Stopping transcription for:', socket.id);
        const connection = deepgramConnections.get(socket.id);
        if (connection) {
            connection.finish();
            deepgramConnections.delete(socket.id);
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        const connection = deepgramConnections.get(socket.id);
        if (connection) {
            connection.finish();
            deepgramConnections.delete(socket.id);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🎤 Voice Transcription Server running on http://localhost:${PORT}`);
}); 