"""Module contains Flask config for production and dev environment.
"""

import os
import datetime


class Config:
    TEST = False
    WEBDRIVER = False
    CACHE_TYPE = 'simple'  # Flask-Caching related configs
    GAE_VERSION = (os.environ.get('GAE_VERSION') or
                   datetime.datetime.today().strftime("%m-%d-%H-%M"))


class ProductionConfig(Config):
    PROJECT = 'datcom-browser-prod'
    API_PROJECT = 'datcom-mixer'
    API_ROOT = 'https://api.datacommons.org'
    GCS_BUCKET = 'datcom-browser-prod.appspot.com'
    GA_ACCOUNT = 'UA-117119267-1'


class StagingConfig(Config):
    PROJECT = 'datcom-browser-staging'
    API_PROJECT = 'datcom-mixer-staging'
    API_ROOT = 'https://datacommons.endpoints.datcom-mixer-staging.cloud.goog'
    GCS_BUCKET = 'datcom-browser-staging.appspot.com'
    GA_ACCOUNT = 'UA-117119267-2'


class DevelopmentConfig(Config):
    DEVELOPMENT = True
    PROJECT = 'datcom-browser-staging'
    API_PROJECT = 'datcom-mixer-staging'
    API_ROOT = 'https://datacommons.endpoints.datcom-mixer-staging.cloud.goog'
    GCS_BUCKET = 'datcom-browser-staging.appspot.com'
    GA_ACCOUNT = 'UA-117119267-2'


class WebdriverConfig(Config):
    WEBDRIVER = True
    PROJECT = 'datcom-browser-staging'
    API_PROJECT = 'datcom-mixer-staging'
    API_ROOT = 'https://datacommons.endpoints.datcom-mixer-staging.cloud.goog'
    GCS_BUCKET = ''
    GA_ACCOUNT = ''


class TestConfig(Config):
    TEST = True
    API_PROJECT = 'api-project'
    API_ROOT = 'api-root'
    GCS_BUCKET = 'gcs-bucket'
    GA_ACCOUNT = ''
