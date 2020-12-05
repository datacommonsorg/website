# Build client side code
FROM node:15-slim AS node
WORKDIR /website
COPY go/ /website/go/
COPY static/package.json /website/static/package.json
COPY static/package-lock.json /website/static/package-lock.json

WORKDIR /website/static
RUN npm install
COPY static/ /website/static/
RUN npm run-script build


# Build server side code
FROM python:3.7
WORKDIR /website
COPY --from=node /website/ /website/
COPY server/requirements.txt /website/server/requirements.txt
RUN pip3 install -r /website/server/requirements.txt
COPY server/ /website/server/

# Run the web service on container startup.
WORKDIR /website/server
CMD exec gunicorn --bind :8080 --workers 1 --threads 8 --timeout 0 main:app