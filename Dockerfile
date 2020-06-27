FROM node:12-slim

# Test, build client side code
COPY static /website/static
WORKDIR /website/static
RUN npm install --only=production
RUN npm run-script test
RUN npm run-script build

# Test and build server side code
FROM python:3.7-slim
COPY server /website/server
WORKDIR /website/server
RUN pip install -r requirements.txt
ENV FLASK_ENV="test"
RUN python -m pytest

# Run the web service on container startup.
ENV FLASK_ENV="production"
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 main:app