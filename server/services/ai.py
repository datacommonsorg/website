# Copyright 2022 Google LLC
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
"""Vertex AI inference client and utilities."""

import json
import logging
from typing import Any, Mapping, Optional

import google.auth
import grpc
import lib.config as libconfig
import numpy as np
import requests
import tensorflow as tf
import urllib3
import yaml
from tensorflow_serving.apis import predict_pb2, prediction_service_pb2_grpc

cfg = libconfig.get_config()

# ----------------------------- INTERNAL FUNCTIONS -----------------------------

_INFERENCE_CLIENT = None


class InferenceClient(object):
    """Client for interacting with models on the Vertex AI platform."""

    def __init__(
        self,
        region: str,
        endpoint_id: str,
        deployed_model_id: str,
        predict_timeout: int = 30,
    ) -> None:
        self.region = region
        self.endpoint_id = endpoint_id
        self.deployed_model_id = deployed_model_id
        self.predict_timeout = predict_timeout
        self.initialize()

    def initialize(self) -> None:
        pass

    def request(self, data):
        pass


class GrpcInferenceClient(InferenceClient):

    def initialize(self):
        grpc_channel = grpc.insecure_channel(
            f"{self.endpoint_id}.aiplatform.googleapis.com:8500")
        self.stub = prediction_service_pb2_grpc.PredictionServiceStub(
            grpc_channel)
        self.metadata = [("grpc-destination",
                          f"{self.endpoint_id}-{self.deployed_model_id}")]

    def request(self, query: str):
        request = predict_pb2.PredictRequest()
        request.model_spec.name = "default"
        request.inputs["text_batch"].CopyFrom(
            tf.make_tensor_proto([query], tf.string))
        predict_response = self.stub.Predict(request,
                                             timeout=self.predict_timeout,
                                             metadata=self.metadata)
        return {
            "predictions": [{
                k: np.squeeze(tf.make_ndarray(predict_response.outputs[k]),
                              axis=-1).tolist()
                for k in predict_response.outputs.keys()
            }]
        }


class RestInferenceClient(InferenceClient):

    def initialize(self):
        self.creds, self.project_id = None, None
        if not self.deployed_model_id:
            self.creds, self.project_id = google.auth.default()
            self.url = f"https://{self.region}-aiplatform.googleapis.com/v1/projects/{self.project_id}/locations/{self.region}/endpoints/{self.endpoint_id}:predict"
        else:
            self.url = f"http://{self.endpoint_id}.aiplatform.googleapis.com/v1/models/{self.deployed_model_id}:predict"

        logging.info("Model connection via URL: %s", self.url)
        self.session = self._get_session()

    def _get_session(self) -> requests.Session:
        """Gets a http session."""
        retry = urllib3.util.retry.Retry(
            total=5,
            status_forcelist=[429, 503],
            backoff_factor=2,
            method_whitelist=["POST"],
        )
        adapter = requests.adapters.HTTPAdapter(max_retries=retry)
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "User-Agent": "datcom-inference-client",
        })
        session.mount("https://", adapter)
        return session

    def _get_headers(self) -> Optional[Mapping[str, str]]:
        if not self.creds:
            return None
        if not self.creds.valid:
            self.creds.refresh(google.auth.transport.requests.Request())
        return {
            "X-Goog-User-Project": self.project_id,
            "Authorization": "Bearer " + self.creds.token,
        }

    def request(self, query: str):
        headers = self._get_headers()
        json_data = json.dumps({"instances": [query]})
        return self.session.post(self.url,
                                 data=json_data,
                                 headers=headers,
                                 timeout=self.predict_timeout).json()


def get_region() -> Optional[str]:
    """Returns a string indicating the region."""
    metadata_url = "http://metadata.google.internal/computeMetadata/v1/instance/zone"
    metadata_flavor = {"Metadata-Flavor": "Google"}
    zone = requests.get(metadata_url, headers=metadata_flavor).text
    # zone is in the format of projects/projectnum/zones/zone
    region = "-".join(zone.split("/")[3].split("-")[0:2])
    return region


def create_inference_client(config_path: str) -> Optional[InferenceClient]:
    """Creates an InferenceClient instance for generic model predictions."""

    logging.info("Loading InferenceClient using config file %s", config_path)

    factory = {
        "grpc": GrpcInferenceClient,
        "rest": RestInferenceClient,
    }

    with open(config_path) as f:
        ai = yaml.full_load(f)
        # We use a fake region when locally testing with LocalConfig.
        region = ai["local"]["region"] if cfg.LOCAL else get_region()
        if region in ai:
            endpoint_id = ai[region]["endpoint_id"]
            deployed_model_id = ai[region].get("deployed_model_id", "")
            protocol = ai[region]["protocol"]
            cls = factory.get(protocol, None)
            if cls:
                return cls(region, endpoint_id, deployed_model_id)
            raise ValueError(f"Unknown protocol {protocol}")


if not cfg.TEST and cfg.AI_CONFIG_PATH:
    _INFERENCE_CLIENT = create_inference_client(cfg.AI_CONFIG_PATH)


def search(query: str) -> Optional[Any]:
    global _INFERENCE_CLIENT

    if _INFERENCE_CLIENT:
        response = _INFERENCE_CLIENT.request(query)
        # This is a fake response for the moment.
        # It will change once we have the API in place.
        return {'type': f'Model response: {response}', 'entities': []}
