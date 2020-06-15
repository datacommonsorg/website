FROM nikolaik/python-nodejs:latest

COPY . /datacommons

# Python test
WORKDIR /datacommons
RUN pip install --no-cache-dir -r requirements.txt
RUN python -m pytest

# js/ts test
WORKDIR /datacommons/static
RUN npm install
RUN npm test
