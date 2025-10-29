# # Load constants
source ./usage_log_setup/config.sh

# The destination BigQuery table for the log sink
DESTINATION="bigquery.googleapis.com/projects/${DESTINATION_PROJECT_ID}/datasets/${DESTINATION_DATASET}/tables/${DESTINATION_TABLE}"

# # Create the destination dataset
# Docs: https://cloud.google.com/bigquery/docs/datasets#bq 
# The destination dataset must exist before creating the sink. 
# TODO: If it already exists, skip this step.
# We don't manually define a table, because the logger will automatically create it with a schema based on the logs injested.
bq --location=US mk \
    --dataset \
    --description="${DATASET_DESCRIPTION}" \
    ${DESTINATION_PROJECT_ID}:${DESTINATION_DATASET}

echo "Created dataset ${DESTINATION_DATASET} in project ${DESTINATION_PROJECT_ID}."

# # Create the logging sink
# destination: a BigQuery table, e.g. bigquery.googleapis.com/projects/<PROJECT_ID>/datasets/<DATASET_NAME>
# log_filter: an attribute unique to the usage logs – should be a unique message like “usage_log_data”.
# use-partitioned-tables: tables grouped by day, which reduces storage costs.
# project: your GCP project ID for the project where the logs are coming from.
gcloud logging sinks create \
    "${SINK_NAME}" \
    "${DESTINATION}" \
    --description="${DESCRIPTION}" \
    --log-filter="${LOG_FILTER}" \
    --use-partitioned-tables \
    --project="${LOG_SOURCE_PROJECT_ID}"

echo "Created sink ${SINK_NAME} in project ${LOG_SOURCE_PROJECT_ID} that routes logs to ${DESTINATION}"

# After creating the log sink, it won't automatically have write access to the dataset
# We can manually grant it permission here.
# If this doesn't work, try using the console to manually set permissions, and if you
# run into access issues there, ask someone with Data Owner status on the dataset 
# TODO: lucysking is a data owner but has intern status and that might be blocking permissions here. Not 
# totally clear exactly which roles will and will not have access to this. 
# There might also be a better command that can streamline this but I can't test it

# Log sink's service account
WRITER_IDENTITY=$(gcloud logging sinks describe "${SINK_NAME}" --format='value(writerIdentity)' --project="${LOG_SOURCE_PROJECT_ID}")

# Role to grant
ROLE_TO_CHECK="WRITER"

bq add-iam-policy-binding \
    --role roles/bigquery.dataEditor \
    --member "serviceAccount:${WRITER_IDENTITY}" \
    "${DESTINATION_PROJECT_ID}:${DESTINATION_DATASET}" 