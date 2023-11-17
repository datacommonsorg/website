package websitev1

import (
	"crypto/tls"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
	"time"

	"github.com/gruntwork-io/terratest/modules/helm"
	http_helper "github.com/gruntwork-io/terratest/modules/http-helper"
	"github.com/gruntwork-io/terratest/modules/k8s"
	"github.com/gruntwork-io/terratest/modules/terraform"
	"github.com/stretchr/testify/assert"
)

const (
	WebsiteImageProject   = "datcom-ci"
	MixerImageProject     = "datcom-ci"
	ProjectID             = "custom-dc-test"
	WebsiteDomain         = "custom-dc-test.alex-datacommons.dev"
	ReleaseWebsiteGithash = "1ea8f35"
	ReleaseMixerGithash   = "23a1a90"

	KubeContextName = "gke_custom-dc-test_us-central1-a_datacommons-us-central1-a"
	TfStateBucket   = "custom-dc-test-terraform-state"
	TfStatePrefix   = "integration_test/website_v1"
	TfVarFile       = "variables.tfvars.integration_test"
)

// Use a separate KUBECONFIG for testing instead of the default $HOME/.kube/config
func init() {
	// KUBECONFIG determines where gcloud will fetch gke config to.
	ex, err := os.Executable()
	if err != nil {
		panic(err)
	}
	dir := filepath.Dir(ex)
	os.Setenv("KUBECONFIG", filepath.Join(dir, "config"))
}

// importStates imports the states of existing GCP resources into Terraform
// Once imported, Terraform will not attempt to create the resource again because
// Terrraform states are the source of truth.
//
// On the occasion that previous runs of tests failed and the state
// for the resources below were not removed, they can be manually removed before
// running this test, like below (run in website root dir).
/*
cd deploy/terraform-datacommons-website/examples/website_v1 && \
rm -rf .terraform && \
terraform init \
	-backend-config="bucket=custom-dc-test-terraform-state"
	-backend-config="prefix=integration_test/website_v1" && \
terraform state rm \
	google_compute_managed_ssl_certificate.dc_website_cert
*/
func importStates(t *testing.T, options *terraform.Options) error {
	args := []string{"import", fmt.Sprintf("--var-file=%s", options.VarFiles[0])}
	// Certificates are attached to loadbalancers(created by ingress). After LB is destroyed upon helm destroy,
	// it takes a while for the cert to be deletable, so it is kept out of the test loop and is imported each time.
	terraform.RunTerraformCommand(t, options, append(args, "google_compute_managed_ssl_certificate.dc_website_cert", "dc-website-cert")...)
	// API keys can only be soft deleted, which Terraform does during delete operations. Creating it again will error out.
	terraform.RunTerraformCommand(t, options, append(args, "module.apikeys.google_apikeys_key.maps_api_key", "maps-api-key")...)
	return nil
}

// removeStates removes Terraform states for a subset of resoures.
// Once certain states are removed, Terrafrom deletions will no longer destroy those resources.
func removeStates(t *testing.T, options *terraform.Options) error {
	args := []string{"state", "rm"}
	terraform.RunTerraformCommand(t, options, append(args, "module.apikeys.google_apikeys_key.maps_api_key")...)
	terraform.RunTerraformCommand(t, options, append(args, "module.esp.google_endpoints_service.mixer_endpoint")...)
	terraform.RunTerraformCommand(t, options, append(args, "module.esp.google_project_service.project")...)
	terraform.RunTerraformCommand(t, options, append(args, "google_compute_managed_ssl_certificate.dc_website_cert")...)
	return nil
}

// veifyWebsiteDeployment tests the status of DC website deployment within k8s.
func veifyWebsiteDeployment(t *testing.T) {
	sleepBetweenRetries, err := time.ParseDuration("30s")
	if err != nil {
		t.Fatalf("Failed to parse sleep duration. Please fix the code in veifyWebsiteDeployment: %v", err)
	}
	options := http_helper.HttpGetOptions{
		Url:       fmt.Sprintf("https://%s", WebsiteDomain),
		TlsConfig: &tls.Config{},
		Timeout:   10, // Seconds
	}
	http_helper.HttpGetWithRetryWithCustomValidationWithOptions(
		t,
		options,
		60, // Retries,
		sleepBetweenRetries,
		func(code int, _ string) bool {
			// Validation function. For now, just check the status of the home page.
			return code == http.StatusOK
		},
	)
}

