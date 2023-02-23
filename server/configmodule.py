"""Module contains Flask config for production and dev environment.
"""

# NOTE: update server/lib/config.py when adding/removing config.

import os


class Config:
  TEST = False
  INTEGRATION = False
  WEBDRIVER = False
  LOCAL = False
  LITE = False
  VERSION = '{}-{}'.format(os.environ.get('WEBSITE_HASH'),
                           os.environ.get('MIXER_HASH'))
  API_ROOT = 'http://127.0.0.1:8081'  # Port for Kubernetes ESP.
  NL_ROOT = 'http://127.0.0.1:6060'  # Port for Kubernetes ESP.
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
  # If the deployment is a custom instance.
  CUSTOM = False
  # Name of the site. The name is changed for custom instance.
  NAME = 'Data Commons'
  BASE_HTML_PATH = 'base.html'
  # Whether to have account management page
  ADMIN = False
  # The GCP project of the mixer which Flask talks to. This only needs to
  # be set for local development. Website deployed to GKE bundles the mixer
  # as a custom service accessible via localhost.
  API_PROJECT = ''
  # Set this to False if the deployment has frequently updated data.
  USE_MEMCACHE = True
  # Whether to log the query (and make them avaiable in query history interface)
  # Eanbling this to "True" requires adding "bigtable/user" acccess for the
  # service account in datcom-store IAM settings
  LOG_QUERY = False


class ProductionConfig(Config):
  GA_ACCOUNT = 'UA-117119267-1'
  ENABLE_BLOCKLIST = True


class StagingConfig(Config):
  GA_ACCOUNT = 'UA-117119267-2'
  ENABLE_BLOCKLIST = True


class AutopushConfig(Config):
  GA_ACCOUNT = 'G-Y6ZXZ9JK3H'
  GCS_BUCKET = 'datcom-website-autopush-resources'
  LOG_QUERY = True


class DevConfig(Config):
  GCS_BUCKET = 'datcom-website-autopush-resources'
  LOG_QUERY = True


class CustomConfig(Config):
  CUSTOM = True
  ENV_NAME = 'CUSTOM'


class FeedingamericaConfig(CustomConfig):
  NAME = "Feeding America"
  ENV_NAME = 'FEEDINGAMERICA'
  BASE_HTML_PATH = 'custom_dc/feedingamerica/base.html'
  GA_ACCOUNT = 'G-444S6716SQ'


class StanfordConfig(CustomConfig):
  NAME = "Google Stanford Data Commons"
  ENV_NAME = 'STANFORD'
  ENABLE_BLOCKLIST = True
  BASE_HTML_PATH = 'custom_dc/stanford/base.html'
  GCS_BUCKET = 'datcom-stanford-resources'


class StanfordStagingConfig(CustomConfig):
  NAME = "Google Stanford Data Commons (Staging)"
  ENV_NAME = 'STANFORD'
  ENABLE_BLOCKLIST = True
  BASE_HTML_PATH = 'custom_dc/stanford/base.html'
  GCS_BUCKET = 'datcom-stanford-staging-resources'
  API_PROJECT = 'datcom-mixer-statvar'
  SECRET_PROJECT = 'datcom-stanford-staging'


class TidalConfig(CustomConfig):
  NAME = "Tidal"


class IitmConfig(Config):
  NAME = "IITM"
  ENV_NAME = 'IITM'
  GA_ACCOUNT = 'G-32HPL4K4Y1'
  BASE_HTML_PATH = 'custom_dc/iitm/base.html'


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
  API_PROJECT = 'datcom-mixer-autopush'
  AI_CONFIG_PATH = os.path.abspath(
      os.path.join(os.path.curdir, '..', 'deploy/overlays/local/ai.yaml'))
  SCHEME = 'http'
  GCS_BUCKET = 'datcom-website-autopush-resources'
  LOG_QUERY = True


class LocalConfig(LocalBaseConfig):
  SECRET_PROJECT = 'datcom-website-dev'


class LocalLiteConfig(LocalBaseConfig):
  LITE = True


class LocalIitmConfig(LocalConfig):
  SECRET_PROJECT = 'datcom-website-dev'
  NAME = "IITM"
  ENV_NAME = 'IITM'
  BASE_HTML_PATH = 'custom_dc/iitm/base.html'


class LocalCustomConfig(LocalBaseConfig, CustomConfig):
  # This needs to talk to local mixer that is setup as a custom mixer, which
  # loads csv + tmcf files from GCS
  API_ROOT = 'https://mixer.endpoints.datcom-mixer-statvar.cloud.goog'
  API_PROJECT = 'datcom-mixer-statvar'
  SECRET_PROJECT = 'datcom-website-private'


class LocalFeedingamericaConfig(LocalBaseConfig, CustomConfig):
  # This needs to talk to local mixer that is setup as a custom mixer, which
  # loads csv + tmcf files from GCS
  API_ROOT = 'https://mixer.endpoints.datcom-mixer-statvar.cloud.goog'
  API_PROJECT = 'datcom-mixer-statvar'
  SECRET_PROJECT = 'datcom-feedingamerica'
  NAME = "Feeding America"
  ENV_NAME = 'FEEDINGAMERICA'
  BASE_HTML_PATH = 'custom_dc/feedingamerica/base.html'


class LocalStanfordConfig(LocalBaseConfig, StanfordConfig):
  # This needs to talk to local mixer that is setup as a custom mixer, which
  # loads csv + tmcf files from GCS
  API_ROOT = 'https://mixer.endpoints.datcom-mixer-statvar.cloud.goog'
  API_PROJECT = 'datcom-mixer-statvar'
  SECRET_PROJECT = 'datcom-stanford'


class WebdriverConfig(Config):
  WEBDRIVER = True
  SECRET_PROJECT = 'datcom-website-dev'
  API_ROOT = 'https://autopush.api.datacommons.org'
  API_PROJECT = 'datcom-mixer-autopush'
  AI_CONFIG_PATH = None  # No models in this configuration.
  SCHEME = 'http'


class TestConfig(Config):
  TEST = True
  API_ROOT = 'api-root'
  SCHEME = 'http'
  USE_MEMCACHE = False


class IntegrationTestConfig(Config):
  INTEGRATION = True
  API_ROOT = 'https://autopush.api.datacommons.org'
  API_PROJECT = 'datcom-mixer-autopush'
  SCHEME = 'http'
  SECRET_PROJECT = 'datcom-website-dev'
