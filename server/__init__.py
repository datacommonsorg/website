# Copyright 2020 Google LLC
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
from google.cloud import secretmanager
from google_auth_oauthlib.flow import Flow
from opencensus.ext.flask.flask_middleware import FlaskMiddleware
from opencensus.ext.stackdriver.trace_exporter import StackdriverExporter
from opencensus.trace.propagation import google_cloud_format
from opencensus.trace.samplers import AlwaysOnSampler

import server.lib.config as libconfig
from server.lib.disaster_dashboard import get_disaster_dashboard_data
import server.lib.i18n as i18n
import server.lib.util as libutil
import server.services.ai as ai
from server.services.discovery import configure_endpoints_from_ingress
from server.services.discovery import get_health_check_urls

propagator = google_cloud_format.GoogleCloudFormatPropagator()


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
  from server.routes import dev
  from server.routes import disease
  from server.routes import import_wizard
  from server.routes import placelist
  from server.routes import protein
  from server.routes import redirects
  from server.routes import special_announcement
  from server.routes import topic_page
  app.register_blueprint(dev.bp)
  app.register_blueprint(disease.bp)
  app.register_blueprint(placelist.bp)
  app.register_blueprint(protein.bp)
  app.register_blueprint(redirects.bp)
  app.register_blueprint(special_announcement.bp)
  app.register_blueprint(topic_page.bp)

  from server.routes.api import disease as disease_api
  from server.routes.api import protein as protein_api
  from server.routes.api.import_detection import detection as detection_api
  app.register_blueprint(detection_api.bp)
  app.register_blueprint(disease_api.bp)
  app.register_blueprint(import_wizard.bp)
  app.register_blueprint(protein_api.bp)


def register_routes_custom_dc(app):
  ## apply the blueprints for custom dc instances
  pass


def register_routes_disasters(app):
  # Install blueprints specific to Stanford DC
  from server.routes import disasters
  from server.routes import event
  from server.routes import sustainability
  from server.routes.api import disaster_api
  app.register_blueprint(disasters.bp)
  app.register_blueprint(disaster_api.bp)
  app.register_blueprint(event.bp)
  app.register_blueprint(sustainability.bp)

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
  from server.routes import user
  app.register_blueprint(user.bp)
  from server.routes.api import user as user_api
  app.register_blueprint(user_api.bp)


def register_routes_common(app):
  # apply the blueprints for main app
  from server.routes import browser
  from server.routes import factcheck
  from server.routes import nl
  from server.routes import place
  from server.routes import ranking
  from server.routes import search
  from server.routes import static
  from server.routes import tools
  app.register_blueprint(browser.bp)
  app.register_blueprint(nl.bp)
  app.register_blueprint(place.bp)
  app.register_blueprint(ranking.bp)
  app.register_blueprint(search.bp)
  app.register_blueprint(static.bp)
  app.register_blueprint(tools.bp)
  # TODO: Extract more out to base_dc
  from server.routes.api import browser as browser_api
  from server.routes.api import choropleth
  from server.routes.api import csv
  from server.routes.api import facets
  from server.routes.api import landing_page
  from server.routes.api import node
  from server.routes.api import observation_dates
  from server.routes.api import observation_existence
  from server.routes.api import place as place_api
  from server.routes.api import point
  from server.routes.api import ranking as ranking_api
  from server.routes.api import series
  from server.routes.api import stats
  from server.routes.api import translator
  from server.routes.api import variable
  from server.routes.api import variable_group
  app.register_blueprint(browser_api.bp)
  app.register_blueprint(choropleth.bp)
  app.register_blueprint(csv.bp)
  app.register_blueprint(facets.bp)
  app.register_blueprint(factcheck.bp)
  app.register_blueprint(landing_page.bp)
  app.register_blueprint(node.bp)
  app.register_blueprint(observation_dates.bp)
  app.register_blueprint(observation_existence.bp)
  app.register_blueprint(place_api.bp)
  app.register_blueprint(point.bp)
  app.register_blueprint(ranking_api.bp)
  app.register_blueprint(series.bp)
  app.register_blueprint(stats.bp)
  app.register_blueprint(translator.bp)
  app.register_blueprint(variable.bp)
  app.register_blueprint(variable_group.bp)


def create_app():
  app = Flask(__name__, static_folder='dist', static_url_path='')

  if os.environ.get('FLASK_ENV') in ['production', 'staging', 'autopush']:
    createMiddleWare(app, StackdriverExporter())
    import googlecloudprofiler

    # Profiler initialization. It starts a daemon thread which continuously
    # collects and uploads profiles. Best done as early as possible.
    try:
      # service and service_version can be automatically inferred when
      # running on GCP.
      googlecloudprofiler.start(verbose=3)
    except (ValueError, NotImplementedError) as exc:
      logging.error(exc)

  # Setup flask config
  cfg = libconfig.get_config()
  app.config.from_object(cfg)

  # Init extentions
  from server.cache import cache

  # For some instance with fast updated data, we may not want to use memcache.
  if app.config['USE_MEMCACHE']:
    cache.init_app(app)
  else:
    cache.init_app(app, {'CACHE_TYPE': 'null'})

  # Configure ingress
  ingress_config_path = os.environ.get(
      'INGRESS_CONFIG_PATH')  # See deployment yamls.
  if ingress_config_path:
    configure_endpoints_from_ingress(ingress_config_path)

  register_routes_common(app)
  if cfg.CUSTOM:
    register_routes_custom_dc(app)
  if (cfg.ENV == 'stanford' or os.environ.get('ENABLE_MODEL') == 'true' or
      cfg.LOCAL and not cfg.LITE):
    register_routes_disasters(app)

  if cfg.TEST or cfg.INTEGRATION:
    # disaster dashboard tests require stanford's routes to be registered.
    register_routes_base_dc(app)
    register_routes_disasters(app)
  else:
    register_routes_base_dc(app)

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

  if not cfg.TEST and not cfg.LITE:
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
    # Only need to fetch the API key for local development.
    secret_client = secretmanager.SecretManagerServiceClient()
    secret_name = secret_client.secret_version_path(cfg.SECRET_PROJECT,
                                                    'mixer-api-key', 'latest')
    secret_response = secret_client.access_secret_version(name=secret_name)
    app.config['DC_API_KEY'] = secret_response.payload.data.decode('UTF-8')

  # Initialize translations
  babel = Babel(app, default_domain='all')
  app.config['BABEL_DEFAULT_LOCALE'] = i18n.DEFAULT_LOCALE
  app.config['BABEL_TRANSLATION_DIRECTORIES'] = 'i18n'

  # Enable the AI module.
  if cfg.ENABLE_AI:
    app.config['AI_CONTEXT'] = ai.Context()

  #   # Enable the NL model.
  if os.environ.get('ENABLE_MODEL') == 'true':
    libutil.check_backend_ready([app.config['NL_ROOT'] + '/healthz'])
    # Some specific imports for the NL Interface.
    import server.services.nl as nl

    nl_model = nl.Model()
    app.config['NL_MODEL'] = nl_model
    # This also requires disaster and event routes.
    app.config['NL_DISASTER_CONFIG'] = libutil.get_nl_disaster_config()

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

  return app
