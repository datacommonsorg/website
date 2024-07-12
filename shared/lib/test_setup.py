# Copyright 2024 Google LLC
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

import logging
import multiprocessing
import os
import platform
import sys


def set_up_multiprocessing_for_tests():
  """Ensure Python tests work with multiprocessing.

  Explicitly sets to "spawn" as the default can be "fork" in certain Linux,
  and that does not work consistently well.

  This code must only be run once per execution.
  """
  multiprocessing.set_start_method("spawn")
  os.environ['no_proxy'] = '*'