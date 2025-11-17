# # Load constants
source ./usage_log_setup/.env

# The destination BigQuery table for the log sink
DESTINATION="bigquery.googleapis.com/projects/${DESTINATION_PROJECT_ID}/datasets/${DESTINATION_DATASET}/tables/${DESTINATION_TABLE}"

# # Create the destination dataset if it doesn't exist
# Docs: https://cloud.google.com/bigquery/docs/datasets#bq
# The destination dataset must exist before creating the sink.
if bq show --format=prettyjson "${DESTINATION_PROJECT_ID}:${DESTINATION_DATASET}" > /dev/null 2>&1; then
    echo "Dataset ${DESTINATION_DATASET} already exists in project ${DESTINATION_PROJECT_ID}. Continuing..."
else
    echo "Dataset ${DESTINATION_DATASET} not found. Creating dataset..."
    # We don't manually define a table, because the logger will automatically create it with a schema based on the logs injested.
    bq --location=US mk \
        --dataset \
        --description="${DATASET_DESCRIPTION}" \
        ${DESTINATION_PROJECT_ID}:${DESTINATION_DATASET}
    echo "Created dataset ${DESTINATION_DATASET} in project ${DESTINATION_PROJECT_ID}."
fi

# Confirm that the destination table does NOT exist, because this will be created automatically by the log sink.
if bq show --format=prettyjson "${DESTINATION_PROJECT_ID}:${DESTINATION_DATASET}.${DESTINATION_TABLE}" > /dev/null 2>&1; then
    echo "Table ${DESTINATION_PROJECT_ID}:${DESTINATION_DATASET}.${DESTINATION_TABLE} already exists. Please choose a destination dataset where the `${DESTINATION_TABLE}` table does not already exist." \
        "The log router will create this table automatically and determine the new table's schema."
    exit 1
fi

# Create the logging sink for each project in LOG_SOURCE_PROJECT_IDS
# This is configured to process multiple projects' logs to the same destination table.
for project_id in $LOG_SOURCE_PROJECT_IDS; do
    echo "Creating sink for project: ${project_id}"

    # Create the logging sink
    # destination: a BigQuery table, e.g. bigquery.googleapis.com/projects/<PROJECT_ID>/datasets/<DATASET_NAME>
    # log_filter: an attribute unique to the usage logs – should be a unique message like “usage_log_data”.
    # use-partitioned-tables: tables grouped by day, which reduces storage costs.
    # project: your GCP project ID for the project where the logs are coming from.
    # TODO: skip if this already exists
    gcloud logging sinks create \
        "${SINK_NAME}" \
        "${DESTINATION}" \
        --description="${DESCRIPTION}" \
        --log-filter="${LOG_FILTER}" \
        --use-partitioned-tables \
        --project="${project_id}"

    echo "Created sink ${SINK_NAME} in project ${project_id} that routes logs to ${DESTINATION}"

    # After creating the log sink, it won't automatically have write access to the dataset
    # We can manually grant it permission here.
    # If this doesn't work, try using the console to manually set permissions, and if you
    # run into access issues there, ask someone with Data Owner status on the dataset 
    # TODO: lucysking has intern status and that's blocking permissions here. Not 
    # totally clear exactly which roles will and will not have access to this. 
    # There might also be a better command that can streamline this but I can't test it

    # Log sink's service account
    WRITER_IDENTITY=$(gcloud logging sinks describe "${SINK_NAME}" --format='value(writerIdentity)' --project="${project_id}")

    # Grant write permission to the sink's service account
    bq add-iam-policy-binding \
        --role roles/bigquery.dataEditor \
        --member "serviceAccount:${WRITER_IDENTITY}" \
        "${DESTINATION_PROJECT_ID}:${DESTINATION_DATASET}"
    
    echo "Granted write permission to the sink's service account for project ${project_id}"
done
echo "--- Finished creating all log sinks ---" 

