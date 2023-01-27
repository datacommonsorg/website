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
import logging
from google.cloud import pubsub_v1
from google.cloud import storage

model_bucket = 'datcom-nl-models'
autopush_folder = 'autopush/'
topic_name = 'projects/datcom-204919/topics/nl-models-update'
subscription_name = 'projects/datcom-204919/subscriptions/nl-models-update-sub'


def callback(message):
  data = json.loads(message.data)
  if data['bucket'] == model_bucket:
    if data['name'].startswith(autopush_folder):
      parts = data['name'].split('/')
      object_id = parts[1]
      if object_id:
        storage_client = storage.Client()
        bucket = storage_client.bucket(model_bucket)
        blob = bucket.get_blob(data['name'])
        if blob and blob.content_type == 'text/csv':
          logging.info('TODO: load the embedding')
  message.ack()


def subscribe():
  subscriber = pubsub_v1.SubscriberClient()
  subscriber.subscribe(subscription_name, callback)
