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
    if os.environ.get('FLASK_ENV') == 'production':
        return import_string('configmodule.ProductionConfig')()
    elif os.environ.get('FLASK_ENV') == 'prod-sustainability':
        return import_string('configmodule.ProdSustainabilityConfig')()

    elif os.environ.get('FLASK_ENV') == 'staging':
        return import_string('configmodule.StagingConfig')()
    elif os.environ.get('FLASK_ENV') == 'staging-sustainability':
        return import_string('configmodule.StagingSustainabilityConfig')()

    elif os.environ.get('FLASK_ENV') == 'autopush':
        return import_string('configmodule.AutopushConfig')()
    elif os.environ.get('FLASK_ENV') == 'autopush-sustainability':
        return import_string('configmodule.AutopushSustainabilityConfig')()

    elif os.environ.get('FLASK_ENV') == 'test':
        return import_string('configmodule.TestConfig')()
    elif os.environ.get('FLASK_ENV') == 'test-sustainability':
        return import_string('configmodule.SustainabilityTestConfig')()

    elif os.environ.get('FLASK_ENV') == 'dev':
        return import_string('configmodule.DevConfig')()
    elif os.environ.get('FLASK_ENV') == 'webdriver':
        return import_string('configmodule.WebdriverConfig')()
    elif os.environ.get('FLASK_ENV') == 'minikube':
        return import_string('configmodule.MinikubeConfig')()

    elif os.environ.get('FLASK_ENV') == 'private':
        return import_string('configmodule.PrivateConfig')()

    elif os.environ.get('FLASK_ENV') == 'local':
        return import_string('configmodule.LocalConfig')()
    elif os.environ.get('FLASK_ENV') == 'local-lite':
        return import_string('configmodule.LocalLiteConfig')()
    elif os.environ.get('FLASK_ENV') == 'local-private':
        return import_string('configmodule.LocalPrivateConfig')()
    elif os.environ.get('FLASK_ENV') == 'local-sustainability':
        return import_string('configmodule.LocalSustainabilityConfig')()

    else:
        raise ValueError("No valid FLASK_ENV is specified: %s" %
                         os.environ.get('FLASK_ENV'))
