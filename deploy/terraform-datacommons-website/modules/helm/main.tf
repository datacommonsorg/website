/**
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
    }
    helm = {
      source  = "hashicorp/helm"
    }
  }
}

resource "helm_release" "datcom_website" {
  name       = "datcom-website"
  chart      = "../../../helm_charts/dc_website"

  cleanup_on_fail = true
  atomic          = true

  # Helm has a default timeout of 300 seconds.
  # To change that, uncomment the line below and set a value.
  # timeout    = 300

  set {
    name  = "resourceSuffix"
    value = var.resource_suffix
  }

  set {
    name  = "website.image.tag"
    value = var.website_githash
  }

  set {
    name  = "website.githash"
    value = var.website_githash
  }

  set {
    name  = "mixer.image.tag"
    value = var.mixer_githash
  }

  set {
    name  = "mixer.githash"
    value = var.mixer_githash
  }

  set {
    name  = "website.gcpProjectID"
    value = var.project_id
  }

  set {
    name  = "website.domain"
    value = var.dc_website_domain
  }

  set {
    name  = "website.flaskEnv"
    value = "custom"
  }

  set {
    name  = "website.secretGCPProjectID"
    value = var.project_id
  }

  set {
    name  = "mixer.hostProject"
    value = var.project_id
  }

  set {
    name  = "mixer.serviceName"
    value = format("website-esp.endpoints.%s.cloud.goog", var.project_id)
  }

  set {
    name  = "serviceAccount.name"
    value = var.website_ksa_name
  }

  set {
    name  = "ingress.enabled"
    value = var.enable_ingress
  }

  set {
    # The escaped "." is part of the key, as opposed to a separator.
    # key -> kubernetes.io/ingress.global-static-ip-name
    name = "ingress.annotations.kubernetes\\.io/ingress\\.global-static-ip-name"
    value = var.global_static_ip_name
  }

  set {
    name = "ingress.annotations.ingress\\.gcp\\.kubernetes\\.io/pre-shared-cert"
    value = var.managed_cert_name
  }

  # file based values use relative path.
  set {
    name  = "mixer.schemaConfigs.base\\.mcf"
    value = file("../../../../mixer/deploy/mapping/base.mcf")
  }

  set {
    name  = "mixer.schemaConfigs.encode\\.mcf"
    value = file("../../../../mixer/deploy/mapping/encode.mcf")
  }

  set {
    name  = "kgStoreConfig.bigqueryVersion"
    value = file("../../../../mixer/deploy/storage/bigquery.version")
  }

  set {
    name  = "kgStoreConfig.baseBigtableInfo"
    value = file("../../../../mixer/deploy/storage/base_bigtable_info.yaml")
  }

}
