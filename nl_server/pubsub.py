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

import json

from google.cloud import pubsub_v1
from google.cloud import storage

from nl_server import gcs
from nl_server import loader

AUTOPUSH_FOLDER = 'autopush/'
TOPIC_NAME = 'projects/datcom-204919/topics/nl-models-update'
SUBSCRIPTION_NAME = 'projects/datcom-204919/subscriptions/nl-models-update-sub'


def subscribe(app):

  def callback(message):
    data = json.loads(message.data)
    if data['bucket'] == gcs.BUCKET:
      if data['name'].startswith(AUTOPUSH_FOLDER):
        parts = data['name'].split('/')
        object_id = parts[1]
        if object_id:
          storage_client = storage.Client()
          bucket = storage_client.bucket(gcs.BUCKET)
          blob = bucket.get_blob(data['name'])
          if blob and blob.content_type == 'text/csv':
            loader.load_model(app, object_id)
    message.ack()

  subscriber = pubsub_v1.SubscriberClient()
  subscriber.subscribe(SUBSCRIPTION_NAME, callback)
