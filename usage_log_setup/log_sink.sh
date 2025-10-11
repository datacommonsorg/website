# Load constants
source ./usage_log_setup/config.sh

DESTINATION="bigquery.googleapis.com/projects/${DESTINATION_PROJECT_ID}/datasets/${DESTINATION_DATASET}/tables/${DESTINATION_TABLE}"

# # Define your variables (example from your script)
# WRITER_IDENTITY="serviceAccount:service-182452152245@gcp-sa-logging.iam.gserviceaccount.com"
# ROLE_TO_CHECK="WRITER"  # BigQuery basic role equivalent to bigquery.dataEditor
# DATASET_REF="${DESTINATION_PROJECT_ID}:${DESTINATION_DATASET}"

# # Check if the writer identity already has the role
# HAS_ROLE=$(
#     bq show --format=prettyjson "${DATASET_REF}" 2>/dev/null |
#     grep -c "\"role\": \"${ROLE_TO_CHECK}\",.*\"userByEmail\": \"${WRITER_IDENTITY}\""
# )

# echo "Has role before: ${HAS_ROLE}"

# # bq update \
# #         --set_access_entry role:WRITER,entity:serviceAccount:"${WRITER_IDENTITY}" \
# #         "${DATASET_REF}"
# DATASET_REF="${DESTINATION_PROJECT_ID}:${DESTINATION_DATASET}"

# # Grant the WRITER role (equivalent to dataEditor) using the traditional ACL method
# # bq update \
# #     --set_access_entry role:WRITER,entity:serviceAccount:"${WRITER_IDENTITY}" \
# #     "${DATASET_REF}"

# # bq add-iam-policy-binding \
# #     --role roles/bigquery.dataEditor \
# #     --member "serviceAccount:service-182452152245@gcp-sa-logging.iam.gserviceaccount.com" \
# #     "${DESTINATION_PROJECT_ID}:${DESTINATION_DATASET}"

# # gcloud projects add-iam-policy-binding datcom-website-autopush --member=serviceAccount:service-182452152245@gcp-sa-logging.iam.gserviceaccount.com --role=roles/bigquery.dataEditor

# HAS_ROLE=$(
#     bq show --format=prettyjson "${DATASET_REF}" 2>/dev/null |
#     grep -c "\"role\": \"${ROLE_TO_CHECK}\",.*\"userByEmail\": \"${WRITER_IDENTITY}\""
# )

# echo "Has role after: ${HAS_ROLE}"

# The destination dataset table must exist before creating the sink. If it already exists, skip this step.
# We don't manually define a table, because the logger will automatically create it with a schema based on the logs injested.
Making dataset
https://cloud.google.com/bigquery/docs/datasets#bq 
bq --location=US mk \
    --dataset \
    --description="${DATASET_DESCRIPTION}" \
    ${DESTINATION_PROJECT_ID}:${DESTINATION_DATASET}

# # Create the logging sink
# destination: be a BigQuery table, e.g. bigquery.googleapis.com/projects/<PROJECT_ID>/datasets/<DATASET_NAME>
# log_filter: an attribute that only your logs have – give your logs a unique message like “usage_log_data”.
# use-partitioned-tables: tables grouped by day, which reduces storage costs.
# project: your GCP project ID for the project where the logs are coming from.
gcloud logging sinks create \
    "${SINK_NAME}" \
    "${DESTINATION}" \
    --description="${DESCRIPTION}" \
    --log-filter="${LOG_FILTER}" \
    --use-partitioned-tables \
    --project="${LOG_SOURCE_PROJECT_ID}"