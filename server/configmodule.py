"""Module contains Flask config for production and dev environment.
"""

import os
import datetime


class Config:
    TEST = False
    WEBDRIVER = False
    DEVELOPMENT = False
    CACHE_TYPE = 'simple'  # Flask-Caching related configs
    GAE_VERSION = (os.environ.get('GAE_VERSION') or
                   datetime.datetime.today().strftime("%m-%d-%H-%M"))
    GA_ACCOUNT = ''


class ProductionConfig(Config):
    PROJECT = 'factcheck-sandbox'
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


class MinikubeConfig(Config):
    DEVELOPMENT = True
    PROJECT = 'datcom-browser-staging'
    API_PROJECT = 'datcom-mixer-staging'
    API_ROOT = 'http://127.0.0.1:8081'  # Port for Kubernetes ESP.


class GKEConfig(Config):
    PROJECT = 'datcom-browser-staging'
    API_PROJECT = 'datcom-mixer-staging'
    API_ROOT = 'http://127.0.0.1:8081'  # Port for Kubernetes ESP.


class WebdriverConfig(Config):
    WEBDRIVER = True
    PROJECT = 'datcom-browser-staging'
    API_PROJECT = 'datcom-mixer-staging'
    API_ROOT = 'https://datacommons.endpoints.datcom-mixer-staging.cloud.goog'
    GCS_BUCKET = ''


class TestConfig(Config):
    TEST = True
    API_PROJECT = 'api-project'
    API_ROOT = 'api-root'
    GCS_BUCKET = 'gcs-bucket'
