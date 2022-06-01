"""Module contains Flask config for production and dev environment.
"""
# NOTE: update server/lib/config.py when adding/removing config.

import os


class Config:
    TEST = False
    WEBDRIVER = False
    LOCAL = False
    LITE = False
    VERSION = '{}-{}'.format(os.environ.get('WEBSITE_HASH'),
                             os.environ.get('MIXER_HASH'))
    API_ROOT = 'http://127.0.0.1:8081'  # Port for Kubernetes ESP.
    RECON_API_ROOT = 'http://127.0.0.1:8081'
    AI_CONFIG_PATH = '/datacommons/ai/ai.yaml'
    SECRET_PROJECT = os.environ.get('SECRET_PROJECT') or ''
    MAPS_API_KEY = os.environ.get('MAPS_API_KEY') or ''
    GA_ACCOUNT = ''
    SCHEME = 'https'
    # Additional stat vars that need to be fetched for place page data.
    # This is only needed for local development when cache is not up to date.
    NEW_STAT_VARS = []
    ENABLE_BLOCKLIST = False
    # A constant to group a set of configs.
    ENV_NAME = 'BASE_DC'
    # If the deployment is a private instance.
    PRIVATE = False
    # Name of the site. The name is changed for private instance.
    NAME = 'Data Commons'
    BASE_HTML_PATH = 'base.html'


class ProductionConfig(Config):
    GA_ACCOUNT = 'UA-117119267-1'
    ENABLE_BLOCKLIST = True


class StagingConfig(Config):
    GA_ACCOUNT = 'UA-117119267-2'
    ENABLE_BLOCKLIST = True
    pass


class AutopushConfig(Config):
    pass


class DevConfig(Config):
    pass


class PrivateConfig(Config):
    PRIVATE = True
    ENV_NAME = 'PRIVATE'


class FeedingamericaConfig(PrivateConfig):
    NAME = "Feeding America"
    ENV_NAME = 'FEEDINGAMERICA'
    BASE_HTML_PATH = 'private_dc/feedingamerica/base.html'
    GA_ACCOUNT = 'G-444S6716SQ'


class TidalConfig(PrivateConfig):
    NAME = "Tidal"


class IitmConfig(Config):
    # IITM = True
    NAME = 'IITM'
    GA_ACCOUNT = 'G-32HPL4K4Y1'
    ENV_NAME = 'IITM'


######
#
# All the config below runs as non-GKE deployment, hence needs to set fields
# like  `SECRET_PROJECT`
#
#####


class MinikubeConfig(Config):
    LOCAL = True
    SCHEME = 'http'


class LocalConfig(Config):
    LOCAL = True
    SECRET_PROJECT = 'datcom-website-dev'
    API_ROOT = 'https://autopush.api.datacommons.org'
    RECON_API_ROOT = 'https://autopush.recon.datacommons.org'
    AI_CONFIG_PATH = os.path.abspath(
        os.path.join(os.path.curdir, '..', 'deploy/overlays/local/ai.yaml'))
    SCHEME = 'http'


class LocalIitmConfig(LocalConfig):
    IITM = True
    ENV_NAME = 'IITM'


class LocalPrivateConfig(PrivateConfig):
    # This needs to talk to local mixer that is setup as a private mixer, which
    # loads csv + tmcf files from GCS
    API_ROOT = 'https://mixer.endpoints.datcom-mixer-statvar.cloud.goog'
    RECON_API_ROOT = 'https://autopush.recon.datacommons.org'
    AI_CONFIG_PATH = os.path.abspath(
        os.path.join(os.path.curdir, '..', 'deploy/overlays/local/ai.yaml'))
    LOCAL = True
    SECRET_PROJECT = 'datcom-website-private'
    SCHEME = 'http'


class LocalFeedingamericaConfig(PrivateConfig):
    # This needs to talk to local mixer that is setup as a private mixer, which
    # loads csv + tmcf files from GCS
    API_ROOT = 'https://mixer.endpoints.datcom-mixer-statvar.cloud.goog'
    RECON_API_ROOT = 'https://autopush.recon.datacommons.org'
    AI_CONFIG_PATH = os.path.abspath(
        os.path.join(os.path.curdir, '..', 'deploy/overlays/local/ai.yaml'))
    LOCAL = True
    SECRET_PROJECT = 'datcom-feedingamerica'
    NAME = "Feeding America"
    SCHEME = 'http'
    ENV_NAME = 'FEEDINGAMERICA'
    BASE_HTML_PATH = 'private_dc/feedingamerica/base.html'


class LocalLiteConfig(Config):
    LOCAL = True
    LITE = True
    API_ROOT = 'https://autopush.api.datacommons.org'
    RECON_API_ROOT = 'https://autopush.recon.datacommons.org'
    AI_CONFIG_PATH = os.path.abspath(
        os.path.join(os.path.curdir, '..', 'deploy/overlays/local/ai.yaml'))
    SCHEME = 'http'


class WebdriverConfig(Config):
    WEBDRIVER = True
    SECRET_PROJECT = 'datcom-website-dev'
    API_ROOT = 'https://autopush.api.datacommons.org'
    RECON_API_ROOT = 'https://autopush.recon.datacommons.org'
    AI_CONFIG_PATH = None  # No models in this configuration.
    SCHEME = 'http'


class TestConfig(Config):
    TEST = True
    API_ROOT = 'api-root'
    SCHEME = 'http'
