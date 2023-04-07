#!/bin/bash
# Copyright 2022 Google LLC
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

gcloud domains registrations describe $DOMAIN \
  --project=$PROJECT_ID
RET=$?
if [ $RET == 0 ]; then
  echo "$DOMAIN is already registered."
  exit 0
fi

cat >contact.yaml <<EOL
allContacts:
  email: '${CONTACT_EMAIL}'
  phoneNumber: '${CONTACT_PHONE_INTERNALTIONAL_FORMAT}'
  postalAddress:
    regionCode: '${CONTACT_REGION_CODE}'
    postalCode: '${CONTACT_POSTAL_CODE}'
    administrativeArea: '${CONTACT_ADMIN_ADREA}'
    locality: '${CONTACT_LOCALITY}'
    addressLines: ${ARRAY_CONTACT_ADDRESSES}
    recipients: ${ARRAY_CONTACT_RECIPIENTS}
EOL

# private-contact-data flag makes contact info private.
# yearly-price flag sets a maximum yearly price of $40 USD.
gcloud alpha domains registrations register \
    $DC_WEBSITE_DOMAIN \
    --notices="hsts-preloaded" \
    --contact-data-from-file=contact.yaml \
    --contact-privacy="private-contact-data" \
    --yearly-price="$DOMAIN_YEARLY_PRICE" \
    --quiet \
    --project=$PROJECT_ID \
    --cloud-dns-zone=$DNS_ZONE_NAME


