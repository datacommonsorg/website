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

import os

from werkzeug.utils import import_string


def get_config():
    # Setup flask config
    if os.environ.get('FLASK_ENV') == 'test':
        return import_string('configmodule.TestConfig')()
    elif os.environ.get('FLASK_ENV') == 'production':
        return import_string('configmodule.ProductionConfig')()
    elif os.environ.get('FLASK_ENV') == 'webdriver':
        return import_string('configmodule.WebdriverConfig')()
    elif os.environ.get('FLASK_ENV') == 'staging':
        return import_string('configmodule.StagingConfig')()
    elif os.environ.get('FLASK_ENV') == 'autopush':
        return import_string('configmodule.AutopushConfig')()
    elif os.environ.get('FLASK_ENV') == 'svobs':
        return import_string('configmodule.SvObsConfig')()
    elif os.environ.get('FLASK_ENV') == 'development':
        return import_string('configmodule.DevelopmentConfig')()
    elif os.environ.get('FLASK_ENV') == 'development-lite':
        return import_string('configmodule.DevelopmentLiteConfig')()
    elif os.environ.get('FLASK_ENV') == 'development-svobs':
        return import_string('configmodule.DevelopmentSvObsConfig')()
    elif os.environ.get('FLASK_ENV') == 'minikube':
        return import_string('configmodule.MinikubeConfig')()
    else:
        raise ValueError("No valid FLASK_ENV is specified: %s" %
                         os.environ.get('FLASK_ENV'))
