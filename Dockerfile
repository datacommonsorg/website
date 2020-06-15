FROM nikolaik/python-nodejs:latest

WORKDIR /datacommons
COPY . /datacommons

# Python test
RUN pip install --no-cache-dir -r requirements.txt
RUN python -m pytest

# js/ts test
WORKDIR /datacommons/static
RUN npm install
RUN npm test