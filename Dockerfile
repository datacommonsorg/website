FROM node:12-slim
COPY . /website

# test, build client side code
WORKDIR /website/static
RUN npm install --only=production
# RUN npm run-script test
RUN npm run-script build

# test and build server side code
FROM python:3.7-slim
COPY . /website

WORKDIR /website
RUN pip install -r requirements.txt

# Python test
# ENV FLASK_ENV="test"
# RUN python -m pytest

# Run the web service on container startup.
ENV FLASK_ENV="production"
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 main:app