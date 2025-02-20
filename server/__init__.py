# Copyright 2023 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import json
import logging
import os

from flask import Flask
from flask import g
from flask import redirect
from flask import request
from flask_babel import Babel
import flask_cors
from google.cloud import secretmanager
import google.cloud.logging

from server.lib import topic_cache
import server.lib.cache as lib_cache
import server.lib.config as lib_config
from server.lib.disaster_dashboard import get_disaster_dashboard_data
import server.lib.i18n as i18n
from server.lib.nl.common.bad_words import EMPTY_BANNED_WORDS
from server.lib.nl.common.bad_words import load_bad_words
from server.lib.nl.detection import llm_prompt
import server.lib.util as libutil
import server.services.bigtable as bt
from server.services.discovery import configure_endpoints_from_ingress
from server.services.discovery import get_health_check_urls
from shared.lib import gcp as lib_gcp
from shared.lib import utils as lib_utils

BLOCKLIST_SVG_FILE = "/datacommons/svg/blocklist_svg.json"

DEFAULT_NL_ROOT = "http://127.0.0.1:6060"


def _get_api_key(env_keys=[], gcp_project='', gcp_path=''):
  """Gets an api key first from the environment, then from GCP secrets.
  
  Args:
      env_keys: A list of keys in the environment to try getting the api key with
      gcp_project: The GCP project to use to get the api key from GCP secrets
      gcp_path: The path to getting the api key from GCP secrets

  Returns:
      API key if it exists
  
  TODO: use this method everywhere else in this file
  """
  # Try to get the key from the environment
  for k in env_keys:
    if os.environ.get(k):
      return os.environ.get(k)

  # Try to get the key from secrets
  if gcp_project and gcp_path:
    secret_client = secretmanager.SecretManagerServiceClient()
    secret_name = secret_client.secret_version_path(gcp_project, gcp_path,
                                                    'latest')
    secret_response = secret_client.access_secret_version(name=secret_name)
    return secret_response.payload.data.decode('UTF-8').replace('\n', '')

  # If key is not found, return an empty string
  return ''


def _enable_datagemma() -> bool:
  """Returns whether to enable the DataGemma UI for this instance. 
  This UI should only be enabled for internal instances.
  """
  return os.environ.get('ENABLE_DATAGEMMA') == 'true'


def _enable_experiments() -> bool:
  """Returns whether to enable the Data Commons experiments for the instance. 
  This includes the Biomed NL experiments.
  """
  return os.environ.get('ENABLE_EXPERIMENTS') == 'true'


def register_routes_base_dc(app):
  # apply the blueprints for all apps
  from server.routes.dev import html as dev_html
  app.register_blueprint(dev_html.bp)

  from server.routes.import_wizard import html as import_wizard_html
  app.register_blueprint(import_wizard_html.bp)

  from server.routes.place_list import html as place_list_html
  app.register_blueprint(place_list_html.bp)

  from server.routes import redirects
  app.register_blueprint(redirects.bp)

  from server.routes.screenshot import html as screenshot_html
  app.register_blueprint(screenshot_html.bp)

  from server.routes.special_announcement import \
      html as special_announcement_html
  app.register_blueprint(special_announcement_html.bp)

  from server.routes.topic_page import html as topic_page_html
  app.register_blueprint(topic_page_html.bp)

  from server.routes.import_detection import detection as detection_api
  app.register_blueprint(detection_api.bp)

  from server.routes.disaster import api as disaster_api
  app.register_blueprint(disaster_api.bp)


def register_routes_biomedical_dc(app):
  # Apply the blueprints specific to biomedical dc
  from server.routes.biomedical import html as bio_html
  app.register_blueprint(bio_html.bp)

  from server.routes.disease import api as disease_api
  app.register_blueprint(disease_api.bp)

  from server.routes.disease import html as disease_html
  app.register_blueprint(disease_html.bp)

  from server.routes.protein import api as protein_api
  app.register_blueprint(protein_api.bp)

  from server.routes.protein import html as protein_html
  app.register_blueprint(protein_html.bp)


