#!/bin/bash

# Google Cloud Run Deployment Script
echo "🚀 Starting Google Cloud Run deployment..."

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud CLI is not installed. Please install it first."
    echo "Visit: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Set your project ID (replace with your actual project ID)
read -p "Enter your Google Cloud Project ID: " PROJECT_ID
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Build and deploy
echo "🏗️ Building and deploying to Cloud Run..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/transcribe-app

# Deploy to Cloud Run
echo "🌍 Deploying to Cloud Run..."
gcloud run deploy transcribe-app \
    --image gcr.io/$PROJECT_ID/transcribe-app \
    --platform managed \
    --region us-west2 \
    --allow-unauthenticated \
    --port 8080

echo "✅ Deployment completed!"
echo "📝 Don't forget to set your DEEPGRAM_API_KEY environment variable in the Cloud Run console!" 