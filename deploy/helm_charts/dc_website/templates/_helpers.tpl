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

{{/*
Validate that a required numeric Helm value is an unquoted positive integer.
Expects a dict with "name" (values path for error messages) and "value".
*/}}
{{- define "dc-website.validatePositiveInt" -}}
{{- $raw := .value -}}
{{- if kindIs "invalid" $raw -}}
  {{- fail (printf "Missing: %s" .name) -}}
{{- end -}}
{{- if not (or (kindIs "int" $raw) (kindIs "int64" $raw) (kindIs "float64" $raw)) -}}
  {{- fail (printf "Invalid %s %#v: must be an unquoted positive integer" .name $raw) -}}
{{- end -}}
{{- if kindIs "float64" $raw -}}
  {{- if not (and (gt $raw -9223372036854775808.0) (lt $raw 9223372036854775808.0)) -}}
    {{- fail (printf "Invalid %s %v: must be a positive integer" .name $raw) -}}
  {{- end -}}
{{- end -}}
{{- $n := int64 $raw -}}
{{- if kindIs "float64" $raw -}}
  {{- if ne (float64 $n) $raw -}}
    {{- fail (printf "Invalid %s %v: must be a positive integer" .name $raw) -}}
  {{- end -}}
{{- end -}}
{{- if le $n 0 -}}
  {{- fail (printf "Invalid %s %d: must be a positive integer" .name $n) -}}
{{- end -}}
{{- end }}

{{/*
Compute DAILY_TOKEN_BUDGET_PER_INSTANCE for each Discover pod by splitting the
environment-wide daily Gemini token budget evenly across all pods in all
deployed clusters (agentic.replicas * agentic.clusterCount), using integer floor
division so the sum across all pods never exceeds the environment cap.
Returns a plain integer string (not scientific notation).
*/}}
{{- define "dc-website.discoverDailyTokenBudgetPerInstance" -}}
{{- include "dc-website.validatePositiveInt" (dict "name" "agentic.discover.dailyTokenBudget" "value" .Values.agentic.discover.dailyTokenBudget) -}}
{{- include "dc-website.validatePositiveInt" (dict "name" "agentic.replicas" "value" .Values.agentic.replicas) -}}
{{- include "dc-website.validatePositiveInt" (dict "name" "agentic.clusterCount" "value" .Values.agentic.clusterCount) -}}
{{- $budget := int64 .Values.agentic.discover.dailyTokenBudget -}}
{{- $replicas := int64 .Values.agentic.replicas -}}
{{- $clusters := int64 .Values.agentic.clusterCount -}}
{{- $totalInstances := mul $replicas $clusters -}}
{{- if or (le $totalInstances 0) (ne (div $totalInstances $replicas) $clusters) -}}
  {{- fail (printf "Invalid agentic instance count (%d replicas * %d clusters): overflow" $replicas $clusters) -}}
{{- end -}}
{{- if lt $budget $totalInstances -}}
  {{- fail (printf "Invalid agentic.discover.dailyTokenBudget %d: must be >= total instances (%d = %d replicas * %d clusters)" $budget $totalInstances $replicas $clusters) -}}
{{- end -}}
{{- printf "%d" (div $budget $totalInstances) -}}
{{- end }}
