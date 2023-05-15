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
import tempfile

import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
from flask import Flask
from flask import g
from flask import redirect
from flask import request
from flask_babel import Babel
import flask_cors
from google.cloud import secretmanager
from google_auth_oauthlib.flow import Flow
from opencensus.ext.flask.flask_middleware import FlaskMiddleware
from opencensus.ext.stackdriver.trace_exporter import StackdriverExporter
from opencensus.trace.propagation import google_cloud_format
from opencensus.trace.samplers import AlwaysOnSampler
from selenium import webdriver

import server.lib.config as libconfig
from server.lib.disaster_dashboard import get_disaster_dashboard_data
import server.lib.i18n as i18n
import server.lib.util as libutil
import server.services.bigtable as bt
from server.services.discovery import configure_endpoints_from_ingress
from server.services.discovery import get_health_check_urls

propagator = google_cloud_format.GoogleCloudFormatPropagator()

BLOCKLIST_SVG_FILE = "/datacommons/svg/blocklist_svg.json"


def createMiddleWare(app, exporter):
  # Configure a flask middleware that listens for each request and applies
  # automatic tracing. This needs to be set up before the application starts.
  middleware = FlaskMiddleware(app,
                               exporter=exporter,
                               propagator=propagator,
                               sampler=AlwaysOnSampler())
  return middleware


def register_routes_base_dc(app):
  # apply the blueprints for all apps
  from server.routes.dev import html as dev_html
  app.register_blueprint(dev_html.bp)

  from server.routes.disease import html as disease_html
  app.register_blueprint(disease_html.bp)

  from server.routes.import_wizard import html as import_wizard_html
  app.register_blueprint(import_wizard_html.bp)

  from server.routes.place_list import html as place_list_html
  app.register_blueprint(place_list_html.bp)

  from server.routes.protein import html as protein_html
  app.register_blueprint(protein_html.bp)

  from server.routes import redirects
  app.register_blueprint(redirects.bp)

  from server.routes.special_announcement import \
      html as special_announcement_html
  app.register_blueprint(special_announcement_html.bp)

  from server.routes.topic_page import html as topic_page_html
  app.register_blueprint(topic_page_html.bp)

  from server.routes.disease import api as disease_api
  app.register_blueprint(disease_api.bp)

  from server.routes.protein import api as protein_api
  app.register_blueprint(protein_api.bp)

  from server.routes.import_detection import detection as detection_api
  app.register_blueprint(detection_api.bp)


def register_routes_custom_dc(app):
  ## apply the blueprints for custom dc instances
  pass


def register_routes_disasters(app):
  # Install blueprints specific to Stanford DC
  from server.routes.disaster import html as disaster_html
  app.register_blueprint(disaster_html.bp)

  from server.routes.event import html as event_html
  app.register_blueprint(event_html.bp)

  from server.routes.sustainability import html as sustainability_html
  app.register_blueprint(sustainability_html.bp)

  from server.routes.disaster import api as disaster_api
  app.register_blueprint(disaster_api.bp)

  if app.config['TEST']:
    return

  # load disaster dashboard configs
  app.config[
      'DISASTER_DASHBOARD_CONFIG'] = libutil.get_disaster_dashboard_config()
  app.config['DISASTER_EVENT_CONFIG'] = libutil.get_disaster_event_config()
  app.config[
      'DISASTER_SUSTAINABILITY_CONFIG'] = libutil.get_disaster_sustainability_config(
      )

  if app.config['INTEGRATION']:
    return

  # load disaster json data
  if os.environ.get('ENABLE_DISASTER_JSON') == 'true':
    disaster_dashboard_data = get_disaster_dashboard_data(
        app.config['GCS_BUCKET'])
    app.config['DISASTER_DASHBOARD_DATA'] = disaster_dashboard_data


def register_routes_admin(app):
  from server.routes.user import html as user_html
  app.register_blueprint(user_html.bp)
  from server.routes.user import api as user_api
  app.register_blueprint(user_api.bp)


def register_routes_common(app):
  # apply the blueprints for main app
  from server.routes import static
  app.register_blueprint(static.bp)

  from server.routes.browser import html as browser_html
  app.register_blueprint(browser_html.bp)

  from server.routes.factcheck import html as factcheck_html
  app.register_blueprint(factcheck_html.bp)

  from server.routes.nl import html as nl_html
  app.register_blueprint(nl_html.bp)

  from server.routes.place import html as place_html
  app.register_blueprint(place_html.bp)

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

  from server.routes.translator import api as translator_api
  app.register_blueprint(translator_api.bp)

  from server.routes.nl import api as nl_api
  app.register_blueprint(nl_api.bp)

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


