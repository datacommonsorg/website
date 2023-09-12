#!/bin/sh

# Builds app and deploys to https://datcom-un-sdg.ue.r.appspot.com/

# Build frontend application
cd frontend-tester/UNSD-Website-skeleton/UNSD.Website/ClientApp
npm install --legacy-peer-deps
npm run build
rm -rf ../../../../deploy/build
cp -R build ../../../../deploy/
cd ../../../../deploy/

# Deploy to Google App Engine
gcloud app deploy ./app.yaml  --project datcom-un-sdg
