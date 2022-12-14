# Helm Charts

The DC website can be installed into a GKE cluster using [helm](https://helm.sh/).

## How to install the DC website on a live GKE cluster

### Prerequisites

- A GKE cluster. If you do not already have one, please follow [instructions](https://cloud.google.com/kubernetes-engine/docs/how-to/creating-a-regional-cluster) to create a regional GKE cluster.
- GKE cluster should have [workload identiy](https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity) enabled. This is a one time setup.
- [A global static IP reserved](https://cloud.google.com/compute/docs/ip-addresses/reserve-static-external-ip-address).
- Domain from your choice of DNS provider, and have the a [DNS type A record](https://en.wikipedia.org/wiki/List_of_DNS_record_types) which points from the domain to the IP from above.
- Certificate for the domain provided. For example, from [Cloudflare](https://www.cloudflare.com/ssl/).

Note: DNS record takes up to 72 hours to propagate. While the helm chart
can still be installed before it is completed, the load balancer that is created by the chart may not be ready until then.

### Installation

1. Make sure that the k8s credentials are configured. You can visit the GCP UI and click "CONNECT" on your cluster's page to get the command to configure the credentials.

![Alt text](../images/cluster.png?raw=true "cluster.png")

The command below should point to your cluster.

```sh
kubectl config current-context
```

2. Paste the template below into a new file called instance-values.yaml.

```yaml
website:
  gcpProjectID: <GCP project>
  domain: <Your domain>

  flaskEnv: custom
  secretGCPProjectID: <GCP project>

mixer:
  gcpProjectID: <GCP project>
  serviceName: <Cloud Endpoints service name>

serviceAccount:
  name: <KSA name>

ingress:
  enabled: true
  annotations:
    {
      kubernetes.io/ingress.global-static-ip-name: <Your GCP global static IP>,
      ingress.gcp.kubernetes.io/pre-shared-cert: <Your self managed certificate name from GCP>,
    }
```

3. Fill out all the instance specific variables from above.

#### GCP project

The GCP project id where the website is to be deployed.

Same value will apply for website.gcpProjectID, website.secretGCPProjectID, mixer.gcpProjectID.

#### website.domain

Website domain that you own.

#### serviceAccount.name

Name of the k8s service account to be used as the GCP identity of the DC website.

This assumes that the [workload identity setup process](https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity) has been follow.

Confirm the SA exists by calling `kubectl -n website get serviceaccount` in termimal.

#### ingress.annotations - Global static ip

The name of the [global static ip](https://cloud.google.com/compute/docs/ip-addresses/reserve-static-external-ip-address) that was reserved from GCP.

Note that this needs to be in the same GCP project as the GCP project specified elsewhere in your DC helm config.

#### ingress.annotations - Preshared certificate

The name of the [self managed certificate](https://cloud.google.com/load-balancing/docs/ssl-certificates/self-managed-certs) from GCP.

Please follow the [offical doc](https://cloud.google.com/load-balancing/docs/ssl-certificates/self-managed-certs#createresource) to create one from your cert and key from your ssl provider.

4. Run the [helm install](https://helm.sh/docs/helm/helm_install/) command from the root directory of Website repo.

```sh
git submodule foreach git pull origin master
git submodule update --init --recursive

TAG=$(git rev-parse --short=7 HEAD)

cd mixer
MIXER_TAG=$(git rev-parse --short=7 HEAD)
cd ..

helm upgrade --install \
  dc-website deploy/helm_charts/dc_website \
  --atomic \
  --debug \
  --timeout 10m \
  -f values.yaml \
  --set website.githash="$TAG" \
  --set mixer.githash="$MIXER_TAG" \
  --set-file mixer.schemaConfigs."base\.mcf"=mixer/deploy/mapping/base.mcf \
  --set-file mixer.schemaConfigs."encode\.mcf"=mixer/deploy/mapping/encode.mcf \
  --set-file kgStoreConfig.bigqueryVersion=mixer/deploy/storage/bigquery.version \
  --set-file kgStoreConfig.baseBigtableInfo=mixer/deploy/storage/base_bigtable_info.yaml
```