def register_routes_disasters(app):
  # Install blueprints specific to disasters
  from server.routes.disaster import html as disaster_html
  app.register_blueprint(disaster_html.bp)

  from server.routes.event import html as event_html
  app.register_blueprint(event_html.bp)

  if app.config['TEST']:
    return

  # load disaster dashboard configs
  app.config[
      'DISASTER_DASHBOARD_CONFIG'] = libutil.get_disaster_dashboard_config()
  app.config['DISASTER_EVENT_CONFIG'] = libutil.get_disaster_event_config()

  if app.config['INTEGRATION']:
    return

  # load disaster json data
  if os.environ.get('ENABLE_DISASTER_JSON') == 'true':
    disaster_dashboard_data = get_disaster_dashboard_data(
        app.config['GCS_BUCKET'])
    app.config['DISASTER_DASHBOARD_DATA'] = disaster_dashboard_data


def register_routes_sustainability(app):
  # Install blueprint for sustainability page
  from server.routes.sustainability import html as sustainability_html
  app.register_blueprint(sustainability_html.bp)
  if app.config['TEST']:
    return
  # load sustainability config
  app.config[
      'DISASTER_SUSTAINABILITY_CONFIG'] = libutil.get_disaster_sustainability_config(
      )


def register_routes_datagemma(app, cfg):
  # Install blueprint for DataGemma page
  from server.routes.dev_datagemma import api as dev_datagemma_api
  app.register_blueprint(dev_datagemma_api.bp)
  from server.routes.dev_datagemma import html as dev_datagemma_html
  app.register_blueprint(dev_datagemma_html.bp)

  # Set the gemini api key
  app.config['GEMINI_API_KEY'] = _get_api_key(['GEMINI_API_KEY'],
                                              cfg.SECRET_PROJECT,
                                              'gemini-api-key')
  # Set the DC NL api key
  app.config['DC_NL_API_KEY'] = _get_api_key(['DC_NL_API_KEY'],
                                             cfg.SECRET_PROJECT,
                                             'dc-nl-api-key')


def register_routes_experiments(app, cfg):
  # Install blueprint for Biomed NL experiment
  from server.routes.experiments.biomed_nl import api as biomed_nl_api
  app.register_blueprint(biomed_nl_api.bp)


def register_routes_common(app):
  # apply blueprints for main app
  from server.routes import static
  app.register_blueprint(static.bp)

  from server.routes.browser import html as browser_html
  app.register_blueprint(browser_html.bp)

  from server.routes.factcheck import html as factcheck_html
  app.register_blueprint(factcheck_html.bp)

  from server.routes.explore import html as explore_html
  app.register_blueprint(explore_html.bp)

  from server.routes.nl import html as nl_html
  app.register_blueprint(nl_html.bp)

  from server.routes.place import html as place_html
  app.register_blueprint(place_html.bp)

  from server.routes.dev_place import api as dev_place_api
  app.register_blueprint(dev_place_api.bp)

  from server.routes.ranking import html as ranking_html
  app.register_blueprint(ranking_html.bp)

  from server.routes.search import html as search_html
  app.register_blueprint(search_html.bp)

  from server.routes.tools import html as tools_html
  app.register_blueprint(tools_html.bp)

  # TODO: Extract more out to base_dc
  from server.routes.browser import api as browser_api
  app.register_blueprint(browser_api.bp)

  from server.routes.place import api as place_api
  app.register_blueprint(place_api.bp)

  from server.routes.ranking import api as ranking_api
  app.register_blueprint(ranking_api.bp)

  from server.routes.nl import api as nl_api
  app.register_blueprint(nl_api.bp)

  from server.routes.explore import api as explore_api
  app.register_blueprint(explore_api.bp)

  from server.routes.shared_api import choropleth as shared_choropleth
  app.register_blueprint(shared_choropleth.bp)

  from server.routes.shared_api import csv as shared_csv
  app.register_blueprint(shared_csv.bp)

  from server.routes.shared_api import facets as shared_facets
  app.register_blueprint(shared_facets.bp)

  from server.routes.shared_api import node as shared_node
  app.register_blueprint(shared_node.bp)

  from server.routes.shared_api import place as shared_place
  app.register_blueprint(shared_place.bp)

  from server.routes.shared_api import stats as shared_stats
  app.register_blueprint(shared_stats.bp)

  from server.routes.shared_api.autocomplete import \
      autocomplete as shared_autocomplete
  app.register_blueprint(shared_autocomplete.bp)

  from server.routes.shared_api import variable as shared_variable
  app.register_blueprint(shared_variable.bp)

  from server.routes.shared_api import variable_group as shared_variable_group
  app.register_blueprint(shared_variable_group.bp)

  from server.routes.shared_api.observation import date as observation_date
  app.register_blueprint(observation_date.bp)

  from server.routes.shared_api.observation import \
      existence as observation_existence
  app.register_blueprint(observation_existence.bp)

  from server.routes.shared_api.observation import point as observation_point
  app.register_blueprint(observation_point.bp)

  from server.routes.shared_api.observation import series as observation_series
  app.register_blueprint(observation_series.bp)

  # register OEmbed blueprints
  from server.routes.oembed import chart as oembed_chart
  app.register_blueprint(oembed_chart.bp)

  from server.routes.oembed import oembed as oembed
  app.register_blueprint(oembed.bp)


