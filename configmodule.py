"""Module contains Flask config for production and dev environment.
"""

class Config:
    CACHE_TYPE = 'simple'  # Flask-Caching related configs

class ProductionConfig(Config):
    DEBUG = False
    API_PROJECT = 'datcom-mixer'
    API_ROOT = 'https://api.datacommons.org'
    GCS_BUCKET = "datcom-browser-prod.appspot.com"

class DevelopmentConfig(Config):
    DEBUG = True
    API_PROJECT = 'datcom-mixer-staging'
    API_ROOT = 'https://datacommons.endpoints.datcom-mixer-staging.cloud.goog'
    GCS_BUCKET = "datcom-browser-staging.appspot.com"