// mixerPathTo returns relative path to mixer givin path within mixer repo.
func mixerPathTo(relativePath string) string {
	return filepath.Join("../../../../mixer", relativePath)
}

// testWebsiteDeployment is a helper function to test the actual website.
// Website deployment is done in the context of k8s resources.
// For integration testing, this function is to be sandwiched between
// infra setup and teardown.
func testWebsiteDeployment(t *testing.T) {
	options := &helm.Options{
		KubectlOptions: k8s.NewKubectlOptions(
			KubeContextName,         // context name
			os.Getenv("KUBECONFIG"), // kubeconfig path
			"website",               // namespace
		),
		SetValues: map[string]string{
			"website.image.project":      WebsiteImageProject,
			"website.image.tag":          ReleaseWebsiteGithash,
			"website.githash":            ReleaseWebsiteGithash,
			"mixer.image.project":        MixerImageProject,
			"mixer.image.tag":            ReleaseMixerGithash,
			"mixer.githash":              ReleaseMixerGithash,
			"website.gcpProjectID":       ProjectID,
			"website.domain":             WebsiteDomain,
			"website.secretGCPProjectID": ProjectID,
			"mixer.hostProject":          ProjectID,
			"mixer.serviceName":          fmt.Sprintf("website-esp.endpoints.%s.cloud.goog", ProjectID),
			"ingress.enabled":            "true",
		},
		SetFiles: map[string]string{
			"mixer.schemaConfigs.\"base\\.mcf\"":   mixerPathTo("deploy/mapping/base.mcf"),
			"mixer.schemaConfigs.\"encode\\.mcf\"": mixerPathTo("deploy/mapping/encode.mcf"),
			// Warning: This will be off from ReleaseMixerGithash
			"kgStoreConfig.bigqueryVersion":  mixerPathTo("deploy/storage/bigquery.version"),
			"kgStoreConfig.baseBigtableInfo": mixerPathTo("deploy/storage/base_bigtable_info.yaml"),
		},
	}

	helmChartPath := "../../helm_charts/dc_website"
	releaseName := "dc-website-e2e"
	helm.Upgrade(t, options, helmChartPath, releaseName)
	// defer helm.Delete(t, options, releaseName, true)
	veifyWebsiteDeployment(t)
}

func fetchKubeConfig(t *testing.T, clusterName string) {
	// gcloud container clusters get-credentials datacommons-us-central1 --region us-central1 --project datcom-website-dev
	// TODO(alexyfchen): Support different zones / regions.
	cmd := exec.Command(
		"gcloud", "container", "clusters", "get-credentials",
		clusterName, "--zone", "us-central1-a", "--project", ProjectID)
	if err := cmd.Run(); err != nil {
		t.Fatalf("Failed to fetch kubeconfig: %v", err)
	}
}

// TestWebsiteV1 is an E2E test for the setup  of Custom DC website.
func TestWebsiteV1(t *testing.T) {
	// For a list of supported options, please see:
	// https://github.com/gruntwork-io/terratest/blob/master/modules/terraform/options.go
	terraformOptions := terraform.WithDefaultRetryableErrors(t, &terraform.Options{
		// Set the path to the Terraform code that will be tested.
		TerraformDir: "../examples/website_v1",
		VarFiles:     []string{TfVarFile},
		BackendConfig: map[string]interface{}{
			"bucket": TfStateBucket,
			"prefix": TfStatePrefix,
		},
	})

	// Ideally we would like to issue 1 Terraform command to create/delete all resources.
	// This can be done for most resources, but a small number of resources cannot be deleted
	// into a blank state. For example, GCP only allows api keys and ESP service definitions to soft delete.
	// Attempting to re-create a soft deleted resource will result in an error.
	//
	// Such resources are not created/deleted in the test cycle, but are updated.
	// This is done by importing states before apply, and removing from states after apply.
	//
	// For example, ESP service definition is imported before apply.
	// If the service definition changes, this is updated in the "apply" phase, and then removed
	// from states. Next iteration of tests will have the updated definition.
	terraform.Init(t, terraformOptions)
	importStates(t, terraformOptions)
	terraform.Apply(t, terraformOptions)
	removeStates(t, terraformOptions)
	defer terraform.Destroy(t, terraformOptions) // "Similar to: terraform destroy"

	clusterName := terraform.Output(t, terraformOptions, "cluster_name")
	assert.Equal(t, "datacommons-us-central1-a", clusterName)

	// Deploy all k8s resources and verify the website is set up correctly before teardown.
	fetchKubeConfig(t, clusterName)
	testWebsiteDeployment(t)
}
