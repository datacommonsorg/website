{{/*
Expand the name of the chart.
*/}}
{{- define "dc-website.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "dc-website.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "dc-website.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "dc-website.labels" -}}
helm.sh/chart: {{ include "dc-website.chart" . }}
{{ include "dc-website.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Validate an optional Cloud Armor security policy name (RFC 1035 lowercase label, 1-63 chars).
Expects a dict with "name" (values path for error messages) and "value".
Shared so staging/prod (ingress.enabled: false) are validated alongside single-cluster charts.
*/}}
{{- define "dc-website.validateSecurityPolicy" -}}
{{- $policy := .value -}}
{{- if $policy -}}
  {{- $err := printf "Invalid %s %v: must be a Cloud Armor policy name (RFC 1035 lowercase label, 1-63 chars, no '/')" .name $policy -}}
  {{- if not (kindIs "string" $policy) -}}
    {{- fail $err -}}
  {{- else if not (regexMatch "^[a-z]([-a-z0-9]{0,61}[a-z0-9])?$" $policy) -}}
    {{- fail $err -}}
  {{- end -}}
{{- end -}}
{{- end -}}

{{/*
Validate an optional GCP SSL certificate name or comma-separated list of certificate names
(each entry an RFC 1035 lowercase label, 1-63 chars, no empty entries or duplicates).
Expects a dict with "name" (values path for error messages) and "value".
*/}}
{{- define "dc-website.validatePreSharedCerts" -}}
{{- $certs := .value -}}
{{- if $certs -}}
  {{- $err := printf "Invalid %s %v: must be a comma-separated list of GCP SSL certificate names (RFC 1035 lowercase labels, 1-63 chars, no '/', no empty or duplicate entries)" .name $certs -}}
  {{- if not (kindIs "string" $certs) -}}
    {{- fail $err -}}
  {{- end -}}
  {{- $seen := dict -}}
  {{- range (splitList "," $certs) -}}
    {{- $cert := trim . -}}
    {{- if or (not $cert) (not (regexMatch "^[a-z]([-a-z0-9]{0,61}[a-z0-9])?$" $cert)) (hasKey $seen $cert) -}}
      {{- fail $err -}}
    {{- end -}}
    {{- $_ := set $seen $cert true -}}
  {{- end -}}
{{- end -}}
{{- end -}}

{{/*
Validate an optional reCAPTCHA Enterprise site key ID (characters [A-Za-z0-9_-]+).
Expects a dict with "name" (values path for error messages) and "value".
*/}}
{{- define "dc-website.validateRecaptchaSiteKey" -}}
{{- $key := .value -}}
{{- if $key -}}
  {{- $err := printf "Invalid %s %v: must be a site key ID matching [A-Za-z0-9_-]+" .name $key -}}
  {{- if not (kindIs "string" $key) -}}
    {{- fail $err -}}
  {{- else if not (regexMatch "^[A-Za-z0-9_-]+$" $key) -}}
    {{- fail $err -}}
  {{- end -}}
{{- end -}}
{{- end -}}

{{/*
Selector labels
*/}}
{{- define "dc-website.selectorLabels" -}}
app.kubernetes.io/name: {{ include "dc-website.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Pod-level securityContext fields.
*/}}
{{- define "dc-website.podSecurityContext" -}}
securityContext:
  runAsNonRoot: true
  seccompProfile:
    type: RuntimeDefault
{{- end }}

{{/*
Container-level securityContext fields. Expects a dict with "uid" and "gid".
*/}}
{{- define "dc-website.containerSecurityContext" -}}
securityContext:
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  runAsNonRoot: true
  runAsUser: {{ .uid }}
  runAsGroup: {{ .gid }}
  capabilities:
    drop:
      - ALL
{{- end }}
