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

from flask import Flask
from google.cloud import storage
from werkzeug.utils import import_string

from google.cloud import secretmanager
from opencensus.ext.flask.flask_middleware import FlaskMiddleware
from opencensus.ext.stackdriver.trace_exporter import StackdriverExporter
from opencensus.trace.propagation import google_cloud_format
from opencensus.trace.samplers import AlwaysOnSampler

propagator = google_cloud_format.GoogleCloudFormatPropagator()


def createMiddleWare(app, exporter):
    # Configure a flask middleware that listens for each request and applies
    # automatic tracing. This needs to be set up before the application starts.
    middleware = FlaskMiddleware(app,
                                 exporter=exporter,
                                 propagator=propagator,
                                 sampler=AlwaysOnSampler())
    return middleware


def create_app():
    app = Flask(__name__, static_folder="dist", static_url_path="")

    if os.environ.get('FLASK_ENV') in ['production', 'staging']:
        createMiddleWare(app, StackdriverExporter())
        import googlecloudprofiler
        # Profiler initialization. It starts a daemon thread which continuously
        # collects and uploads profiles. Best done as early as possible.
        try:
            # service and service_version can be automatically inferred when
            # running on App Engine.
            googlecloudprofiler.start(verbose=3)
        except (ValueError, NotImplementedError) as exc:
            logging.error(exc)

    # Setup flask config
    if os.environ.get('FLASK_ENV') == 'test':
        cfg = import_string('configmodule.TestConfig')()
    elif os.environ.get('FLASK_ENV') == 'production':
        cfg = import_string('configmodule.ProductionConfig')()
    elif os.environ.get('FLASK_ENV') == 'webdriver':
        cfg = import_string('configmodule.WebdriverConfig')()
    elif os.environ.get('FLASK_ENV') == 'staging':
        cfg = import_string('configmodule.StagingConfig')()
    elif os.environ.get('FLASK_ENV') == 'development':
        cfg = import_string('configmodule.DevelopmentConfig')()
    else:
        raise ValueError("No valid FLASK_ENV is specified: %s" %
                         os.environ.get('FLASK_ENV'))
    app.config.from_object(cfg)

    # Init extentions
    from cache import cache
    cache.init_app(app)

    # apply the blueprints to the app
    from routes import (browser, dev, factcheck, place, placelist, ranking,
                        redirects, static, tools)
    app.register_blueprint(browser.bp)
    app.register_blueprint(dev.bp)
    app.register_blueprint(place.bp)
    app.register_blueprint(placelist.bp)
    app.register_blueprint(ranking.bp)
    app.register_blueprint(redirects.bp)
    app.register_blueprint(tools.bp)
    from routes.api import (chart, choropleth, place as place_api, landing_page,
                            ranking as ranking_api, stats, translator)
    app.register_blueprint(chart.bp)
    app.register_blueprint(choropleth.bp)
    app.register_blueprint(factcheck.bp)
    app.register_blueprint(place_api.bp)
    app.register_blueprint(landing_page.bp)
    app.register_blueprint(ranking_api.bp)
    app.register_blueprint(static.bp)
    app.register_blueprint(stats.bp)
    app.register_blueprint(translator.bp)

    # Load chart config
    with open('chart_config.json') as f:
        chart_config = json.load(f)
    app.config['CHART_CONFIG'] = chart_config

    if cfg.WEBDRIVER or cfg.DEVELOPMENT:
        secret_client = secretmanager.SecretManagerServiceClient()
        secret_name = secret_client.secret_version_path(cfg.PROJECT,
                                                        'maps-api-key', '1')
        secret_response = secret_client.access_secret_version(secret_name)
        app.config['MAPS_API_KEY'] = secret_response.payload.data.decode(
            'UTF-8')
    else:
        app.config['MAPS_API_KEY'] = "AIzaSyCi3WDvStkhQOBQRnV_4Fcuar7ZRteHgvU"

    if cfg.TEST or cfg.WEBDRIVER:
        app.config['PLACEID2DCID'] = {
            "ChIJCzYy5IS16lQRQrfeQ5K5Oxw": "country/USA",
            "ChIJPV4oX_65j4ARVW8IJ6IJUYs": "geoId/06"
        }
    else:
        # Load placeid2dcid mapping from GCS
        storage_client = storage.Client()
        bucket = storage_client.get_bucket(app.config['GCS_BUCKET'])
        blob = bucket.get_blob('placeid2dcid.json')
        app.config['PLACEID2DCID'] = json.loads(blob.download_as_string())

    return app
