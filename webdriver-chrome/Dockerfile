FROM python:3.7-slim

ARG VERS=87.0.4280.20

RUN echo "Building python image with chrome and chromedriver(${VERS})" && \
    apt-get update && \
    apt-get upgrade && \
    apt-get install -y unzip xvfb libxi6 libgconf-2-4 build-essential libffi-dev && \
    apt-get install -y wget && \
    wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb && \
    dpkg -i google-chrome-stable_current_amd64.deb; apt-get -fy install && \
    wget https://chromedriver.storage.googleapis.com/${VERS}/chromedriver_linux64.zip && \
    unzip chromedriver_linux64.zip && \
    mv chromedriver /usr/bin/chromedriver && \
    chown root:root /usr/bin/chromedriver && \
    chmod +x /usr/bin/chromedriver

CMD ["--help"]