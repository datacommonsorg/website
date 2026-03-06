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

import flask
from flask import current_app
from flask import g
from flask import request
from flask import url_for

from server.lib.feature_flags import is_feature_enabled
from server.lib.feature_flags import STANDARDIZED_VIS_TOOL_FEATURE_FLAG

bp = flask.Blueprint("tools", __name__, url_prefix='/tools')


def get_example_file(tool):
  example_file = os.path.join(current_app.root_path, 'templates/custom_dc',
                              g.custom_dc_template_folder,
                              '{}_examples.json'.format(tool))
  if os.path.exists(example_file):
    return example_file

  return os.path.join(current_app.root_path,
                      'templates/tools/{}_examples.json'.format(tool))


def load_example_file(tool_or_filename, default=None):
  """Loads a JSON example file, returning a default if missing."""
  if default is None:
    default = {}

  filepath = get_example_file(tool_or_filename)
  if os.path.exists(filepath):
    with open(filepath) as f:
      return json.load(f)

  return default


def _get_vis_tool_examples(tool_name):
  """Returns (info_json, vis_tool_examples_json, use_standardized_ui)"""
  use_standardized_ui = is_feature_enabled(STANDARDIZED_VIS_TOOL_FEATURE_FLAG,
                                           request=request)
  if use_standardized_ui:
    return {}, load_example_file(f'{tool_name}_vis_tool', default=[]), True
  return load_example_file(tool_name, default={}), [], False


@bp.route('/timeline')
def timeline():
  info_json, vis_tool_examples_json, use_standardized_ui = _get_vis_tool_examples(
      'timeline')

  return flask.render_template('tools/timeline.html',
                               info_json=info_json,
                               vis_tool_examples_json=vis_tool_examples_json,
                               use_standardized_ui=use_standardized_ui,
                               maps_api_key=current_app.config['MAPS_API_KEY'],
                               sample_questions=json.dumps(
                                   current_app.config.get(
                                       'HOMEPAGE_SAMPLE_QUESTIONS', [])))


# This tool was used by several data science course (but no traffic in 2025).
@bp.route('/timeline/bulk_download')
def timeline_bulk_download():
  return flask.redirect(url_for('tools.timeline', code=301))


@bp.route('/map')
def map():
  info_json, vis_tool_examples_json, use_standardized_ui = _get_vis_tool_examples(
      'map')

  return flask.render_template('tools/map.html',
                               maps_api_key=current_app.config['MAPS_API_KEY'],
                               info_json=info_json,
                               vis_tool_examples_json=vis_tool_examples_json,
                               use_standardized_ui=use_standardized_ui,
                               sample_questions=json.dumps(
                                   current_app.config.get(
                                       'HOMEPAGE_SAMPLE_QUESTIONS', [])))


@bp.route('/scatter')
def scatter():
  info_json, vis_tool_examples_json, use_standardized_ui = _get_vis_tool_examples(
      'scatter')

  return flask.render_template('tools/scatter.html',
                               info_json=info_json,
                               vis_tool_examples_json=vis_tool_examples_json,
                               use_standardized_ui=use_standardized_ui,
                               maps_api_key=current_app.config['MAPS_API_KEY'],
                               sample_questions=json.dumps(
                                   current_app.config.get(
                                       'HOMEPAGE_SAMPLE_QUESTIONS', [])))


@bp.route('/statvar')
def stat_var():
  return flask.render_template('tools/stat_var.html',
                               sample_questions=json.dumps(
                                   current_app.config.get(
                                       'HOMEPAGE_SAMPLE_QUESTIONS', [])))


@bp.route('/download')
def download():
  # List of DCIDs displayed in the info page for download tool
  # NOTE: EXACTLY 2 EXAMPLES REQUIRED.
  info_places = load_example_file('download', default=[])

  return flask.render_template('tools/download.html',
                               info_places=json.dumps(info_places),
                               maps_api_key=current_app.config['MAPS_API_KEY'],
                               sample_questions=json.dumps(
                                   current_app.config.get(
                                       'HOMEPAGE_SAMPLE_QUESTIONS', [])))


@bp.route('/visualization')
def visualization():
  info_json = load_example_file('visualization', default={})

  return flask.render_template('tools/visualization.html',
                               manual_ga_pageview=True,
                               info_json=info_json,
                               maps_api_key=current_app.config['MAPS_API_KEY'],
                               sample_questions=json.dumps(
                                   current_app.config.get(
                                       'HOMEPAGE_SAMPLE_QUESTIONS', [])))
