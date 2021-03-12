"""Module contains Flask config for production and dev environment.
"""

# NOTE: update server/lib/config.py when adding/removing config.

import os


class Config:
    TEST = False
    WEBDRIVER = False
    DEVELOPMENT = False
    LITE = False
    # Use StatVarObs instead of PopObs data model.
    # TODO(shifucun): change this to True after setting svobs_mode=true in mixer
    # by default.
    SVOBS = False
    CACHE_TYPE = 'simple'  # Flask-Caching related configs
    VERSION = '{}-{}'.format(os.environ.get('WEBSITE_HASH'),
                             os.environ.get('MIXER_HASH'))

    API_ROOT = 'http://127.0.0.1:8081'  # Port for Kubernetes ESP.
    GCS_BUCKET = os.environ.get('GCS_BUCKET') or ''
    SECRET_PROJECT = os.environ.get('SECRET_PROJECT') or ''
    MAPS_API_KEY = os.environ.get('MAPS_API_KEY') or ''
    GA_ACCOUNT = ''
    SCHEME = 'https'


class ProductionConfig(Config):
    GA_ACCOUNT = 'UA-117119267-1'


class StagingConfig(Config):
    pass


class AutopushConfig(Config):
    pass


class SvObsConfig(Config):
    SVOBS = True


class MinikubeConfig(Config):
    DEVELOPMENT = True
    SCHEME = 'http'


class DevelopmentConfig(Config):
    DEVELOPMENT = True
    SECRET_PROJECT = 'datcom-website-dev'
    API_ROOT = 'https://autopush.api.datacommons.org'
    GCS_BUCKET = 'datcom-website-autopush-resources'
    SCHEME = 'http'


class DevelopmentLiteConfig(Config):
    DEVELOPMENT = True
    LITE = True
    API_ROOT = 'https://autopush.api.datacommons.org'
    SCHEME = 'http'


class DevelopmentSvObsConfig(Config):
    SVOBS = True
    DEVELOPMENT = True
    SECRET_PROJECT = 'datcom-website-statvar-migrate'
    API_ROOT = 'https://mixer.endpoints.datcom-mixer-statvar.cloud.goog'
    GCS_BUCKET = 'datcom-website-statvar-migrate-resources'
    SCHEME = 'http'


class WebdriverConfig(Config):
    WEBDRIVER = True
    SECRET_PROJECT = 'datcom-website-dev'
    API_ROOT = 'https://staging.api.datacommons.org'
    GCS_BUCKET = ''
    SCHEME = 'http'


class TestConfig(Config):
    TEST = True
    API_ROOT = 'api-root'
    GCS_BUCKET = 'gcs-bucket'
    SCHEME = 'http'
