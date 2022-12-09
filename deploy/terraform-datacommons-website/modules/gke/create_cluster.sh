
#!/bin/bash

gcloud container clusters create $CLUSTER_NAME \
  --num-nodes=$NODES \
  --region=$REGION \
  --project=$PROJECT_ID \
  --machine-type=e2-highmem-4 \
  --enable-ip-alias \
  --workload-pool=$PROJECT_ID.svc.id.goog \
  --scopes=https://www.googleapis.com/auth/trace.append