def create_app():
  app = Flask(__name__, static_folder='dist', static_url_path='')

  # Setup flask config
  cfg = libconfig.get_config()
  app.config.from_object(cfg)

  # Init extentions
  from server.cache import cache

  # For some instance with fast updated data, we may not want to use memcache.
  if app.config['USE_MEMCACHE']:
    cache.init_app(app)
  else:
    cache.init_app(app, {'CACHE_TYPE': 'NullCache'})

  # Configure ingress
  ingress_config_path = os.environ.get(
      'INGRESS_CONFIG_PATH')  # See deployment yamls.
  if ingress_config_path:
    configure_endpoints_from_ingress(ingress_config_path)

  register_routes_common(app)
  if cfg.CUSTOM:
    register_routes_custom_dc(app)

  register_routes_base_dc(app)
  if cfg.SHOW_DISASTER or os.environ.get('ENABLE_MODEL') == 'true':
    # disaster dashboard tests require stanford's routes to be registered.
    register_routes_disasters(app)

  if cfg.ADMIN:
    register_routes_admin(app)
    cred = credentials.ApplicationDefault()
    firebase_admin.initialize_app(cred)
    user_db = firestore.client()
    app.config['USER_DB'] = user_db

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
    ranked_statvars = ranked_statvars.union(chart['statsVars'])
    if 'relatedChart' in chart and 'denominator' in chart['relatedChart']:
      ranked_statvars.add(chart['relatedChart']['denominator'])
  app.config['RANKED_STAT_VARS'] = ranked_statvars
  app.config['CACHED_GEOJSONS'] = libutil.get_cached_geojsons()

  if cfg.TEST or cfg.LITE:
    app.config['MAPS_API_KEY'] = ''
  else:
    # Get the API key from environment first.
    if os.environ.get('MAPS_API_KEY'):
      app.config['MAPS_API_KEY'] = os.environ.get('MAPS_API_KEY')
    else:
      secret_client = secretmanager.SecretManagerServiceClient()
      secret_name = secret_client.secret_version_path(cfg.SECRET_PROJECT,
                                                      'maps-api-key', 'latest')
      secret_response = secret_client.access_secret_version(name=secret_name)
      app.config['MAPS_API_KEY'] = secret_response.payload.data.decode('UTF-8')

  if cfg.ADMIN:
    secret_client = secretmanager.SecretManagerServiceClient()
    secret_name = secret_client.secret_version_path(cfg.SECRET_PROJECT,
                                                    'oauth-client', 'latest')
    secret_response = secret_client.access_secret_version(name=secret_name)
    oauth_string = secret_response.payload.data.decode('UTF-8')
    oauth_json = json.loads(oauth_string)
    app.config['GOOGLE_CLIENT_ID'] = oauth_json['web']['client_id']
    tf = tempfile.NamedTemporaryFile()
    with open(tf.name, 'w') as f:
      f.write(oauth_string)
    app.config['OAUTH_FLOW'] = Flow.from_client_secrets_file(
        client_secrets_file=tf.name,
        redirect_uri=oauth_json['web']['redirect_uris'][0],
        scopes=[
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email',
            'openid',
        ])

  if cfg.LOCAL:
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

  # Need to fetch the API key for non gcp environment.
  if cfg.LOCAL or cfg.WEBDRIVER or cfg.INTEGRATION:
    # Get the API key from environment first.
    if os.environ.get('MIXER_API_KEY'):
      app.config['MIXER_API_KEY'] = os.environ.get('MIXER_API_KEY')
    else:
      secret_client = secretmanager.SecretManagerServiceClient()
      secret_name = secret_client.secret_version_path(cfg.SECRET_PROJECT,
                                                      'mixer-api-key', 'latest')
      secret_response = secret_client.access_secret_version(name=secret_name)
      app.config['MIXER_API_KEY'] = secret_response.payload.data.decode('UTF-8')

  # Initialize translations
  babel = Babel(app, default_domain='all')
  app.config['BABEL_DEFAULT_LOCALE'] = i18n.DEFAULT_LOCALE
  app.config['BABEL_TRANSLATION_DIRECTORIES'] = 'i18n'

  # Enable the NL model.
  if os.environ.get('ENABLE_MODEL') == 'true':
    libutil.check_backend_ready([app.config['NL_ROOT'] + '/healthz'])
    # Some specific imports for the NL Interface.
    import server.services.nl as nl

    nl_model = nl.Model()
    app.config['NL_MODEL'] = nl_model
    # This also requires disaster and event routes.
    app.config['NL_DISASTER_CONFIG'] = libutil.get_nl_disaster_config()
    if app.config['LOG_QUERY']:
      app.config['NL_TABLE'] = bt.get_nl_table()
    else:
      app.config['NL_TABLE'] = None

    options = webdriver.chrome.options.Options()
    options.add_argument("--headless=new")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("enable-automation")
    options.add_argument("--disable-infobars")
    options.add_argument("--disable-dev-shm-usage")
    app.config['SELENIUM'] = webdriver.Chrome(options=options)

  # Get and save the blocklisted svgs.
  blocklist_svg = []
  if os.path.isfile(BLOCKLIST_SVG_FILE):
    with open(BLOCKLIST_SVG_FILE) as f:
      blocklist_svg = json.load(f) or []
  app.config['BLOCKLIST_SVG'] = blocklist_svg

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

  # Provides locale parameter in all templates
  @app.context_processor
  def inject_locale():
    return dict(locale=get_locale())

  @app.teardown_request
  def log_unhandled(e):
    if e is not None:
      logging.error('Error thrown for request: %s, error: %s', request, e)

  # Jinja env
  app.jinja_env.globals['GA_ACCOUNT'] = app.config['GA_ACCOUNT']
  app.jinja_env.globals['NAME'] = app.config['NAME']
  app.jinja_env.globals['LOGO_PATH'] = app.config['LOGO_PATH']
  app.jinja_env.globals['OVERRIDE_CSS_PATH'] = app.config['OVERRIDE_CSS_PATH']
  app.secret_key = os.urandom(24)

  custom_path = os.path.join('custom_dc', cfg.ENV, 'base.html')
  if os.path.exists(os.path.join(app.root_path, 'templates', custom_path)):
    app.jinja_env.globals['BASE_HTML'] = custom_path
  else:
    app.jinja_env.globals['BASE_HTML'] = 'base.html'

  flask_cors.CORS(app)
  return app
