# Copyright 2020 Google LLC
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


apiVersion: batch/v1
kind: CronJob
metadata:
  name: periodic-testing
  namespace: website
spec:
  schedule: "0 */4 * * *"
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
  jobTemplate:
    spec:
      backoffLimit: 0
      template:
        spec:
          serviceAccountName:
          containers:
          - name: periodic-testing-container
            image: "gcr.io/datcom-ci/website-periodic-testing:latest"
            args:
            - /bin/sh
            - -c
            - /resources/run_website_periodic_tests.sh $WEB_API_ROOT $NODEJS_API_ROOT
            env:
            - name: WEB_API_ROOT
              valueFrom: 
                configMapKeyRef:
                  name: periodic-testing-config
                  key: webApiRoot
            - name: NODEJS_API_ROOT
              valueFrom: 
                configMapKeyRef:
                  name: periodic-testing-config
                  key: nodejsApiRoot
          restartPolicy: Never