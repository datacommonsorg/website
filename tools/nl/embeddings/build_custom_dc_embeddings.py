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
"""Build embeddings for custom DCs."""

from dataclasses import asdict
import os

from absl import app
from absl import flags
import yaml

from nl_server import config_reader
from nl_server.config import Catalog
from nl_server.config import MemoryIndexConfig
from tools.nl.embeddings import utils

FLAGS = flags.FLAGS

flags.DEFINE_string('input_dir', '', 'Input directory with CSVs')
flags.DEFINE_string('output_dir', '', "Output directory to save embeddings.")

_MODEL_NAME = 'ft-final-v20230717230459-all-MiniLM-L6-v2'
_CATALOG_FILE_NAME = "custom_catalog.yaml"


def save_custom_dc_artifacts(catalog: Catalog, fm: utils.FileManager):
  embeddings_file_path = os.path.join(fm.output_dir(),
                                      utils.EMBEDDINGS_FILE_NAME)
  catalog = Catalog(version="1",
                    indexes={
                        "custom_ft":
                            MemoryIndexConfig(
                                embeddings_path=embeddings_file_path,
                                model=_MODEL_NAME,
                                store_type="MEMORY")
                    },
                    models={
                        _MODEL_NAME: catalog.models[_MODEL_NAME],
                    })
  # There is an assumption that the custom_catalog.yaml is saved under the
  # input_dir.
  # config_reader.py makes this assumption as well. Really need to improve this!
  local_catalog_path = os.path.join(fm.local_input_dir(), _CATALOG_FILE_NAME)
  with open(local_catalog_path, 'w') as f:
    yaml.dump(asdict(catalog), f)


def main(_):
  assert FLAGS.input_dir
  assert FLAGS.output_dir

  # Prepare the model
  catalog = config_reader.read_catalog()
  env = config_reader.read_env()
  model = utils.get_model(catalog, env, _MODEL_NAME)

  # Construct a file manager
  fm = utils.FileManager(FLAGS.input_dir, FLAGS.output_dir)

  # Build preindex
  texts, dcids = utils.build_preindex(fm, save=True)

  # Compute embeddings
  embeddings = utils.compute_embeddings(texts, model)

  # Save embeddings
  utils.save_embeddings_memory(fm.local_output_dir(), texts, dcids, embeddings)

  # Do custom DC specific stuff
  save_custom_dc_artifacts(catalog, fm)

  fm.maybe_upload_to_gcs()


if __name__ == "__main__":
  app.run(main)
