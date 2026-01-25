variable "gcp_project_id" {
  description = "The GCP project ID."
  type        = string
  default     = "datcom-website-dev"
}

variable "gcp_region" {
  description = "The GCP region."
  type        = string
  default     = "us-west1"
}

variable "gemini_api_key_value" {
  description = "The Gemini API key."
  type        = string
  sensitive   = true
}

variable "image_tag" {
  description = "The tag of the metadata augmenter image."
  type        = string
  default     = "latest"
}
