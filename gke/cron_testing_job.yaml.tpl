# Copyright 2023 Google LLC
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
  name: cron-testing
  namespace: website
spec:
  # Run every 4 hours
  schedule:
  successfulJobsHistoryLimit: 100
  failedJobsHistoryLimit: 100
  jobTemplate:
    spec:
      backoffLimit: 0
      template:
        spec:
          serviceAccountName:
          nodeSelector:
            cloud.google.com/gke-nodepool:
          containers:
          - name: cron-testing-container
            image: "gcr.io/datcom-ci/website-cron-testing:latest"
            args:
            - /bin/sh
            - -c
            - /resources/run_website_cron_tests.sh
            env:
            - name: WEB_API_ROOT
              valueFrom: 
                configMapKeyRef:
                  name: cron-testing-config
                  key: webApiRoot
            - name: NODEJS_API_ROOT
              valueFrom: 
                configMapKeyRef:
                  name: cron-testing-config
                  key: nodejsApiRoot
            - name: SCREENSHOT_DOMAIN
              valueFrom: 
                configMapKeyRef:
                  name: cron-testing-config
                  key: screenshotDomain
            - name: ENABLE_SANITY
              valueFrom: 
                configMapKeyRef:
                  name: cron-testing-config
                  key: enableSanity
            - name: ENABLE_ADVERSARIAL
              valueFrom: 
                configMapKeyRef:
                  name: cron-testing-config
                  key: enableAdversarial
          restartPolicy: Never