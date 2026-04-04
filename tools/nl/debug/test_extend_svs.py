# Copyright 2026 Google LLC
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
"""Script to manually verify variable extension logic."""

import logging
import os
import sys

from absl import app
from absl import flags

# Add server directory to path
sys.path.append(
    os.path.abspath(os.path.join(os.path.dirname(__file__), "../../..")))

from server import create_app
from server.lib.nl.common import variable

FLAGS = flags.FLAGS

flags.DEFINE_string("sv", "Count_Person_BelowPovertyLevelInThePast12Months",
                    "Statistical variable DCID to test extension for.")


def main(_):
  logging.basicConfig(level=logging.INFO)

  app_instance = create_app()
  with app_instance.app_context():
    logging.info(f"Calling extend_svs for {FLAGS.sv}")
    res = variable.extend_svs([FLAGS.sv])
    logging.info(f"Result: {res}")


if __name__ == "__main__":
  app.run(main)
