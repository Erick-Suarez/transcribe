# 🎤 Voice Transcription Web App

A beautiful, real-time Spanish voice transcription web application with a sleek ChatGPT-inspired design using Deepgram's advanced speech-to-text API.

## Features

- Real-time voice transcription in Spanish
- Clean, modern web interface
- WebSocket-based communication
- Interim and final transcript results
- Mobile-responsive design

## Prerequisites

- Node.js (v14 or higher)
- Deepgram API key ([Get one here](https://console.deepgram.com/))
- Modern web browser (Chrome, Firefox, Safari)

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file in the root directory:
   ```env
   DEEPGRAM_API_KEY=your_deepgram_api_key_here
   PORT=3000
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

4. **Open your browser:**
   Navigate to `http://localhost:3000`

## Usage

1. Click "Start Transcribing" to begin transcription
2. Speak in Spanish - the transcription will appear in real-time
3. Click "Stop Recording" when finished
4. Final transcripts are saved and interim results are shown in italics

## Technical Details

- **Backend:** Node.js with Express and Socket.IO
- **Frontend:** Vanilla HTML/CSS/JavaScript
- **Speech API:** Deepgram Nova-2 model with Spanish language support
- **Audio Format:** WebM Opus at 48kHz
- **Real-time:** WebSocket communication for live transcription

## Browser Permissions

The app requires microphone access. Make sure to:
- Allow microphone permissions when prompted
- Use HTTPS in production (required for microphone access)
- Use a supported browser (Chrome recommended)

## Files

- `server.js` - Main server with Socket.IO and Deepgram integration
- `public/index.html` - Web interface with audio recording and display
- `package.json` - Dependencies and scripts

## Deployment

### Deploy to Vercel

1. Push this repository to GitHub
2. Connect your GitHub account to Vercel
3. Import this repository in Vercel
4. Add environment variable `GOOGLE_APPLICATION_CREDENTIALS` with your service account key content
5. Deploy!

### Environment Variables for Production

- `DEEPGRAM_API_KEY`: Your Deepgram API key

## Troubleshooting

- **No microphone access:** Check browser permissions
- **No transcription:** Verify Google Cloud credentials path
- **Poor accuracy:** Ensure good microphone quality and minimal background noise
- **HTTPS required:** Production deployments need HTTPS for microphone access 