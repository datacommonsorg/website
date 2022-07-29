# Helm charts.

Each folder of this directory contains a single [helm chart](https://helm.sh/docs/topics/charts/).

A single helm chart organizes a collection of templatized k8s yaml files.

The following processes use the dc_website_v1 chart as an example.

## Validating a helm chart.

When making changes to helm charts, a useful feature is to print the raw yaml file given some value files. This ensures that the templates render correctly.

1. Create a yaml file by following examples in specific readmes, for example my.values.yaml. Note that this is a separate file from values.yaml inside the chart. my.values.yaml overwrites on top of values.yaml.

2. Run the [helm template](https://helm.sh/docs/helm/helm_template/) command using the my.values.yaml file from above.
```
helm -f my.values.yaml template dc_website_v1/
```


## Releasing a helm chart.

Releasing a helm chart packages and uploads a helm chart into [AR(Artifact Registry)](https://cloud.google.com/artifact-registry/docs/overview) as a versioned artifact. Once released, the chart will be accessible by the public, given that the access to AR repository is configured.

1. Skip this step for upgrades. Make sure that an AR docker repository exists. If not, please follow the instructions [here](https://cloud.google.com/artifact-registry/docs/helm) to create one.

2. Update the version field in Chart.yaml. The version follows the [semantic versioning](https://semver.org/) format.

3. Go the specific chart.

```
cd buid/helm/dc_website_v1
```

4. Run the [helm package](https://helm.sh/docs/helm/helm_package/) command.

```
helm package .
```

5. Run the [helm push](https://helm.sh/docs/helm/helm_push/) command. Replace the tgz file with the filename from step 4.

```
helm push \
  dc-website-0.1.0.tgz \
  oci://us-docker.pkg.dev/datcom-ci/dev-website-helm-chart
```
