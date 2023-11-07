#!/bin/sh

# Builds app and deploys to https://datcom-un-sdg.ue.r.appspot.com/

# Build frontend application
npm install
npm run build
cp -R dist deploy/
cd deploy

# Deploy to Google App Engine
gcloud app deploy ./app.yaml  --project datcom-commerce
