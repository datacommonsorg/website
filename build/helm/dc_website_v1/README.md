# Helm Charts

The DC website can be installed into a GKE cluster using [helm](https://helm.sh/).


# How to install the DC website on a live GKE cluster.

## Prerequisites

- A live GKE cluster with [workload identiy](https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity) enabled. This is a one time setup.
- [A global static IP reserved](https://cloud.google.com/compute/docs/ip-addresses/reserve-static-external-ip-address).
- Domain(s) from your choice of DNS provider, and have the a [DNS type A record](https://en.wikipedia.org/wiki/List_of_DNS_record_types) which points from the domain to the IP from above.

Note: DNS record takes up to 72 hours to propagate. While the helm chart
can still be installed before it is completed, the load balancer that is created by the chart may not be ready until then.


## Installation

1. Make sure that the k8s credentials are configured. You can visit the GCP UI and click "CONNECT" on your cluster's page to get the command to configure the credentials.

![Alt text](images/cluster.png?raw=true "credentials")

The command below should point to your cluster.

```
kubectl config current-context
```

2. Paste the template below into a new file called instance-values.yaml.

```
website:
  domains: ["your-website-domain"]
  githash: "your-website-githash"
  ingress:
    annotations:
      kubernetes.io/ingress.global-static-ip-name: "your-external-global-static-ip-name"
  flask:
    secretGCPProjectID: "your-flasks-secret-gcp-project"
  iap:
    enabled: true
    clientID: "your-iap-client-id"
    secret: "your-iap-secret"

mixer:
  gcpProjectID: "your-mixer-gcp-project-id"
  githash: "your-mixer-githash"

namespace:
  name: "your-namespace"

serviceAccount:
  annotations: {
    iam.gke.io/gcp-service-account: "your-robot-google-service-account"
  }

kgStoreConfig:
  bigqueryVersion: "your-bigquery-version"
  bigtableImportGroupsVersion: |
    <content-of-bigtable-import-group-version-file>
  storeProjectID: "your-storage-project-gcp-id
```

3. Fill out all the instance specific variables from above.

Note: the iap block is optional. If you want the website to be publicly accessible(anyone on the internet can access it), remove the iap block.

4. Optional. Run an install in dry-run mode to see if there are no validation errors.

```
helm install \
  -f instance-values.yaml \
  oci://us-docker.pkg.dev/datcom-ci/dev-website-helm-chart/dc-website \
  --version 0.1.0 \
  --dry-run
```

5. Run the [helm install](https://helm.sh/docs/helm/helm_install/) command.

```
helm install \
  -f instance-values.yaml \
  oci://us-docker.pkg.dev/datcom-ci/dev-website-helm-chart/dc-website \
  --version 0.1.0 \
```

Note: Please expect ~2hours for the managed certificate to provision, this is assuming that the DNS records are already propagated.
