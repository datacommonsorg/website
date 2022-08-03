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
    # Whether to have account management page
    ADMIN = False
    # The GCP project of the mixer which Flask talks to. This only needs to
    # be set for local development. Website deployed to GKE bundles the mixer
    # as a private service accessible via localhost.
    API_PROJECT = ''


class ProductionConfig(Config):
    GA_ACCOUNT = 'UA-117119267-1'
    ENABLE_BLOCKLIST = True


class StagingConfig(Config):
    GA_ACCOUNT = 'UA-117119267-2'
    ENABLE_BLOCKLIST = True
    pass


class AutopushConfig(Config):
    GA_ACCOUNT = 'G-Y6ZXZ9JK3H'
    ADMIN = True
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


class StanfordConfig(PrivateConfig):
    NAME = "Stanford"
    ENV_NAME = 'STANFORD'
    # BASE_HTML_PATH = 'private_dc/feedingamerica/base.html'


class TidalConfig(PrivateConfig):
    NAME = "Tidal"


class IitmConfig(Config):
    IITM = True
    NAME = "IITM"
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


class LocalBaseConfig(Config):
    LOCAL = True
    API_ROOT = 'https://autopush.api.datacommons.org'
    RECON_API_ROOT = 'https://autopush.recon.datacommons.org'
    API_PROJECT = 'datcom-mixer-autopush'
    AI_CONFIG_PATH = os.path.abspath(
        os.path.join(os.path.curdir, '..', 'deploy/overlays/local/ai.yaml'))
    SCHEME = 'http'


class LocalConfig(LocalBaseConfig):
    SECRET_PROJECT = 'datcom-website-dev'
    ADMIN = True


class LocalLiteConfig(LocalBaseConfig):
    LITE = True


class LocalIitmConfig(LocalConfig):
    SECRET_PROJECT = 'datcom-website-dev'
    IITM = True


class LocalPrivateConfig(LocalBaseConfig, PrivateConfig):
    # This needs to talk to local mixer that is setup as a private mixer, which
    # loads csv + tmcf files from GCS
    API_ROOT = 'https://mixer.endpoints.datcom-mixer-statvar.cloud.goog'
    API_PROJECT = 'datcom-mixer-statvar'
    SECRET_PROJECT = 'datcom-website-private'


class LocalFeedingamericaConfig(LocalBaseConfig, PrivateConfig):
    # This needs to talk to local mixer that is setup as a private mixer, which
    # loads csv + tmcf files from GCS
    API_ROOT = 'https://mixer.endpoints.datcom-mixer-statvar.cloud.goog'
    API_PROJECT = 'datcom-mixer-statvar'
    SECRET_PROJECT = 'datcom-feedingamerica'
    NAME = "Feeding America"
    ENV_NAME = 'FEEDINGAMERICA'
    BASE_HTML_PATH = 'private_dc/feedingamerica/base.html'


class LocalStanfordConfig(LocalBaseConfig, PrivateConfig):
    # This needs to talk to local mixer that is setup as a private mixer, which
    # loads csv + tmcf files from GCS
    API_ROOT = 'https://mixer.endpoints.datcom-mixer-statvar.cloud.goog'
    API_PROJECT = 'datcom-mixer-statvar'
    SECRET_PROJECT = 'datcom-stanford'
    NAME = "Stanford"
    ENV_NAME = 'STANFORD'
    # BASE_HTML_PATH = 'private_dc/stanford/base.html'


class WebdriverConfig(Config):
    WEBDRIVER = True
    SECRET_PROJECT = 'datcom-website-dev'
    API_ROOT = 'https://autopush.api.datacommons.org'
    RECON_API_ROOT = 'https://autopush.recon.datacommons.org'
    API_PROJECT = 'datcom-mixer-autopush'
    AI_CONFIG_PATH = None  # No models in this configuration.
    SCHEME = 'http'


class TestConfig(Config):
    TEST = True
    API_ROOT = 'api-root'
    SCHEME = 'http'
