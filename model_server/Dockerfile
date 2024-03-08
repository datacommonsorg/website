# Copyright 2024 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.


FROM us-docker.pkg.dev/vertex-ai/prediction/pytorch-cpu.2-1:dlenvx_build_20240225_1000_RC00

WORKDIR /app

COPY requirements.txt /app
RUN pip install --no-cache-dir  -r requirements.txt

COPY ft_final_v20230717230459.all-MiniLM-L6-v2/ /app/ft_final_v20230717230459.all-MiniLM-L6-v2/

COPY main.py /app

ENTRYPOINT ["python", "main.py"]