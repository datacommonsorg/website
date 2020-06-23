"""Module contains Flask config for production and dev environment.
"""

class Config:
    TEST = False
    CACHE_TYPE = 'simple'  # Flask-Caching related configs

class ProductionConfig(Config):
    API_PROJECT = 'datcom-mixer'
    API_ROOT = 'https://api.datacommons.org'
    GCS_BUCKET = "datcom-browser-prod.appspot.com"

class DevelopmentConfig(Config):
    API_PROJECT = 'datcom-mixer-staging'
    API_ROOT = 'https://datacommons.endpoints.datcom-mixer-staging.cloud.goog'
    GCS_BUCKET = "datcom-browser-staging.appspot.com"

class TestConfig(Config):
    TEST = True
    API_PROJECT = 'api-project'
    API_ROOT = 'api-root'
    GCS_BUCKET = 'gcs-bucket'