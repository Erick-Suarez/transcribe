const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const speech = require('@google-cloud/speech');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.static('public'));

// Serve the HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Google Cloud Speech client
let speechClient;
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  // Production: Use environment variable with JSON content
  const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  speechClient = new speech.SpeechClient({ credentials });
} else {
  // Development: Use local file
  speechClient = new speech.SpeechClient({
    keyFilename: '/Users/ericksuarez/code/voice/cloud/psychic-lens-463904-i7-057d819844fc.json'
  });
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  let recognizeStream = null;

  socket.on('start-recording', () => {
    console.log('Starting transcription for:', socket.id);
    
    // Configure the request
    const request = {
      config: {
        encoding: 'WEBM_OPUS',
        sampleRateHertz: 48000,
        languageCode: 'es-ES',
        enableAutomaticPunctuation: true,
        model: 'default',
        useEnhanced: true,
      },
      interimResults: true,
      singleUtterance: false,
    };

    // Create a recognize stream
    recognizeStream = speechClient
      .streamingRecognize(request)
      .on('error', (error) => {
        console.error('Speech recognition error:', error);
        socket.emit('error', error.message);
        recognizeStream = null;
      })
      .on('data', (data) => {
        if (data.results[0] && data.results[0].alternatives[0]) {
          const transcript = data.results[0].alternatives[0].transcript;
          const isFinal = data.results[0].isFinal;
          
          socket.emit('transcription', {
            text: transcript,
            isFinal: isFinal,
          });
        }
      })
      .on('end', () => {
        console.log('Recognition stream ended for:', socket.id);
        recognizeStream = null;
      });
  });

  socket.on('audio-data', (audioData) => {
    if (recognizeStream && !recognizeStream.destroyed && recognizeStream.writable) {
      try {
        recognizeStream.write(Buffer.from(audioData));
      } catch (error) {
        console.error('Error writing audio data:', error.message);
      }
    }
  });

  socket.on('stop-recording', () => {
    console.log('Stopping transcription for:', socket.id);
    if (recognizeStream && !recognizeStream.destroyed && recognizeStream.writable) {
      try {
        recognizeStream.end();
      } catch (error) {
        console.error('Error ending stream:', error.message);
      }
      recognizeStream = null;
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    if (recognizeStream && !recognizeStream.destroyed && recognizeStream.writable) {
      try {
        recognizeStream.end();
      } catch (error) {
        console.error('Error ending stream on disconnect:', error.message);
      }
      recognizeStream = null;
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🎤 Voice Transcription Server running on http://localhost:${PORT}`);
}); 