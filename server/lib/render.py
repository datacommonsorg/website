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

import os

from flask import current_app
from flask import g
from flask import render_template


def render_page(default_html, custom_dc_html, **context):
  """Render static page from default template or custom DC template.

  Custom DC templates reside under 'server/templates/custom_dc/<env>/'

  **context: Additional data to pass into the template.
  """
  template_file = os.path.join('custom_dc', g.env, custom_dc_html)
  if os.path.exists(
      os.path.join(current_app.root_path, 'templates', template_file)):
    return render_template(template_file, **context)
  return render_template(default_html, **context)