# Copyright 2021 Google LLC
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
"""Topic page related handlers."""

from flask import current_app
import flask
import os
import json
import routes.api.place as place_api
from google.protobuf.json_format import MessageToJson
import lib.util as libutil

bp = flask.Blueprint('topic_page', __name__, url_prefix='/topic')


@bp.route('', strict_slashes=False)
@bp.route('/<string:topic_id>', strict_slashes=False)
@bp.route('/<string:topic_id>/<path:place_dcid>', strict_slashes=False)
def topic_page(topic_id=None, place_dcid=None):
    # Redirect to the landing page.
    if not place_dcid and not topic_id:
        return flask.render_template('topic_page_landing.html')

    all_configs = current_app.config['TOPIC_PAGE_CONFIG']
    all_summaries = current_app.config['TOPIC_PAGE_SUMMARY']
    if os.environ.get('FLASK_ENV') == 'local':
        all_configs = libutil.get_topic_page_config()
        all_summaries = libutil.get_topics_summary(all_configs)
    topic_configs = all_configs.get(topic_id, [])
    topics_summary = json.dumps(current_app.config['TOPIC_PAGE_SUMMARY'])
    if len(topic_configs) < 1:
        return "Error: no config found"

    if not place_dcid:
        return flask.render_template(
            'topic_page.html',
            place_type="",
            place_name="",
            place_dcid="",
            topic_id=topic_id,
            topic_name=topic_configs[0].metadata.topic_name or "",
            config={},
            topics_summary=topics_summary)

    # Find the config for the topic & place.
    topic_place_config = None
    for config in topic_configs:
        if place_dcid in config.metadata.place_dcid:
            topic_place_config = config
            break
    if not topic_place_config:
        return "Error: no config found"

    # TODO: should use place metadata API to fetch these data in one call.
    place_type = place_api.get_place_type(place_dcid)
    place_names = place_api.get_i18n_name([place_dcid])
    if place_names:
        place_name = place_names[place_dcid]
    else:
        place_name = place_dcid
    return flask.render_template(
        'topic_page.html',
        place_type=place_type,
        place_name=place_name,
        place_dcid=place_dcid,
        topic_id=topic_id,
        topic_name=topic_place_config.metadata.topic_name or "",
        config=MessageToJson(topic_place_config),
        topics_summary=topics_summary)
