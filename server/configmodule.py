"""Module contains Flask config for production and dev environment.
"""

import os
import datetime


class Config:
    TEST = False
    WEBDRIVER = False
    CACHE_TYPE = 'simple'  # Flask-Caching related configs
    GAE_VERSION = (
        os.environ.get('GAE_VERSION') or
        datetime.datetime.today().strftime("%m-%d-%H-%M"))


class ProductionConfig(Config):
    API_PROJECT = 'datcom-mixer'
    API_ROOT = 'https://api.datacommons.org'
    GCS_BUCKET = "datcom-browser-prod.appspot.com"


class DevelopmentConfig(Config):
    API_PROJECT = 'datcom-mixer-staging'
    API_ROOT = 'https://datacommons.endpoints.datcom-mixer-staging.cloud.goog'
    GCS_BUCKET = "datcom-browser-staging.appspot.com"


class WebdriverConfig(Config):
    WEBDRIVER = True
    API_PROJECT = 'datcom-mixer-staging'
    API_ROOT = 'https://datacommons.endpoints.datcom-mixer-staging.cloud.goog'
    GCS_BUCKET = ""


class TestConfig(Config):
    TEST = True
    API_PROJECT = 'api-project'
    API_ROOT = 'api-root'
    GCS_BUCKET = 'gcs-bucket'
