# Voice Transcription Application

A real-time voice transcription web application supporting multiple speech-to-text services including Deepgram and Google Cloud Speech-to-Text.

## Features

- **Multi-language Support**: Spanish and English transcription
- **Multiple STT Providers**: Deepgram and Google Cloud Speech-to-Text integration
- **Real-time Processing**: WebSocket-based live transcription
- **Service Auto-selection**: Automatically chooses the best available STT service
- **Responsive Interface**: Works across desktop and mobile devices
- **Secure Deployment**: Optional password protection for production environments

## Prerequisites

- Node.js (v16 or higher)
- At least one STT service API key:
  - Deepgram API key ([Get one here](https://console.deepgram.com/))
  - Google Cloud Speech-to-Text credentials ([Setup guide](https://cloud.google.com/speech-to-text/docs/before-you-begin))
- Modern web browser with microphone support

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file in the root directory:
   ```env
   # Required: At least one STT service
   DEEPGRAM_API_KEY=your_deepgram_api_key_here
   GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json
   
   # Optional: Server configuration
   PORT=8080
   NODE_ENV=development
   
   # Optional: Production authentication
   AUTH_PASSWORD=your_secure_password
   ```

3. **Configure Google Cloud credentials (if using Google STT):**
   - Download your service account key file
   - Save it as `google-credentials.json` in the project root
   - Ensure the file path matches your `GOOGLE_APPLICATION_CREDENTIALS` variable

4. **Start the server:**
   ```bash
   npm start
   ```

5. **Access the application:**
   Navigate to `http://localhost:8080`

## Usage

1. **Select Language**: Choose between Spanish and English from the dropdown
2. **Choose STT Service**: Select Auto-select, Deepgram, or Google STT
3. **Start Recording**: Click the play button to begin transcription
4. **Speak Clearly**: The transcription will appear in real-time
5. **Stop Recording**: Click the pause button when finished
6. **Clear Transcript**: Use the Clear button to reset the conversation

## Architecture

- **Backend**: Node.js with Express and Socket.IO
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **STT Services**: 
  - Deepgram Nova-2 model
  - Google Cloud Speech-to-Text with enhanced models
- **Audio Processing**: Linear16 PCM at 16kHz, single channel
- **Communication**: WebSocket-based real-time data streaming
- **Service Pattern**: Factory pattern for STT service abstraction

## Browser Permissions

The app requires microphone access. Make sure to:
- Allow microphone permissions when prompted
- Use HTTPS in production (required for microphone access)
- Use a supported browser (Chrome recommended)

## Project Structure

```
├── server.js              # Main server with Socket.IO integration
├── services/
│   ├── stt-factory.js     # STT service factory and management
│   ├── stt-base.js        # Base class for STT services
│   ├── deepgram-stt.js    # Deepgram implementation
│   └── google-stt.js      # Google Cloud Speech implementation
├── public/
│   └── index.html         # Frontend interface
├── deploy.sh              # Google Cloud Run deployment script
├── Dockerfile             # Container configuration
└── cloudbuild.yaml        # Cloud Build configuration
```

## Deployment

### Google Cloud Run (Recommended)

1. **Prepare for deployment:**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

2. **Configure environment variables** in the Cloud Run console:
   - `DEEPGRAM_API_KEY`: Your Deepgram API key
   - `AUTH_PASSWORD`: (Optional) Password for production access

3. **Google Cloud Speech** will use the default service account automatically

### Manual Deployment

1. **Build container:**
   ```bash
   docker build -t transcribe-app .
   ```

2. **Deploy to your preferred platform** with the required environment variables

## Environment Variables

### Required (at least one)
- `DEEPGRAM_API_KEY`: Deepgram API key for speech recognition
- `GOOGLE_APPLICATION_CREDENTIALS`: Path to Google Cloud service account key

### Optional
- `PORT`: Server port (default: 8080)
- `NODE_ENV`: Environment mode (development/production)
- `AUTH_PASSWORD`: Password protection for production deployment

## Troubleshooting

### Common Issues

- **Microphone Access Denied**: Grant microphone permissions in browser settings
- **No STT Services Available**: Verify at least one API key is configured correctly
- **Connection Errors**: Check network connectivity and API key validity
- **Poor Transcription Quality**: 
  - Use a high-quality microphone
  - Minimize background noise
  - Speak clearly and at normal pace
- **HTTPS Required**: Production deployments require HTTPS for microphone access

### Service-Specific Issues

**Deepgram:**
- Verify API key is active and has sufficient credits
- Check Deepgram service status

**Google Cloud Speech:**
- Ensure Speech-to-Text API is enabled in your project
- Verify service account has `roles/speech.client` permission
- Check credentials file path and format

## Security Considerations

- Store API keys securely using environment variables
- Use password protection for production deployments
- Implement HTTPS in production environments
- Regularly rotate API keys and passwords
- Review and limit service account permissions

## License

This project is provided as-is for educational and development purposes. 