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
import time
import tempfile
import urllib.request
import urllib.error

from flask import Flask, request, g
from flask_babel import Babel

import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore

from google_auth_oauthlib.flow import Flow
from google.cloud import secretmanager
from opencensus.ext.flask.flask_middleware import FlaskMiddleware
from opencensus.ext.stackdriver.trace_exporter import StackdriverExporter
from opencensus.trace.propagation import google_cloud_format
from opencensus.trace.samplers import AlwaysOnSampler
import lib.config as libconfig
import lib.i18n as i18n
import lib.util as libutil
from services.discovery import get_health_check_urls

propagator = google_cloud_format.GoogleCloudFormatPropagator()

nl_model_cache_key = 'nl_model'
nl_model_cache_path = '~/.datacommons/'
nl_model_cache_expire = 3600 * 24  # Cache for 1 day


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
  from routes import (
      dev,
      disease,
      import_wizard,
      placelist,
      protein,
      redirects,
      special_announcement,
      topic_page,
  )
  app.register_blueprint(dev.bp)
  app.register_blueprint(disease.bp)
  app.register_blueprint(placelist.bp)
  app.register_blueprint(protein.bp)
  app.register_blueprint(redirects.bp)
  app.register_blueprint(special_announcement.bp)
  app.register_blueprint(topic_page.bp)

  from routes.api import (protein as protein_api)
  from routes.api import (disease as disease_api)
  from routes.api.import_detection import (detection as detection_api)
  app.register_blueprint(detection_api.bp)
  app.register_blueprint(disease_api.bp)
  app.register_blueprint(import_wizard.bp)
  app.register_blueprint(protein_api.bp)


def register_routes_custom_dc(app):
  ## apply the blueprints for custom dc instances
  pass


def register_routes_stanford_dc(app, is_test):
  # Install blueprints specific to Stanford DC
  from routes import (disasters, event)
  from routes.api import (disaster_api)
  app.register_blueprint(disasters.bp)
  app.register_blueprint(disaster_api.bp)
  app.register_blueprint(event.bp)

  if not is_test:
    # load disaster dashboard configs
    disaster_dashboard_configs = libutil.get_disaster_dashboard_configs()
    app.config['DISASTER_DASHBOARD_CONFIGS'] = disaster_dashboard_configs


def register_routes_admin(app):
  from routes import (user)
  app.register_blueprint(user.bp)
  from routes.api import (user as user_api)
  app.register_blueprint(user_api.bp)


def register_routes_common(app):
  # apply the blueprints for main app
  from routes import (
      browser,
      factcheck,
      nl_interface,
      nl_interface_next,
      place,
      ranking,
      search,
      static,
      tools,
  )
  app.register_blueprint(browser.bp)
  app.register_blueprint(nl_interface.bp)
  app.register_blueprint(nl_interface_next.bp)
  app.register_blueprint(place.bp)
  app.register_blueprint(ranking.bp)
  app.register_blueprint(search.bp)
  app.register_blueprint(static.bp)
  app.register_blueprint(tools.bp)
  # TODO: Extract more out to base_dc
  from routes.api import (
      browser as browser_api,
      choropleth,
      csv,
      facets,
      landing_page,
      node,
      observation_dates,
      observation_existence,
      place as place_api,
      point,
      ranking as ranking_api,
      series,
      stats,
      translator,
      variable,
      variable_group,
  )
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
  from cache import cache
  # For some instance with fast updated data, we may not want to use memcache.
  if app.config['USE_MEMCACHE']:
    cache.init_app(app)
  else:
    cache.init_app(app, {'CACHE_TYPE': 'null'})

  register_routes_common(app)
  if cfg.CUSTOM:
    register_routes_custom_dc(app)
  if cfg.ENV_NAME == 'STANFORD' or os.environ.get(
      'FLASK_ENV') == 'autopush' or cfg.LOCAL:
    register_routes_stanford_dc(app, cfg.TEST)
  if cfg.TEST:
    # disaster dashboard tests require stanford's routes to be registered.
    register_routes_base_dc(app)
    register_routes_stanford_dc(app, cfg.TEST)
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

  if app.config['LOCAL']:
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

  if app.config['API_PROJECT']:
    secret_client = secretmanager.SecretManagerServiceClient()
    secret_name = secret_client.secret_version_path(cfg.API_PROJECT,
                                                    'mixer-api-key', 'latest')
    secret_response = secret_client.access_secret_version(name=secret_name)
    app.config['DC_API_KEY'] = secret_response.payload.data.decode('UTF-8')

  # Initialize translations
  babel = Babel(app, default_domain='all')
  app.config['BABEL_DEFAULT_LOCALE'] = i18n.DEFAULT_LOCALE
  app.config['BABEL_TRANSLATION_DIRECTORIES'] = 'i18n'

  def load_model():
    # import services.ai as ai
    # app.config['AI_CONTEXT'] = ai.Context()

    # In local dev, cache the model in disk so each hot reload won't download
    # the model again.
    if app.config['LOCAL']:
      from diskcache import Cache
      cache = Cache(nl_model_cache_path)
      cache.expire()
      nl_model = cache.get(nl_model_cache_key)
      app.config['NL_MODEL'] = nl_model
      if nl_model:
        logging.info("Use cached model in: " + cache.directory)
        return
    # Some specific imports for the NL Interface.
    import en_core_web_md
    import lib.nl_training as libnl
    import services.nl as nl
    # For the classification types available, check lib.nl_training (libnl).
    classification_types = [
        'ranking', 'temporal', 'contained_in', 'correlation'
    ]
    nl_model = nl.Model(en_core_web_md.load(), libnl.CLASSIFICATION_INFO,
                        classification_types)
    app.config['NL_MODEL'] = nl_model
    if app.config['LOCAL']:
      with Cache(cache.directory) as reference:
        reference.set(nl_model_cache_key,
                      nl_model,
                      expire=nl_model_cache_expire)

  # Initialize the AI module.
  if os.environ.get('ENABLE_MODEL') == 'true':
    load_model()

  def is_up(url: str):
    if not url.lower().startswith('http'):
      raise ValueError(f'Invalid scheme in {url}. Expected http(s)://.')

    try:
      # Disable Bandit security check 310. http scheme is already checked above.
      # Codacity still calls out the error so disable the check.
      # https://bandit.readthedocs.io/en/latest/blacklists/blacklist_calls.html#b310-urllib-urlopen
      urllib.request.urlopen(url)  # nosec B310
      return True
    except urllib.error.URLError:
      return False

  if not cfg.TEST:
    timeout = 5 * 60  # seconds
    sleep_seconds = 10
    total_sleep_seconds = 0
    urls = get_health_check_urls()
    up_status = {url: False for url in urls}
    while not all(up_status.values()):
      for url in urls:
        if up_status[url]:
          continue
        up_status[url] = is_up(url)

      if all(up_status.values()):
        break
      time.sleep(sleep_seconds)
      total_sleep_seconds += sleep_seconds
      if total_sleep_seconds > timeout:
        raise RuntimeError('Mixer not ready after %s second' % timeout)

  # Add variables to the per-request global context.
  @app.before_request
  def before_request():
    # Add the request locale.
    requested_locale = request.args.get('hl', i18n.DEFAULT_LOCALE)
    g.locale_choices = i18n.locale_choices(requested_locale)
    g.locale = g.locale_choices[0]

    # Add commonly used config flags.
    g.env_name = app.config.get('ENV_NAME', None)

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

  return app