def create_app(nl_root=DEFAULT_NL_ROOT):
  app = Flask(__name__, static_folder='dist', static_url_path='')

  cfg = lib_config.get_config()

  if lib_gcp.in_google_network() and not lib_utils.is_test_env():
    client = google.cloud.logging.Client()
    client.setup_logging()
  else:
    logging.basicConfig(
        level=logging.INFO,
        format=
        "[%(asctime)s][%(levelname)-8s][%(filename)s:%(lineno)s] %(message)s ",
        datefmt="%H:%M:%S",
    )

  log_level = logging.WARNING
  if lib_utils.is_debug_mode():
    log_level = logging.INFO
  logging.getLogger('werkzeug').setLevel(log_level)

  # Setup flask config
  app.config.from_object(cfg)

  # Check DC_API_KEY is set for local dev.
  if cfg.CUSTOM and cfg.LOCAL and not os.environ.get('DC_API_KEY'):
    raise Exception(
        'Set environment variable DC_API_KEY for local custom DC development')

  # Use NL_SERVICE_ROOT if it's set, otherwise use nl_root argument
  app.config['NL_ROOT'] = os.environ.get("NL_SERVICE_ROOT_URL", nl_root)

  lib_cache.cache.init_app(app)
  lib_cache.model_cache.init_app(app)

  # Configure ingress
  # See deployment yamls.
  ingress_config_path = os.environ.get('INGRESS_CONFIG_PATH')
  if ingress_config_path:
    configure_endpoints_from_ingress(ingress_config_path)

  if os.environ.get('FLASK_ENV') == 'biomedical':
    register_routes_biomedical_dc(app)

  register_routes_common(app)
  register_routes_base_dc(app)

  if cfg.SHOW_DISASTER:
    register_routes_disasters(app)

  if cfg.SHOW_SUSTAINABILITY:
    register_routes_sustainability(app)

  if _enable_datagemma():
    register_routes_datagemma(app, cfg)

  if _enable_experiments():
    register_routes_experiments(app, cfg)

  # Load topic page config
  topic_page_configs = libutil.get_topic_page_config()
  app.config['TOPIC_PAGE_CONFIG'] = topic_page_configs
  app.config['TOPIC_PAGE_SUMMARY'] = libutil.get_topics_summary(
      topic_page_configs)

  # Load chart config
  chart_config = libutil.get_chart_config()
  app.config['CHART_CONFIG'] = chart_config
  ranked_statvars = set()
  for chart in chart_config:
    ranked_statvars = ranked_statvars.union(
        chart['statsVars']) if 'statsVars' in chart else ranked_statvars
    ranked_statvars = ranked_statvars.union(
        chart['variables']) if 'variables' in chart else ranked_statvars
    if 'relatedChart' in chart and 'denominator' in chart['relatedChart']:
      ranked_statvars.add(chart['relatedChart']['denominator'])
  app.config['RANKED_STAT_VARS'] = ranked_statvars
  app.config['CACHED_GEOJSONS'] = libutil.get_cached_geojsons()
  app.config['HOMEPAGE_TOPICS'] = libutil.get_json(
      "config/home_page/topics.json")
  app.config['HOMEPAGE_PARTNERS'] = libutil.get_json(
      "config/home_page/partners.json")
  app.config['HOMEPAGE_SAMPLE_QUESTIONS'] = libutil.get_json(
      "config/home_page/sample_questions.json")
  app.config['FEATURE_FLAGS'] = libutil.load_feature_flags()

  if cfg.TEST or cfg.LITE:
    app.config['MAPS_API_KEY'] = ''
  else:
    # Get the API key from environment first.
    if os.environ.get('MAPS_API_KEY'):
      app.config['MAPS_API_KEY'] = os.environ.get('MAPS_API_KEY')
    elif os.environ.get('maps_api_key'):
      app.config['MAPS_API_KEY'] = os.environ.get('maps_api_key')
    else:
      secret_client = secretmanager.SecretManagerServiceClient()
      secret_name = secret_client.secret_version_path(cfg.SECRET_PROJECT,
                                                      'maps-api-key', 'latest')
      secret_response = secret_client.access_secret_version(name=secret_name)
      app.config['MAPS_API_KEY'] = secret_response.payload.data.decode('UTF-8')

  if cfg.LOCAL:
    app.config['LOCAL'] = True

  # Need to fetch the API key for non gcp environment.
  if cfg.LOCAL or cfg.WEBDRIVER or cfg.INTEGRATION:
    # Get the API key from environment first.
    if os.environ.get('DC_API_KEY'):
      app.config['DC_API_KEY'] = os.environ.get('DC_API_KEY')
    elif os.environ.get('dc_api_key'):
      app.config['DC_API_KEY'] = os.environ.get('dc_api_key')
    else:
      secret_client = secretmanager.SecretManagerServiceClient()
      secret_name = secret_client.secret_version_path(cfg.SECRET_PROJECT,
                                                      'mixer-api-key', 'latest')
      secret_response = secret_client.access_secret_version(name=secret_name)
      app.config['DC_API_KEY'] = secret_response.payload.data.decode(
          'UTF-8').replace('\n', '')

  # Initialize translations
  babel = Babel(app, default_domain='all')
  app.config['BABEL_DEFAULT_LOCALE'] = i18n.DEFAULT_LOCALE
  app.config['BABEL_TRANSLATION_DIRECTORIES'] = 'i18n'

  # Enable the NL model.
  if os.environ.get('ENABLE_MODEL') == 'true':
    libutil.check_backend_ready([app.config['NL_ROOT'] + '/healthz'])

    # This also requires disaster and event routes.
    app.config['NL_DISASTER_CONFIG'] = libutil.get_nl_disaster_config()
    if app.config['LOG_QUERY']:
      app.config['NL_TABLE'] = bt.get_nl_table()
    else:
      app.config['NL_TABLE'] = None

    # Get the API key from environment first.
    if cfg.USE_LLM:
      app.config['LLM_PROMPT_TEXT'] = llm_prompt.get_prompts()
      if os.environ.get('LLM_API_KEY'):
        app.config['LLM_API_KEY'] = os.environ.get('LLM_API_KEY')
      else:
        secret_client = secretmanager.SecretManagerServiceClient()
        secret_name = secret_client.secret_version_path(cfg.SECRET_PROJECT,
                                                        'palm-api-key',
                                                        'latest')
        secret_response = secret_client.access_secret_version(name=secret_name)
        app.config['LLM_API_KEY'] = secret_response.payload.data.decode('UTF-8')
    app.config[
        'NL_BAD_WORDS'] = EMPTY_BANNED_WORDS if cfg.CUSTOM else load_bad_words(
        )
    app.config['NL_CHART_TITLES'] = libutil.get_nl_chart_titles()
    app.config['TOPIC_CACHE'] = topic_cache.load(app.config['NL_CHART_TITLES'])
    app.config['SDG_PERCENT_VARS'] = libutil.get_sdg_percent_vars()
    app.config['SPECIAL_DC_NON_COUNTRY_ONLY_VARS'] = \
      libutil.get_special_dc_non_countery_only_vars()
    # TODO: need to handle singular vs plural in the titles
    app.config['NL_PROP_TITLES'] = libutil.get_nl_prop_titles()

  # Get and save the list of variables that we should not allow per capita for.
  app.config['NOPC_VARS'] = libutil.get_nl_no_percapita_vars()

  # Set custom dc template folder if set, otherwise use the environment name
  custom_dc_template_folder = app.config.get(
      'CUSTOM_DC_TEMPLATE_FOLDER', None) or app.config.get('ENV', None)

  # Get and save the blocklisted svgs.
  blocklist_svg = []
  if os.path.isfile(BLOCKLIST_SVG_FILE):
    with open(BLOCKLIST_SVG_FILE) as f:
      blocklist_svg = json.load(f) or []
  else:
    blocklist_svg = ["dc/g/Uncategorized", "oecd/g/OECD"]
  app.config['BLOCKLIST_SVG'] = blocklist_svg

  # Set whether to filter stat vars with low geographic coverage in the
  # map and scatter tools.
  app.config['MIN_STAT_VAR_GEO_COVERAGE'] = cfg.MIN_STAT_VAR_GEO_COVERAGE

  if not cfg.TEST:
    urls = get_health_check_urls()
    libutil.check_backend_ready(urls)

  # Add variables to the per-request global context.
  @app.before_request
  def before_request():
    # Add the request locale.
    requested_locale = request.args.get('hl', i18n.DEFAULT_LOCALE)
    g.locale_choices = i18n.locale_choices(requested_locale)
    g.locale = g.locale_choices[0]
    # Add commonly used config flags.
    g.env = app.config.get('ENV', None)
    g.custom = app.config.get('CUSTOM', False)
    g.custom_dc_template_folder = custom_dc_template_folder

    scheme = request.headers.get('X-Forwarded-Proto')
    if scheme and scheme == 'http' and request.url.startswith('http://'):
      url = request.url.replace('http://', 'https://', 1)
      code = 301
      return redirect(url, code=code)

  @babel.localeselector
  def get_locale():
    return g.locale

  # Propagate hl parameter to all links (if not 'en')
  @app.url_defaults
  def add_language_code(endpoint, values):
    if 'hl' in values or g.locale == i18n.DEFAULT_LOCALE:
      return
    values['hl'] = g.locale

  # Provides locale and other common parameters in all templates
  @app.context_processor
  def inject_common_parameters():
    common_variables = {
        #TODO: replace HEADER_MENU with V2
        'HEADER_MENU':
            json.dumps(libutil.get_json("config/base/header.json")),
        'FOOTER_MENU':
            json.dumps(libutil.get_json("config/base/footer.json")),
        'HEADER_MENU_V2':
            json.dumps(libutil.get_json("config/base/header_v2.json")),
    }
    locale_variable = dict(locale=get_locale())
    return {**common_variables, **locale_variable}

  @app.teardown_request
  def log_unhandled(e):
    if e is not None:
      app.logger.error('Error thrown for request: %s\nerror: %s', request.url,
                       e)

  # Attempt to retrieve the Google Analytics Tag ID (GOOGLE_ANALYTICS_TAG_ID):
  # 1. First, check the environment variables for 'GOOGLE_ANALYTICS_TAG_ID'.
  # 2. If not found, fallback to the application configuration ('GOOGLE_ANALYTICS_TAG_ID' in app.config).
  # 3. If still not found, fallback to the deprecated application configuration ('GA_ACCOUNT' in app.config).
  config_deprecated_ga_account = app.config['GA_ACCOUNT']
  if config_deprecated_ga_account:
    logging.warn(
        "Use of GA_ACCOUNT is deprecated. Use the GOOGLE_ANALYTICS_TAG_ID environment variable instead."
    )
  config_google_analytics_tag_id = app.config['GOOGLE_ANALYTICS_TAG_ID']
  google_analytics_tag_id = os.environ.get(
      'GOOGLE_ANALYTICS_TAG_ID', config_google_analytics_tag_id or
      config_deprecated_ga_account)

  # Jinja env
  app.jinja_env.globals['GOOGLE_ANALYTICS_TAG_ID'] = google_analytics_tag_id
  app.jinja_env.globals['NAME'] = app.config['NAME']
  app.jinja_env.globals['LOGO_PATH'] = app.config['LOGO_PATH']
  app.jinja_env.globals['LOGO_WIDTH'] = app.config['LOGO_WIDTH']
  app.jinja_env.globals['OVERRIDE_CSS_PATH'] = app.config['OVERRIDE_CSS_PATH']
  app.secret_key = os.urandom(24)

  app.jinja_env.globals['BASE_HTML'] = 'base.html'
  if cfg.CUSTOM:
    custom_path = os.path.join('custom_dc', custom_dc_template_folder,
                               'base.html')
    if os.path.exists(os.path.join(app.root_path, 'templates', custom_path)):
      app.jinja_env.globals['BASE_HTML'] = custom_path
    else:
      app.jinja_env.globals['BASE_HTML'] = os.path.join('custom_dc/custom',
                                                        'base.html')
  flask_cors.CORS(app)
  return app
