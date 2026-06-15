#!/usr/bin/env bash
# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

set -euo pipefail

# --- Helper Functions ---
usage() {
    cat << EOF
Usage: $0 -c <kube-context> -e <env-or-project> [additional flags for generate_deployed_config.sh]

Options:
  -c    The kubectl context to check against
  -e    The target environment or project ID (passed to generate_deployed_config.sh)
  -h    Display this help message

Any trailing flags (like -w or -m) will be seamlessly forwarded to your configuration generator.

Example:
  $0 -c gke_my-project_us-central1_prod -e prod -w website-tag-123 -m mixer-tag-123
EOF
    exit 1
}

# --- Parse Script Arguments ---
CONTEXT=""
ENV_TARGET=""
FORWARD_ARGS=()

while getopts ":c:e:h" opt; do
    case ${opt} in
        c ) CONTEXT="$OPTARG" ;;
        e ) ENV_TARGET="$OPTARG" ;;
        h ) usage ;;
        \? ) usage ;;
    esac
done
shift $((OPTIND -1))

# Capture any remaining args to pass directly to your helper script
FORWARD_ARGS+=("$@")

if [[ -z "$CONTEXT" || -z "$ENV_TARGET" ]]; then
    echo "❌ Error: Both -c (context) and -e (environment) are required parameters."
    usage
fi

# --- Prerequisites Validation ---
for cmd in kubectl jq yq; do
    if ! command -v "$cmd" &> /dev/null; then
        echo "❌ Error: Required command '$cmd' is not installed."
        exit 1
    fi
done

if [[ ! -f "./scripts/generate_deployed_config.sh" ]]; then
    echo "❌ Error: Could not find './scripts/generate_deployed_config.sh'. Run this from the repository root."
    exit 1
fi

# --- Target Context Switch ---
echo "🔄 Switching to kubectl context: $CONTEXT..."
if ! kubectl config use-context "$CONTEXT" &> /dev/null; then
    echo "❌ Error: Failed to switch to context '$CONTEXT'. Does it exist?"
    exit 1
fi

# --- Workspace Setup & Manifest Generation ---
TMP_OUT=$(mktemp -d)
trap 'rm -rf "$TMP_OUT"' EXIT

echo "📦 Generating fully rendered configurations for '$ENV_TARGET'..."
if ! ./scripts/generate_deployed_config.sh -o "$TMP_OUT" "$ENV_TARGET" ${FORWARD_ARGS[@]+"${FORWARD_ARGS[@]}"} > /dev/null; then
    echo "❌ Error: Configuration generation script failed."
    exit 1
fi

