# Cloud Deploy & Helm Configuration

Cloud Deploy pipelines defined in `clouddeploy.yaml` and `skaffold.yaml` render each Helm release using a 2-layer values hierarchy (chart base `values.yaml` overridden by a single environment YAML file, plus deploy-time `githash` via `setValueTemplates`):

| Release / Service | Base Chart (`values.yaml`) | Per-Environment Overrides (`dev`, `autopush`, `staging`, `prod`) |
| :--- | :--- | :--- |
| Website (`datacommons-website-release`) | `deploy/helm_charts/dc_website/values.yaml` | `deploy/helm_charts/envs/<env>.yaml` |
| Website's Bundled Mixer (`dc-mixer`) | `mixer/deploy/helm_charts/mixer/values.yaml` | `deploy/helm_charts/envs/website_mixer_<env>.yaml` |
| Standalone Mixer (`mixer-<env>`) | `mixer/deploy/helm_charts/mixer/values.yaml` | `mixer/deploy/helm_charts/envs/mixer_<env>.yaml` (in `datacommonsorg/mixer`) |

## Key Notes

* **No cross-inheritance between standalone and bundled Mixer**: `website_mixer_<env>.yaml` overrides `mixer/deploy/helm_charts/mixer/values.yaml` directly and does not inherit from `mixer_<env>.yaml`. When changing a setting that applies to both standalone Mixer (`api.datacommons.org`) and website's bundled Mixer (`datacommons.org`), update both files.
* **Routing vs. pod sizing for `serviceGroups`**: `deploy/helm_charts/dc_website/values.yaml` defines `serviceGroups.*.urlPaths` strictly to render the `ingress-config` routing ConfigMap used by `website-app`. Replica counts, memory limits, and `goMemLimit` for bundled Mixer pods live in `deploy/helm_charts/envs/website_mixer_<env>.yaml`.
* **Cloud Endpoints predeploy script**: `scripts/deploy_cloud_esp.sh` reads `project`, `cluster_prefix`, and `mixer.serviceName` from `deploy/helm_charts/envs/website_mixer_<env>.yaml` for website deployments and `mixer/deploy/helm_charts/envs/mixer_<env>.yaml` for standalone Mixer deployments.
