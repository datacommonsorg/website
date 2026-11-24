# Add Identity-Aware Proxy

Website use [Identity-Aware Proxy (IAP)](https://cloud.google.com/iap) to guard
access. Non public instances are guarded by IAP.

To give user access to the website, need to have "IAP-secured Web App User" role
which can be added by following [this](https://cloud.google.com/iap/docs/enabling-kubernetes-howto#iap-access).

## Add IAP to a GKE deployment

Most of the steps here is from IAP [documentation](https://cloud.google.com/iap/docs/enabling-kubernetes-howto).
This lists a concrete steps to aid quick setup.

### Set GKE context

```bash
export PROJECT_ID=<PROJECT_ID>
export REGION=<GKE_REGION>
export CLUSTER_NAME=website-$REGION
gcloud config set project $PROJECT_ID
gcloud container clusters get-credentials $CLUSTER_NAME --region $REGION
```

### Configure the OAuth consent screen

Follow [documentation](https://cloud.google.com/iap/docs/enabling-kubernetes-howto#oauth-configure)

### Create OAuth credential

Follow [documentation](https://cloud.google.com/iap/docs/enabling-kubernetes-howto#oauth-credentials)

### Setup IAP access

Follow [documentation](https://cloud.google.com/iap/docs/enabling-kubernetes-howto#iap-access)

### Configure BackendConfig

#### Preferred: Declarative Helm / Multi-Cluster Ingress config

Configure IAP in `deploy/helm_charts/envs/<ENV>.yaml` so both single-cluster
Helm rollouts and `gke/update_config_cluster.sh` stay in sync:

- **`website.iap.enabled: true`**: Enables IAP on `backendconfig` (main website)
  using custom OAuth credentials stored in Kubernetes secret `iap-secret`
  (create the secret below first).
- **`agentic.iap.enabled: true`**: Independently enables IAP on
  `backendconfig-agentic` (agentic apps such as `/labs/discover`), sharing the
  same Kubernetes secret `iap-secret` so browser requests across `/labs/discover`
  and `/datacommons.js` + `/api/*` share one IAP session cookie on the same
  domain.

When either flag is `false` (default), `spec.iap` is omitted from the rendered
`BackendConfig` so Console-managed IAP settings on existing GCE backend services
are preserved.

> **Note for Multi-Cluster Ingress (MCI) environments:** IAP is configured per
> GCE `BackendService`, and Cloud IAP scopes browser session cookies per OAuth
> client ID rather than per hostname. Adding or renaming a `MultiClusterService`
> (for example, introducing `website-agentic-mcs`) creates a new GCE
> `BackendService` with IAP disabled by default unless `agentic.iap.enabled: true`
> is set or IAP is manually enabled on the new backend service in GCP Console.
> Sharing the same custom OAuth client (`iap-secret`) across both
> `backendconfig` and `backendconfig-agentic` ensures a single IAP sign-in on
> `/labs/discover` also authenticates same-host chart script and API requests
> routed to `website-mcs`. Also verify both backends inherit or define the same
> `roles/iap.httpsResourceAccessor` IAM bindings.
> `gke/update_config_cluster.sh` checks that `iap-secret` exists when either IAP
> flag is enabled, refuses to strip an existing `spec.iap.enabled: true` or
> downgrade custom `oauthclientCredentials` to Google-managed OAuth in-place,
> and warns if `website-mcs` and `website-agentic-mcs` have mismatched IAP
> enablement or OAuth client IDs in GCE.

#### Manual setup with `backendconfig_iap.yaml`

Create a Kubernetes secret (`iap-secret`) with your custom OAuth credentials,
replacing `client_id_key` and `client_secret_key` with the actual values from
OAuth setup:

```bash
kubectl create secret generic iap-secret \
    --from-literal=client_id=[client_id_key] \
    --from-literal=client_secret=[client_secret_key] -n website
```

Deploy backend config and service (`backendconfig_iap.yaml` configures both
`backendconfig` and `backendconfig-agentic` to share `iap-secret`):

```bash
# In <REPO_ROOT>/gke
kubectl apply -f backendconfig_iap.yaml
kubectl apply -f website_mcs.yaml
# [OPTIONAL] run this to deploy the agentic apps service
kubectl apply -f website_agentic_mcs.yaml
# [OPTIONAL] run this to deploy the nodejs service
kubectl apply -f website_nodejs_mcs.yaml

cp mci.yaml.tpl mci.yaml
# Update <IP> to be the static IP of the website, which can be found in
# <REPO_ROOT>/deploy/helm_charts/envs/<ENV>.yaml,
# [Optional] change the certificate to match the current SSL certificate
# [Optional] remove the nodejs path if not deploying nodejs service
kubectl apply -f mci.yaml
```

Verfify backend config

```bash
kubectl -n website -ojson get backendconfig | grep '"iap":' -C 5
```

### Verify IAP

IAP takes effect in a few minutes. To verify, access the web page in an in-cognito browser page, a Google auth windown would appear with the configured consent screen
from the step above.
