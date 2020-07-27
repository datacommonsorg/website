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
import os

from flask import Flask
from werkzeug.utils import import_string


def create_app():
    app = Flask(
        __name__,
        static_folder="dist",
        static_url_path=""
    )

    # Setup flask config
    if os.environ.get('FLASK_ENV') == 'test':
        cfg = import_string('configmodule.TestConfig')()
    elif os.environ.get('FLASK_ENV') == 'production':
        cfg = import_string('configmodule.ProductionConfig')()
    else:
        cfg = import_string('configmodule.DevelopmentConfig')()
    app.config.from_object(cfg)

    # Init extentions
    from cache import cache
    cache.init_app(app)

    # apply the blueprints to the app
    from routes import browser, factcheck, redirects, placelist, static,\
        tools, choropleth
    from routes.api import place, stats, chart
    app.register_blueprint(browser.bp)
    app.register_blueprint(chart.bp)
    app.register_blueprint(factcheck.bp)
    app.register_blueprint(place.bp)
    app.register_blueprint(redirects.bp)
    app.register_blueprint(placelist.bp)
    app.register_blueprint(static.bp)
    app.register_blueprint(stats.bp)
    app.register_blueprint(tools.bp)
    app.register_blueprint(choropleth.bp)

    # Load chart config
    with open('chart_config.json') as f:
        chart_config = json.load(f)
    app.config['CHART_CONFIG'] = chart_config

    return app
