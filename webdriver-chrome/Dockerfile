FROM python:3.7-alpine

ARG VERS=87.0.4280.20

RUN echo "Building python image with chrome and chromedriver(${VERS})" && \
    apk update && \
    apk upgrade && \
    apk add --update ca-certificates && \
    # apt-get update && \
    # apt-get upgrade && \
    apk add --update build-base && \
    apk add --update libffi-dev && \
    # apk add dkpg && \
    apk add --update unzip xvfb && \
    # apk add unzip xvfb libxi6 libgconf-2-4 && \
    apk add wget && \
    # wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb && \
    apk add chromium && \
    # dpkg -i google-chrome-stable_current_amd64.deb && \
    wget https://chromedriver.storage.googleapis.com/${VERS}/chromedriver_linux64.zip && \
    unzip chromedriver_linux64.zip && \
    mv chromedriver /usr/bin/chromedriver && \
    chown root:root /usr/bin/chromedriver && \
    chmod +x /usr/bin/chromedriver

CMD ["--help"]