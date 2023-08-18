#!/bin/sh

npm run build
cd deploy
rm -rf dist/
cp -R ../dist ./
gcloud app deploy ./app.yaml  --project dwnoble
