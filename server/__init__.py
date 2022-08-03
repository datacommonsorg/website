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

from google_auth_oauthlib.flow import Flow
from google.cloud import secretmanager
from opencensus.ext.flask.flask_middleware import FlaskMiddleware
from opencensus.ext.stackdriver.trace_exporter import StackdriverExporter
from opencensus.trace.propagation import google_cloud_format
from opencensus.trace.samplers import AlwaysOnSampler
import lib.config as libconfig
import lib.i18n as i18n
import lib.util as libutil
import services.ai as ai

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
    from routes import (dev, disease, placelist, protein, redirects,
                        special_announcement, topic_page, import_wizard)
    app.register_blueprint(dev.bp)
    app.register_blueprint(disease.bp)
    app.register_blueprint(placelist.bp)
    app.register_blueprint(protein.bp)
    app.register_blueprint(redirects.bp)
    app.register_blueprint(special_announcement.bp)
    app.register_blueprint(topic_page.bp)
    from routes.api import (protein as protein_api)
    from routes.api import (disease as disease_api)
    app.register_blueprint(protein_api.bp)
    app.register_blueprint(disease_api.bp)
    app.register_blueprint(import_wizard.bp)


def register_routes_private_dc(app):
    ## apply the blueprints for private dc instances
    pass


def register_routes_admin(app):
    from routes import (user)
    app.register_blueprint(user.bp)


def register_routes_common(app):
    # apply the blueprints for main app
    from routes import (browser, factcheck, place, ranking, search, static,
                        tools)
    app.register_blueprint(browser.bp)
    app.register_blueprint(place.bp)
    app.register_blueprint(ranking.bp)
    app.register_blueprint(search.bp)
    app.register_blueprint(static.bp)
    app.register_blueprint(tools.bp)
    # TODO: Extract more out to base_dc
    from routes.api import (browser as browser_api, choropleth, place as
                            place_api, landing_page, ranking as ranking_api,
                            stats, translator)
    app.register_blueprint(browser_api.bp)
    app.register_blueprint(choropleth.bp)
    app.register_blueprint(factcheck.bp)
    app.register_blueprint(place_api.bp)
    app.register_blueprint(landing_page.bp)
    app.register_blueprint(ranking_api.bp)
    app.register_blueprint(stats.bp)
    app.register_blueprint(translator.bp)


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
    if app.config['PRIVATE']:
        cache.init_app(app, {'CACHE_TYPE': 'null'})
    else:
        cache.init_app(app)

    register_routes_common(app)
    if cfg.PRIVATE:
        register_routes_private_dc(app)
    else:
        register_routes_base_dc(app)
    if cfg.ADMIN:
        register_routes_admin(app)

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
                                                        'maps-api-key',
                                                        'latest')
        secret_response = secret_client.access_secret_version(name=secret_name)
        app.config['MAPS_API_KEY'] = secret_response.payload.data.decode(
            'UTF-8')

    if cfg.ADMIN:
        secret_client = secretmanager.SecretManagerServiceClient()
        secret_name = secret_client.secret_version_path(cfg.SECRET_PROJECT,
                                                        'oauth-client',
                                                        'latest')
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
                                                        'mixer-api-key',
                                                        'latest')
        secret_response = secret_client.access_secret_version(name=secret_name)
        app.config['API_KEY'] = secret_response.payload.data.decode('UTF-8')

    # Initialize translations
    babel = Babel(app, default_domain='all')
    app.config['BABEL_DEFAULT_LOCALE'] = i18n.DEFAULT_LOCALE
    app.config['BABEL_TRANSLATION_DIRECTORIES'] = 'i18n'

    # Initialize the AI module.
    app.config['AI_CONTEXT'] = ai.Context()

    if not cfg.TEST:
        timeout = 5 * 60  # seconds
        counter = 0
        isOpen = False
        while not isOpen:
            try:
                urllib.request.urlopen(cfg.API_ROOT + '/version')
                break
            except urllib.error.URLError:
                time.sleep(10)
                counter += 1
            if counter > timeout:
                raise RuntimeError('Mixer not ready after %s second' % timeout)

    @app.before_request
    def before_request():
        requested_locale = request.args.get('hl', i18n.DEFAULT_LOCALE)
        g.locale_choices = i18n.locale_choices(requested_locale)
        g.locale = g.locale_choices[0]

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