# Combine the generated YAML specs into a uniform JSON array via a local dry-run
echo "🔍 Parsing incoming manifest resource definitions..."
yq eval -o=json '.' "$TMP_OUT"/*.yaml | jq -s '{apiVersion: "v1", kind: "List", items: .}' > "$TMP_OUT/chart.json"

# --- Cluster Metrics Aggregation ---
echo "🖥️ Fetching cluster node topology and current workload footprints..."
kubectl get nodes -o json > "$TMP_OUT/nodes.json"
kubectl get pods -A -o json > "$TMP_OUT/pods.json"

# --- Core JQ Scheduling Engine ---
echo "🧮 Simulating Kubernetes scheduling loops..."
RESULT=$(jq -n \
  --slurpfile nodes_file "$TMP_OUT/nodes.json" \
  --slurpfile pods_file "$TMP_OUT/pods.json" \
  --slurpfile chart_file "$TMP_OUT/chart.json" '
  
  # --- Core Unit Conversion Engines ---
  def to_m:
    . as $cpu |
    if $cpu == null then 0
    elif ($cpu | type) == "number" then $cpu * 1000
    elif $cpu | endswith("m") then $cpu | rtrimstr("m") | tonumber
    else ($cpu | tonumber) * 1000
    end;

  def to_mi:
    . as $mem |
    if $mem == null then 0
    elif ($mem | type) == "number" then $mem / 1024 / 1024 | floor
    elif $mem | endswith("Gi") then ($mem | rtrimstr("Gi") | tonumber) * 1024
    elif $mem | endswith("G") then ($mem | rtrimstr("G") | tonumber) * 1000 * 1000 * 1000 / 1024 / 1024 | floor
    elif $mem | endswith("Mi") then $mem | rtrimstr("Mi") | tonumber
    elif $mem | endswith("M") then ($mem | rtrimstr("M") | tonumber) * 1000 * 1000 / 1024 / 1024 | floor
    elif $mem | endswith("Ki") then ($mem | rtrimstr("Ki") | tonumber) / 1024 | floor
    else ($mem | tonumber) / 1024 / 1024 | floor
    end;

  def simulate($cluster; $pods):
    reduce $pods[] as $pod (
      { cluster: $cluster, rejected: [] };
      . as $state
      | ( [ range(.cluster | length) | select(
              (if $pod.nodepool != null then $state.cluster[.].nodepool == $pod.nodepool else true end) and
              $state.cluster[.].free_cpu >= $pod.cpu and
              $state.cluster[.].free_mem >= $pod.mem
            ) ] | first ) as $node_idx
      | if $node_idx != null then
          .cluster[$node_idx].free_cpu -= $pod.cpu |
          .cluster[$node_idx].free_mem -= $pod.mem
        else
          ( [ .cluster[] | select(if $pod.nodepool != null then .nodepool == $pod.nodepool else true end) | select(.free_cpu >= $pod.cpu) ] | length > 0 ) as $has_cpu |
          ( [ .cluster[] | select(if $pod.nodepool != null then .nodepool == $pod.nodepool else true end) | select(.free_mem >= $pod.mem) ] | length > 0 ) as $has_mem |
          ( if $has_cpu and ($has_mem | not) then "Memory"
            elif $has_mem and ($has_cpu | not) then "CPU"
            else "CPU & Memory"
            end ) as $reason |
          .rejected += [ $pod + { reason: $reason } ]
        end
    );

  ($nodes_file[0]) as $nodes |
  ($pods_file[0]) as $pods |
  ($chart_file[0]) as $chart |

  # --- Node Pool Template Discovery ---
  [ $nodes.items[] | select(.status.conditions[] | select(.type=="Ready" and .status=="True")) | {
      nodepool: (.metadata.labels["cloud.google.com/gke-nodepool"] // "default-pool"),
      machine_type: (.metadata.labels["node.kubernetes.io/instance-type"] // .metadata.labels["beta.kubernetes.io/instance-type"] // "standard-node"),
      alloc_cpu: (.status.allocatable.cpu | to_m),
      alloc_mem: (.status.allocatable.memory | to_mi)
  } ] | unique_by(.nodepool) as $pool_templates |

  # --- Node Blueprint Construction ---
  [ $nodes.items[] | select(.status.conditions[] | select(.type=="Ready" and .status=="True")) | {
      name: .metadata.name,
      nodepool: (.metadata.labels["cloud.google.com/gke-nodepool"] // "default-pool"),
      alloc_cpu: (.status.allocatable.cpu | to_m),
      alloc_mem: (.status.allocatable.memory | to_mi),
      req_cpu: 0,
      req_mem: 0
  } ] as $nodes_base
  
  # Deduct resources already claimed by active, non-terminal workloads
  | reduce ($pods.items[] | select(.status.phase != "Succeeded" and .status.phase != "Failed" and .spec.nodeName != null)) as $p (
      $nodes_base;
      map(if .name == $p.spec.nodeName then
            .req_cpu += ([ $p.spec.containers[] | .resources.requests.cpu // "0m" | to_m ] | add) |
            .req_mem += ([ $p.spec.containers[] | .resources.requests.memory // "0Mi" | to_mi ] | add)
          else . end)
    )
  | map(.free_cpu = (.alloc_cpu - .req_cpu) | .free_mem = (.alloc_mem - .req_mem)) as $cluster_start

  # --- Workload Footprint Analysis ---
  | [ $chart.items[] | select(.kind == "Deployment" or .kind == "StatefulSet" or .kind == "DaemonSet" or .kind == "Pod" or .kind == "Job") | {
      kind: .kind,
      name: .metadata.name,
      nodepool: (.spec.template.spec.nodeSelector["cloud.google.com/gke-nodepool"] // .spec.nodeSelector["cloud.google.com/gke-nodepool"] // null),
      replicas: (if .kind == "DaemonSet" then 1 elif .kind == "Pod" or .kind == "Job" then 1 else (.spec.replicas // 1) end),
      cpu: ([ (.spec.template.spec.containers // .spec.containers // [])[] | .resources.requests.cpu // "0m" | to_m ] | add),
      mem: ([ (.spec.template.spec.containers // .spec.containers // [])[] | .resources.requests.memory // "0Mi" | to_mi ] | add)
  } ] as $workloads

  | ([ $workloads[] | select(.kind == "DaemonSet") | .cpu ] | add // 0) as $ds_cpu
  | ([ $workloads[] | select(.kind == "DaemonSet") | .mem ] | add // 0) as $ds_mem
  | ($cluster_start | map(.free_cpu -= $ds_cpu | .free_mem -= $ds_mem)) as $cluster_after_ds

  | [ $workloads[] | select(.kind != "DaemonSet") | . as $w | range(.replicas) | { kind: $w.kind, name: $w.name, instance: ., nodepool: $w.nodepool, cpu: $w.cpu, mem: $w.mem } ]
  | sort_by(-.cpu) as $pending_pods

  | simulate($cluster_after_ds; $pending_pods) as $init_sim
  | if ($init_sim.rejected | length) == 0 then
      { deployable: true }
    else
      {
        cluster: $init_sim.cluster,
        pending_pods: $pending_pods,
        rejected: $init_sim.rejected,
        initial_failures: $init_sim.rejected,
        recommendations: {},
        pool_info: {},
        unscalable: false,
        unscalable_failures: []
      } |
      until( (.rejected | length == 0) or .unscalable;
        . as $state |
        .rejected[0] as $target_pod |
        [ $pool_templates[] | select(
            (if $target_pod.nodepool != null then .nodepool == $target_pod.nodepool else true end) and
            .alloc_cpu >= $target_pod.cpu and
            .alloc_mem >= $target_pod.mem
          ) ] as $valid_pools |
        if ($valid_pools | length) == 0 then
          .unscalable = true | .unscalable_failures += [$target_pod]
        else
          $valid_pools[0] as $chosen |
          {
            name: "virtual-node-\(.recommendations[$chosen.nodepool] // 0)",
            nodepool: $chosen.nodepool,
            alloc_cpu: $chosen.alloc_cpu,
            alloc_mem: $chosen.alloc_mem,
            free_cpu: ($chosen.alloc_cpu - $ds_cpu),
            free_mem: ($chosen.alloc_mem - $ds_mem)
          } as $vnode |
          .recommendations[$chosen.nodepool] = (.recommendations[$chosen.nodepool] // 0) + 1 |
          .pool_info[$chosen.nodepool] = $chosen.machine_type |
          .cluster += [$vnode] |
          simulate(.cluster; .rejected) as $next_sim |
          .cluster = $next_sim.cluster |
          .rejected = $next_sim.rejected
        end
      ) |
      if .unscalable then
        { deployable: false, unscalable: true, failures: .unscalable_failures }
      else
        { deployable: false, unscalable: false, failures: .initial_failures, recommendations: .recommendations, pool_info: .pool_info }
      end
    end
')

# --- Evaluation Results ---
echo "--------------------------------------------------"
if echo "$RESULT" | jq -e '.deployable' > /dev/null; then
    echo "✅ SUCCESS: The cluster has enough schedulable overhead! The chart is completely deployable."
    exit 0
elif echo "$RESULT" | jq -e '.unscalable' > /dev/null; then
    echo "❌ FAILURE: Workloads exceed the maximum capacity of any single node template."
    echo ""
    echo "The following workload instances cannot fit onto any available node pool template:"
    echo "$RESULT" | jq -r '
      ["POD NAME", "INSTANCE", "REQUIRED CPU", "REQUIRED MEMORY", "LIMITING FACTOR"],
      (.failures[] | ["\(.kind)/\(.name)", "\(.instance)", "\(.cpu)m", "\(.mem)Mi", "Exceeds Node Limit"])
      | @tsv
    ' | column -t -s $'\t' | sed 's/^/  /'
    exit 1
else
    echo "❌ FAILURE: The deployment will fail or hang due to insufficient current node resources."
    echo ""
    echo "The following workload instances could not be scheduled onto the current cluster:"
    echo "$RESULT" | jq -r '
      ["POD NAME", "INSTANCE", "REQUIRED CPU", "REQUIRED MEMORY", "LIMITING FACTOR"],
      (.failures[] | ["\(.kind)/\(.name)", "\(.instance)", "\(.cpu)m", "\(.mem)Mi", .reason])
      | @tsv
    ' | column -t -s $'\t' | sed 's/^/  /'
    echo ""
    echo "💡 Recommendation: To make this configuration deployable, scale the following node pools:"
    echo "$RESULT" | jq -r '. as $res | .recommendations | to_entries[] | "  - Scale node pool '\''\(.key)'\'' by +\(.value) node\(if .value > 1 then "s" else "" end) (\($res.pool_info[.key]))"'
    exit 1
fi