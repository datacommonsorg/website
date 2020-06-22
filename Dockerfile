# The image is about 83 Mb in size
# https://hub.docker.com/layers/nikolaik/python-nodejs/python3.7-nodejs12-alpine/images/sha256-5f8af48c272739f56984f5e4d01ee5418406c4ac7d439dd1b672d4e04cbe29f9?context=explore
FROM nikolaik/python-nodejs:python3.7-nodejs12-alpine

COPY . /datacommons

# Python test
WORKDIR /datacommons
RUN pip install --no-cache-dir -r requirements.txt
RUN python -m pytest

WORKDIR /datacommons/tools/pv_tree_generator
RUN pip install --no-cache-dir -r requirements.txt
RUN python -m pytest

# js/ts test
WORKDIR /datacommons/static
RUN npm install
RUN npm test


