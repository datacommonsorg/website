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

import io
import os

from google.cloud import storage

_GCS_PATH_PREFIX = "gs://"


class FileHandler:
  """(Abstract) base class that should be extended by concrete implementations."""

  def __init__(self, path: str) -> None:
    self.path = path

  def __str__(self) -> str:
    return self.path

  def read_string(self) -> str:
    pass

  def read_string_io(self) -> io.StringIO:
    return io.StringIO(self.read_string())

  def write_string(self, content: str) -> None:
    pass

  def join(self, subpath: str) -> str:
    return os.path.join(self.path, subpath)

  def abspath(self) -> str:
    return self.path


class LocalFileHandler(FileHandler):

  def __init__(self, path: str) -> None:
    super().__init__(path)

  def read_string(self) -> str:
    with open(self.path, "r") as f:
      return f.read()

  def write_string(self, content: str) -> None:
    with open(self.path, "w") as f:
      f.write(content)

  def abspath(self) -> str:
    return os.path.abspath(self.path)


class GcsMeta(type):

  @property
  def gcs_client(cls) -> storage.Client:
    """Creates GCS client as a lazy class property.
    Class property ensures that only 1 client instance is created across all GcsFileHandler instances.
    Lazy ensures that a client is not created if no GcsFileHandler instances are created.
    """
    if getattr(cls, "_GCS_CLIENT", None) is None:
      gcs_client = storage.Client()
      print("Using GCS project: %s", gcs_client.project)
      cls._GCS_CLIENT = gcs_client
    return cls._GCS_CLIENT


class GcsFileHandler(FileHandler, metaclass=GcsMeta):

  def __init__(self, path: str) -> None:
    bucket_name, blob_name = path[len(_GCS_PATH_PREFIX):].split('/', 1)
    self.bucket = GcsFileHandler.gcs_client.bucket(bucket_name)
    self.blob = self.bucket.blob(blob_name)
    super().__init__(path)

  def read_string(self) -> str:
    return self.blob.download_as_string().decode("utf-8")

  def write_string(self, content: str) -> None:
    self.blob.upload_from_string(content)

  def join(self, subpath: str) -> str:
    return os.path.join(self.path, subpath)


def is_gcs_path(path: str) -> bool:
  return path.startswith(_GCS_PATH_PREFIX)


def create_file_handler(path: str) -> FileHandler:
  if is_gcs_path(path):
    return GcsFileHandler(path)
  return LocalFileHandler(path)
