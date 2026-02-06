# ONE Data Commons — Developer Commands
# Run 'just' or 'just --list' to see all available targets.
#
# Override defaults from the command line:
#   just ENV_FILE=custom_dc/one/env.staging.list run
#   just IMAGE_TAG=v1.2.0 build
#   just IMAGE_TAG=v1.2.0 push

# Configuration (override any of these from the command line)
IMAGE_NAME   := "datacommons-website-compose"
IMAGE_TAG    := "latest"
IMAGE        := IMAGE_NAME + ":" + IMAGE_TAG
ENV_FILE     := "custom_dc/one/env.list"
ENV_SAMPLE   := "custom_dc/one/env.list.sample"
DOCKERFILE   := "build/cdc_services/Dockerfile"
UPSTREAM_BRANCH := "customdc_stable"

# Load registry config from env file if it exists
DOCKER_REGISTRY := env_var_or_default("DOCKER_REGISTRY", "us-east4-docker.pkg.dev/one-data-commons/datacommons/website-compose")
GOOGLE_CLOUD_REGION := env_var_or_default("GOOGLE_CLOUD_REGION", "us-east4")

# Env file paths for convenience targets
_ENV_STAGING := "custom_dc/one/env.staging.list"
_ENV_PROD    := "custom_dc/one/env.prod.list"

# GCP Application Default Credentials path (for mounting into Docker)
GCP_ADC := env_var("HOME") / ".config/gcloud/application_default_credentials.json"

# Local data directories (read from env file, or default to sample data)
INPUT_DIR    := `{ grep -s '^INPUT_DIR=' custom_dc/one/env.list || echo "INPUT_DIR=$PWD/custom_dc/sample"; } | head -1 | cut -d= -f2`
OUTPUT_DIR   := `{ grep -s '^OUTPUT_DIR=' custom_dc/one/env.list || echo "OUTPUT_DIR=$PWD/custom_dc/sample_output"; } | head -1 | cut -d= -f2`

# Prebuilt Data Commons images (reads DC_RELEASE from local env file, or override: just DC_RELEASE=latest run-data)
DC_RELEASE       := `{ grep -s '^DC_RELEASE=' custom_dc/one/env.list || echo DC_RELEASE=stable; } | head -1 | cut -d= -f2`
DC_DATA_IMAGE    := "gcr.io/datcom-ci/datacommons-data:" + DC_RELEASE
DC_SERVICE_IMAGE := "gcr.io/datcom-ci/datacommons-services:" + DC_RELEASE

# Show available commands (default)
_default:
    @just --list --unsorted

# ── Setup & Configuration ────────────────────

# First-time setup: create env file, configure Docker auth, update submodules
setup: env-all
    #!/usr/bin/env bash
    set -euo pipefail
    echo "Configuring Docker authentication for Artifact Registry..."
    gcloud auth configure-docker {{GOOGLE_CLOUD_REGION}}-docker.pkg.dev
    echo ""
    echo "Updating git submodules..."
    ./scripts/update_git_submodules.sh
    echo ""
    echo "Setup complete. Run 'just run' to start the application."

# Create local env file with interactive prompts
env:
    #!/usr/bin/env bash
    set -euo pipefail
    TARGET="custom_dc/one/env.list"
    if [ -f "$TARGET" ]; then
        echo "$TARGET already exists. Remove it first to regenerate."
        exit 0
    fi
    echo "Creating $TARGET..."
    echo ""
    ask() {
        local prompt="$1" default="${2:-}" value
        if [ -n "$default" ]; then
            read -rp "  $prompt [$default]: " value
            echo "${value:-$default}"
        else
            while true; do
                read -rp "  $prompt: " value
                [ -n "$value" ] && break
                echo "  (required)" >&2
            done
            echo "$value"
        fi
    }
    echo "API keys (ask a team member if you don't have these):"
    DC_API_KEY=$(ask "DC API key")
    MAPS_API_KEY=$(ask "Maps API key")
    echo ""
    echo "Database:"
    echo "  Local dev uses file-based data by default."
    read -rp "  Connect to Cloud SQL instead? (y/N): " USE_SQL
    echo ""
    if [ "$USE_SQL" = "y" ] || [ "$USE_SQL" = "Y" ]; then
        CLOUDSQL_INSTANCE=$(ask "Cloud SQL instance" "one-data-commons:northamerica-northeast1:kg-staging")
        DB_PASS=$(ask "DB password")
        echo ""
    fi
    echo "Data directories:"
    echo "  Local paths are mounted into the Docker container."
    echo "  The sample/ directory has example data to get started."
    INPUT_DIR=$(ask "Input directory" "$(pwd)/custom_dc/sample")
    OUTPUT_DIR=$(ask "Output directory" "$(pwd)/custom_dc/sample_output")
    echo ""
    echo "Docker images:"
    echo "  Prebuilt DC images come in two channels:"
    echo "    stable — tested release (may be a few weeks old)"
    echo "    latest — newest build from head"
    DC_RELEASE=$(ask "Release channel" "stable")
    echo ""
    {
        echo "### ONE Data Commons — Local development ###"
        echo ""
        echo "### API keys ###"
        echo ""
        echo "DC_API_KEY=$DC_API_KEY"
        echo "MAPS_API_KEY=$MAPS_API_KEY"
        echo ""
        echo "### Data directories ###"
        echo ""
        echo "INPUT_DIR=$INPUT_DIR"
        echo "OUTPUT_DIR=$OUTPUT_DIR"
        echo ""
        echo "### Application settings ###"
        echo ""
        echo "FLASK_ENV=one"
        echo "ENABLE_MODEL=true"
        echo "GOOGLE_CLOUD_PROJECT=one-data-commons"
        echo ""
        echo "### Docker images ###"
        echo ""
        echo "DC_RELEASE=$DC_RELEASE"
        echo ""
        echo "### Database ###"
        echo ""
        if [ "$USE_SQL" = "y" ] || [ "$USE_SQL" = "Y" ]; then
            echo "USE_CLOUDSQL=true"
            echo "CLOUDSQL_INSTANCE=$CLOUDSQL_INSTANCE"
            echo "DB_NAME=datacommons"
            echo "DB_USER=datacommons"
            echo "DB_PASS=$DB_PASS"
        else
            echo "# Local dev uses SQLite by default."
            echo "# Uncomment below to connect to Cloud SQL instead."
            echo "USE_SQLITE=true"
            echo "USE_CLOUDSQL=false"
            echo "#CLOUDSQL_INSTANCE=one-data-commons:northamerica-northeast1:kg-staging"
            echo "#DB_NAME=datacommons"
            echo "#DB_USER=datacommons"
            echo "#DB_PASS="
        fi
    } > "$TARGET"
    echo "Created $TARGET"

# Create staging env file with interactive prompts
env-staging:
    #!/usr/bin/env bash
    set -euo pipefail
    TARGET="custom_dc/one/env.staging.list"
    if [ -f "$TARGET" ]; then
        echo "$TARGET already exists. Remove it first to regenerate."
        exit 0
    fi
    echo "Creating $TARGET..."
    echo ""
    ask() {
        local prompt="$1" default="${2:-}" value
        if [ -n "$default" ]; then
            read -rp "  $prompt [$default]: " value
            echo "${value:-$default}"
        else
            while true; do
                read -rp "  $prompt: " value
                [ -n "$value" ] && break
                echo "  (required)" >&2
            done
            echo "$value"
        fi
    }
    echo "API keys:"
    DC_API_KEY=$(ask "DC API key")
    MAPS_API_KEY=$(ask "Maps API key")
    echo ""
    echo "Directories:"
    INPUT_DIR=$(ask "Input directory" "gs://one-datacommons-staging/one-data")
    OUTPUT_DIR=$(ask "Output directory" "gs://one-datacommons-staging/one-data-output")
    echo ""
    echo "Database:"
    CLOUDSQL_INSTANCE=$(ask "Cloud SQL instance" "one-data-commons:us-east4:dc-graph")
    DB_PASS=$(ask "DB password")
    echo ""
    echo "Application:"
    REDIS_HOST=$(ask "Redis host" "10.143.80.83")
    ADMIN_SECRET=$(ask "Admin secret")
    echo ""
    {
        echo "### ONE Data Commons — STAGING environment ###"
        echo ""
        echo "### API keys ###"
        echo ""
        echo "DC_API_KEY=$DC_API_KEY"
        echo "MAPS_API_KEY=$MAPS_API_KEY"
        echo ""
        echo "### Directories ###"
        echo ""
        echo "INPUT_DIR=$INPUT_DIR"
        echo "OUTPUT_DIR=$OUTPUT_DIR"
        echo ""
        echo "### Database ###"
        echo ""
        echo "USE_CLOUDSQL=true"
        echo "GOOGLE_CLOUD_PROJECT=one-data-commons"
        echo "CLOUDSQL_INSTANCE=$CLOUDSQL_INSTANCE"
        echo "DB_NAME=datacommons"
        echo "DB_USER=datacommons"
        echo "DB_PASS=$DB_PASS"
        echo ""
        echo "### Application settings ###"
        echo ""
        echo "FLASK_ENV=one"
        echo "ENABLE_MODEL=true"
        echo "REDIS_HOST=$REDIS_HOST"
        echo "ADMIN_SECRET=$ADMIN_SECRET"
    } > "$TARGET"
    echo "Created $TARGET"

# Create production env file with interactive prompts
env-prod:
    #!/usr/bin/env bash
    set -euo pipefail
    TARGET="custom_dc/one/env.prod.list"
    if [ -f "$TARGET" ]; then
        echo "$TARGET already exists. Remove it first to regenerate."
        exit 0
    fi
    echo "Creating $TARGET..."
    echo ""
    ask() {
        local prompt="$1" default="${2:-}" value
        if [ -n "$default" ]; then
            read -rp "  $prompt [$default]: " value
            echo "${value:-$default}"
        else
            while true; do
                read -rp "  $prompt: " value
                [ -n "$value" ] && break
                echo "  (required)" >&2
            done
            echo "$value"
        fi
    }
    echo "API keys:"
    DC_API_KEY=$(ask "DC API key")
    MAPS_API_KEY=$(ask "Maps API key")
    echo ""
    echo "Directories:"
    INPUT_DIR=$(ask "Input directory" "gs://one-datacommons-imports-prod/")
    OUTPUT_DIR=$(ask "Output directory" "gs://one-datacommons-imports-prod/")
    echo ""
    echo "Database:"
    CLOUDSQL_INSTANCE=$(ask "Cloud SQL instance" "one-data-commons:us-east4:dc-graph-prod")
    DB_PASS=$(ask "DB password")
    echo ""
    echo "Application:"
    REDIS_HOST=$(ask "Redis host" "10.143.80.83")
    ADMIN_SECRET=$(ask "Admin secret")
    echo ""
    {
        echo "### ONE Data Commons — PRODUCTION environment ###"
        echo ""
        echo "### API keys ###"
        echo ""
        echo "DC_API_KEY=$DC_API_KEY"
        echo "MAPS_API_KEY=$MAPS_API_KEY"
        echo ""
        echo "### Directories ###"
        echo ""
        echo "INPUT_DIR=$INPUT_DIR"
        echo "OUTPUT_DIR=$OUTPUT_DIR"
        echo ""
        echo "### Database ###"
        echo ""
        echo "USE_CLOUDSQL=true"
        echo "GOOGLE_CLOUD_PROJECT=one-data-commons"
        echo "CLOUDSQL_INSTANCE=$CLOUDSQL_INSTANCE"
        echo "DB_NAME=datacommons"
        echo "DB_USER=datacommons"
        echo "DB_PASS=$DB_PASS"
        echo ""
        echo "### Application settings ###"
        echo ""
        echo "FLASK_ENV=one"
        echo "ENABLE_MODEL=true"
        echo "REDIS_HOST=$REDIS_HOST"
        echo "ADMIN_SECRET=$ADMIN_SECRET"
    } > "$TARGET"
    echo "Created $TARGET"

# Create env files for all environments (local, staging, production)
env-all: env env-staging env-prod

# ── Upstream Sync ─────────────────────────────

# Fetch upstream and show what's changed since last sync
sync:
    #!/usr/bin/env bash
    set -euo pipefail
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    echo "Fetching from upstream..."
    git fetch upstream
    echo ""
    echo "Current branch: $CURRENT_BRANCH"
    BEHIND=$(git rev-list --count HEAD..upstream/{{UPSTREAM_BRANCH}})
    echo "Commits behind upstream/{{UPSTREAM_BRANCH}}: $BEHIND"
    echo ""
    if [ "$BEHIND" -eq 0 ]; then
        echo "Already up to date."
    else
        echo "To merge, run one of:"
        echo "  just sync-auto       # merge, keep both sides (may need manual conflict resolution)"
        echo "  just sync-theirs     # merge, prefer upstream for conflicts (safe for most files)"
        echo "  just sync-abort      # abort a failed merge and start over"
    fi

# Merge upstream, stop on conflicts for manual resolution
sync-auto:
    #!/usr/bin/env bash
    set -euo pipefail
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    echo "Fetching from upstream..."
    git fetch upstream
    echo ""
    echo "Merging upstream/{{UPSTREAM_BRANCH}} into $CURRENT_BRANCH..."
    if git merge upstream/{{UPSTREAM_BRANCH}}; then
        echo ""
        echo "Updating submodules..."
        ./scripts/update_git_submodules.sh
        echo ""
        just check-overrides
        echo ""
        echo "Sync complete. No conflicts."
    else
        echo ""
        CONFLICTS=$(git diff --name-only --diff-filter=U)
        COUNT=$(echo "$CONFLICTS" | wc -l | tr -d ' ')
        echo "═══════════════════════════════════════════"
        echo " $COUNT files with conflicts"
        echo "═══════════════════════════════════════════"
        echo ""
        echo "$CONFLICTS"
        echo ""
        echo "Options:"
        echo "  just sync-theirs     # accept upstream version for ALL conflicts"
        echo "  just sync-resolve    # accept upstream for most, list ONE-modified files to review"
        echo "  just sync-abort      # abort merge and go back to previous state"
    fi

# Merge upstream, accept their version for all conflicts
sync-theirs:
    #!/usr/bin/env bash
    set -euo pipefail
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    # Start merge if not already mid-merge
    if git rev-parse --verify MERGE_HEAD > /dev/null 2>&1; then
        echo "Continuing in-progress merge..."
    else
        echo "Fetching from upstream..."
        git fetch upstream
        echo ""
        echo "Merging upstream/{{UPSTREAM_BRANCH}} into $CURRENT_BRANCH..."
        git merge upstream/{{UPSTREAM_BRANCH}} || true
    fi
    echo ""
    # Resolve each conflict type
    # UU = both modified, AA = both added — accept theirs
    UU_AA=$(git status --porcelain | grep "^UU\|^AA" | awk '{print $2}' | grep -v "^import$" || true)
    if [ -n "$UU_AA" ]; then
        COUNT=$(echo "$UU_AA" | wc -l | tr -d ' ')
        echo "Accepting upstream version for $COUNT conflicted files..."
        echo "$UU_AA" | while read -r file; do
            git checkout --theirs -- "$file" 2>/dev/null && git add "$file"
        done
        echo ""
    fi
    # UD = deleted by upstream, modified by us — remove
    UD=$(git status --porcelain | grep "^UD" | awk '{print $2}' || true)
    if [ -n "$UD" ]; then
        echo "Removing files deleted by upstream..."
        echo "$UD" | while read -r file; do
            git rm --force "$file" 2>/dev/null || true
        done
        echo ""
    fi
    # DU = deleted by us, modified by upstream — accept theirs
    DU=$(git status --porcelain | grep "^DU" | awk '{print $2}' || true)
    if [ -n "$DU" ]; then
        echo "Restoring files upstream modified that we had deleted..."
        echo "$DU" | while read -r file; do
            git checkout --theirs -- "$file" 2>/dev/null && git add "$file" 2>/dev/null || true
        done
        echo ""
    fi
    # DD = both deleted (rename conflicts) — just remove
    DD=$(git status --porcelain | grep "^DD" | awk '{print $2}' || true)
    if [ -n "$DD" ]; then
        echo "Removing files deleted by both sides..."
        echo "$DD" | while read -r file; do
            git rm --force "$file" 2>/dev/null || git add "$file" 2>/dev/null || true
        done
        echo ""
    fi
    # Submodule conflicts
    if git status --porcelain | grep -q "^UU import"; then
        echo "Resolving import submodule conflict..."
        cd import && git fetch origin && git checkout origin/master && cd ..
        git add import
    fi
    # Complete the merge
    if git rev-parse --verify MERGE_HEAD > /dev/null 2>&1; then
        git commit --no-edit
    fi
    echo ""
    echo "Updating submodules..."
    ./scripts/update_git_submodules.sh
    echo ""
    just check-overrides
    echo ""
    echo "Sync complete. All conflicts resolved using upstream versions."

# Merge upstream, accept theirs for most files but protect ONE-customized paths
sync-resolve:
    #!/usr/bin/env bash
    set -euo pipefail
    PROTECTED_FILE=".one-protected-paths"
    # Check if we're mid-merge
    if ! git rev-parse --verify MERGE_HEAD > /dev/null 2>&1; then
        echo "No merge in progress. Run 'just sync-auto' first."
        exit 1
    fi
    # Load protected paths (strip comments and blanks)
    if [ ! -f "$PROTECTED_FILE" ]; then
        echo "Warning: $PROTECTED_FILE not found. All conflicts will use upstream version."
        PROTECTED=""
    else
        PROTECTED=$(grep -v '^#' "$PROTECTED_FILE" | grep -v '^$')
    fi
    is_protected() {
        local file="$1"
        while IFS= read -r pattern; do
            [ -z "$pattern" ] && continue
            # Directory prefix match (pattern ends with /)
            if [[ "$pattern" == */ ]] && [[ "$file" == "$pattern"* ]]; then
                return 0
            fi
            # Exact match
            if [[ "$file" == "$pattern" ]]; then
                return 0
            fi
        done <<< "$PROTECTED"
        return 1
    }
    # Categorize all conflicts
    ALL_CONFLICTS=$(git status --porcelain | grep "^UU\|^AA\|^UD\|^DU\|^DD\|^AU\|^UA" | grep -v "^UU import$" || true)
    AUTO_COUNT=0
    REVIEW_LIST=""
    while IFS= read -r line; do
        [ -z "$line" ] && continue
        status="${line:0:2}"
        file="${line:3}"
        if is_protected "$file"; then
            REVIEW_LIST="$REVIEW_LIST"$'\n'"  [$status] $file"
            continue
        fi
        case "$status" in
            "UU"|"AA")
                git checkout --theirs -- "$file" 2>/dev/null && git add "$file"
                ((AUTO_COUNT++)) || true
                ;;
            "UD")
                git rm --force "$file" 2>/dev/null || true
                ((AUTO_COUNT++)) || true
                ;;
            "DU")
                git checkout --theirs -- "$file" 2>/dev/null && git add "$file" 2>/dev/null || true
                ((AUTO_COUNT++)) || true
                ;;
            "DD")
                git rm --force "$file" 2>/dev/null || git add "$file" 2>/dev/null || true
                ((AUTO_COUNT++)) || true
                ;;
            "UA"|"AU")
                git checkout --theirs -- "$file" 2>/dev/null && git add "$file" 2>/dev/null || true
                ((AUTO_COUNT++)) || true
                ;;
        esac
    done <<< "$ALL_CONFLICTS"
    echo "Auto-resolved $AUTO_COUNT files using upstream version."
    echo ""
    # Submodule conflicts
    if git status --porcelain | grep -q "^UU import"; then
        echo "Resolving import submodule conflict..."
        cd import && git fetch origin && git checkout origin/master && cd ..
        git add import
    fi
    # Report protected files that still need review
    REMAINING=$(git diff --name-only --diff-filter=U 2>/dev/null || true)
    REVIEW_LIST=$(echo "$REVIEW_LIST" | sed '/^$/d')
    if [ -n "$REMAINING" ] || [ -n "$REVIEW_LIST" ]; then
        echo "═══════════════════════════════════════════════════════"
        echo " Protected files needing manual review:"
        echo "═══════════════════════════════════════════════════════"
        if [ -n "$REVIEW_LIST" ]; then
            echo "$REVIEW_LIST"
        fi
        echo ""
        echo "Protected paths loaded from: $PROTECTED_FILE"
        echo ""
        echo "Resolve these manually, then run:"
        echo "  git add <files>"
        echo "  git commit --no-edit"
        echo "  just submodules"
        echo "  just check-overrides"
    else
        git commit --no-edit
        echo ""
        echo "Updating submodules..."
        ./scripts/update_git_submodules.sh
        echo ""
        just check-overrides
        echo ""
        echo "Sync complete."
    fi

# Abort a failed merge and return to previous state
sync-abort:
    #!/usr/bin/env bash
    if git rev-parse --verify MERGE_HEAD > /dev/null 2>&1; then
        git merge --abort
        echo "Merge aborted. Back to clean state."
    else
        echo "No merge in progress."
    fi

# Update git submodules
submodules:
    ./scripts/update_git_submodules.sh

# Check if upstream changed files that ONE overrides (run after sync)
check-overrides:
    #!/usr/bin/env bash
    OVERRIDES_FILE=".one-overridden-files"
    if [ ! -f "$OVERRIDES_FILE" ]; then
        echo "Warning: $OVERRIDES_FILE not found."
        exit 0
    fi
    # Find the last merge from upstream
    MERGE_BASE=$(git merge-base HEAD upstream/{{UPSTREAM_BRANCH}} 2>/dev/null)
    if [ -z "$MERGE_BASE" ]; then
        echo "Could not find merge base with upstream. Run 'git fetch upstream' first."
        exit 0
    fi
    CHANGED_COUNT=0
    WARNINGS=""
    while IFS= read -r line; do
        # Skip comments and blanks
        [[ "$line" =~ ^#.*$ || -z "$line" ]] && continue
        upstream_file=$(echo "$line" | sed 's/ *->.*$//' | xargs)
        one_file=$(echo "$line" | sed 's/^.*-> *//' | xargs)
        # Check if upstream changed this file since last merge
        if git diff --quiet "$MERGE_BASE"..upstream/{{UPSTREAM_BRANCH}} -- "$upstream_file" 2>/dev/null; then
            continue
        fi
        ((CHANGED_COUNT++))
        WARNINGS="$WARNINGS\n  ⚠  $upstream_file"
        WARNINGS="$WARNINGS\n     ONE replacement: $one_file"
        # Show a short summary of what changed
        STAT=$(git diff --stat "$MERGE_BASE"..upstream/{{UPSTREAM_BRANCH}} -- "$upstream_file" 2>/dev/null | tail -1)
        if [ -n "$STAT" ]; then
            WARNINGS="$WARNINGS\n     Changes: $STAT"
        fi
        WARNINGS="$WARNINGS\n"
    done < "$OVERRIDES_FILE"
    if [ "$CHANGED_COUNT" -gt 0 ]; then
        echo "═══════════════════════════════════════════════════════════"
        echo " ⚠  $CHANGED_COUNT overridden file(s) changed upstream"
        echo "═══════════════════════════════════════════════════════════"
        echo ""
        echo -e "$WARNINGS"
        echo "Review these changes and update the ONE replacements if needed:"
        echo "  git diff $MERGE_BASE..upstream/{{UPSTREAM_BRANCH}} -- <file>"
        echo ""
    else
        echo "All overridden files are up to date with upstream."
    fi

# ── Building ──────────────────────────────────

# Build Docker image locally (override tag: just IMAGE_TAG=v1.0 build)
build: typecheck
    @echo "Building {{IMAGE}} from {{DOCKERFILE}}..."
    docker build --tag {{IMAGE}} -f {{DOCKERFILE}} .

# ── Running Locally ───────────────────────────

# Watch for frontend changes and rebuild incrementally (run in a separate terminal)
watch:
    #!/usr/bin/env bash
    set -euo pipefail
    # Install deps for sub-packages if missing (they need TypeScript 5.x)
    for pkg in packages/web-components packages/client; do
        if [ ! -d "$pkg/node_modules" ]; then
            echo "Installing dependencies for $pkg..."
            npm --prefix "$pkg" ci
            echo ""
        fi
    done
    cd static
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies for static/..."
        npm ci
        echo ""
    fi
    echo "Starting webpack watch mode..."
    echo "Frontend changes will rebuild automatically to server/dist/"
    echo "Use 'just dev' in another terminal to run the container."
    echo ""
    npm run watch

# Run container with live frontend assets (pair with 'just watch' in another terminal)
dev: _check-env _check-gcloud
    #!/usr/bin/env bash
    set -euo pipefail
    if [ ! -d "server/dist" ]; then
        echo "Error: server/dist/ not found."
        echo "Run 'just watch' in another terminal first to build frontend assets."
        exit 1
    fi
    echo "Running with live frontend assets from server/dist/"
    echo "Changes rebuild automatically while 'just watch' is running."
    echo "Reload the page in your browser to pick up changes."
    echo ""
    docker run -it \
        --init \
        --env-file {{ENV_FILE}} \
        -p 8080:8080 \
        -e DEBUG=true \
        -e INPUT_DIR={{INPUT_DIR}} \
        -e OUTPUT_DIR={{OUTPUT_DIR}} \
        -e GOOGLE_APPLICATION_CREDENTIALS=/gcp/adc.json \
        -v {{justfile_directory()}}/custom_dc/one:/userdata \
        -v {{justfile_directory()}}/server/config:/workspace/server/config \
        -v {{justfile_directory()}}/server/dist:/workspace/server/dist \
        -v {{GCP_ADC}}:/gcp/adc.json:ro \
        -v {{INPUT_DIR}}:{{INPUT_DIR}} \
        -v {{OUTPUT_DIR}}:{{OUTPUT_DIR}} \
        {{IMAGE}}

# Build and run in one step
build-run: build run

# Run container locally (port 8080, debug mode)
run: _check-env _check-gcloud
    docker run -it \
        --init \
        --env-file {{ENV_FILE}} \
        -p 8080:8080 \
        -e DEBUG=true \
        -e INPUT_DIR={{INPUT_DIR}} \
        -e OUTPUT_DIR={{OUTPUT_DIR}} \
        -e GOOGLE_APPLICATION_CREDENTIALS=/gcp/adc.json \
        -v {{justfile_directory()}}/custom_dc/one:/userdata \
        -v {{justfile_directory()}}/server/config:/workspace/server/config \
        -v {{GCP_ADC}}:/gcp/adc.json:ro \
        -v {{INPUT_DIR}}:{{INPUT_DIR}} \
        -v {{OUTPUT_DIR}}:{{OUTPUT_DIR}} \
        {{IMAGE}}

# Run container with bash shell (for debugging)
shell: _check-env _check-gcloud
    docker run -it \
        --init \
        --env-file {{ENV_FILE}} \
        -p 8080:8080 \
        -e DEBUG=true \
        -e INPUT_DIR={{INPUT_DIR}} \
        -e OUTPUT_DIR={{OUTPUT_DIR}} \
        -e GOOGLE_APPLICATION_CREDENTIALS=/gcp/adc.json \
        -v {{justfile_directory()}}/custom_dc/one:/userdata \
        -v {{justfile_directory()}}/server/config:/workspace/server/config \
        -v {{GCP_ADC}}:/gcp/adc.json:ro \
        -v {{INPUT_DIR}}:{{INPUT_DIR}} \
        -v {{OUTPUT_DIR}}:{{OUTPUT_DIR}} \
        {{IMAGE}} \
        /bin/bash

# Run the data container to process/regenerate local data
run-data: _check-env _check-gcloud
    #!/usr/bin/env bash
    set -euo pipefail
    mkdir -p "{{INPUT_DIR}}" "{{OUTPUT_DIR}}"
    echo "Running data container..."
    echo "  INPUT_DIR:  {{INPUT_DIR}}"
    echo "  OUTPUT_DIR: {{OUTPUT_DIR}}"
    echo ""
    docker run -it \
        --env-file {{ENV_FILE}} \
        -e INPUT_DIR={{INPUT_DIR}} \
        -e OUTPUT_DIR={{OUTPUT_DIR}} \
        -e GOOGLE_APPLICATION_CREDENTIALS=/gcp/creds.json \
        -v {{GCP_ADC}}:/gcp/creds.json:ro \
        -v {{INPUT_DIR}}:{{INPUT_DIR}} \
        -v {{OUTPUT_DIR}}:{{OUTPUT_DIR}} \
        {{DC_DATA_IMAGE}}

# Run the prebuilt DC service container with local data (useful for testing without building)
run-prebuilt: _check-env _check-gcloud
    docker run -it \
        --env-file {{ENV_FILE}} \
        -p 8080:8080 \
        -e DEBUG=true \
        -e INPUT_DIR={{INPUT_DIR}} \
        -e OUTPUT_DIR={{OUTPUT_DIR}} \
        -e GOOGLE_APPLICATION_CREDENTIALS=/gcp/creds.json \
        -v {{GCP_ADC}}:/gcp/creds.json:ro \
        -v {{INPUT_DIR}}:{{INPUT_DIR}} \
        -v {{OUTPUT_DIR}}:{{OUTPUT_DIR}} \
        -v {{justfile_directory()}}/server/templates/custom_dc/one:/workspace/server/templates/custom_dc/one \
        -v {{justfile_directory()}}/static/custom_dc/one:/workspace/static/custom_dc/one \
        {{DC_SERVICE_IMAGE}}

# Run only the service container via upstream script (no data reload)
run-service: _check-env
    ./run_cdc_dev_docker.sh \
        --env_file {{ENV_FILE}} \
        --actions run \
        --container service \
        --image {{IMAGE}}

# Run with staging environment config
run-staging: (_check-env-file _ENV_STAGING) _check-gcloud
    docker run -it \
        --init \
        --env-file {{_ENV_STAGING}} \
        -p 8080:8080 \
        -e DEBUG=true \
        -e GOOGLE_APPLICATION_CREDENTIALS=/gcp/adc.json \
        -v {{justfile_directory()}}/custom_dc/one:/userdata \
        -v {{justfile_directory()}}/server/config:/workspace/server/config \
        -v {{GCP_ADC}}:/gcp/adc.json:ro \
        {{IMAGE}}

# Run with production environment config
run-prod: (_check-env-file _ENV_PROD) _check-gcloud
    docker run -it \
        --init \
        --env-file {{_ENV_PROD}} \
        -p 8080:8080 \
        -e DEBUG=true \
        -e GOOGLE_APPLICATION_CREDENTIALS=/gcp/adc.json \
        -v {{justfile_directory()}}/custom_dc/one:/userdata \
        -v {{justfile_directory()}}/server/config:/workspace/server/config \
        -v {{GCP_ADC}}:/gcp/adc.json:ro \
        {{IMAGE}}

# ── Deploying ─────────────────────────────────

# Tag and push image to configured registry (override tag: just IMAGE_TAG=v1.0 push)
push: _check-env
    @echo "Tagging {{IMAGE}} -> {{DOCKER_REGISTRY}}:{{IMAGE_TAG}}..."
    docker tag {{IMAGE}} {{DOCKER_REGISTRY}}:{{IMAGE_TAG}}
    @echo "Pushing to {{DOCKER_REGISTRY}}:{{IMAGE_TAG}}..."
    docker push {{DOCKER_REGISTRY}}:{{IMAGE_TAG}}

# Build and push in one step (tags as :latest -- prefer deploy-staging or deploy-prod)
deploy: build push

# ── Terraform & Deployment ────────────────────

TF_DIR := "deploy/terraform-custom-datacommons/modules"
TF_STAGING_VARS := TF_DIR / "terraform.tfvars"
TF_PROD_VARS := TF_DIR / "terraform_prod.tfvars"

# Generate staging tfvars from live GCP resources
tf-generate-staging:
    #!/usr/bin/env bash
    set -euo pipefail
    cd {{TF_DIR}}
    bash generate_tfvars.sh staging

# Generate prod tfvars from live GCP resources
tf-generate-prod:
    #!/usr/bin/env bash
    set -euo pipefail
    cd {{TF_DIR}}
    bash generate_tfvars.sh prod

# Import existing GCP resources into staging terraform state
tf-import-staging:
    #!/usr/bin/env bash
    set -euo pipefail
    cd {{TF_DIR}}
    terraform workspace select STAGING || terraform workspace new STAGING
    bash import_workspace.sh staging

# Import existing GCP resources into prod terraform state
tf-import-prod:
    #!/usr/bin/env bash
    set -euo pipefail
    cd {{TF_DIR}}
    terraform workspace select PROD || terraform workspace new PROD
    bash import_workspace.sh prod

# Full staging terraform setup: generate tfvars + import state
tf-setup-staging: tf-generate-staging tf-import-staging
    @echo ""
    @echo "Staging terraform setup complete!"
    @echo "Run 'just tf-plan-staging' to verify."

# Full prod terraform setup: generate tfvars + import state
tf-setup-prod: tf-generate-prod tf-import-prod
    @echo ""
    @echo "Production terraform setup complete!"
    @echo "Run 'just tf-plan-prod' to verify."

# Preview staging infrastructure changes
tf-plan-staging:
    #!/usr/bin/env bash
    set -euo pipefail
    TAG="staging-$(git rev-parse --short HEAD)"
    cd {{TF_DIR}} && terraform workspace select STAGING \
      && terraform plan \
      -var-file={{justfile_directory()}}/{{TF_STAGING_VARS}} \
      -var="dc_web_service_image={{DOCKER_REGISTRY}}:$TAG"

# Preview production infrastructure changes
tf-plan-prod:
    #!/usr/bin/env bash
    set -euo pipefail
    TAG="prod-$(git rev-parse --short HEAD)"
    cd {{TF_DIR}} && terraform workspace select PROD \
      && terraform plan \
      -var-file={{justfile_directory()}}/{{TF_PROD_VARS}} \
      -var="dc_web_service_image={{DOCKER_REGISTRY}}:$TAG"

# Build, push, and deploy to staging (image tagged staging-<git-hash>)
deploy-staging: build
    #!/usr/bin/env bash
    set -euo pipefail
    TAG="staging-$(git rev-parse --short HEAD)"
    IMAGE_REF="{{DOCKER_REGISTRY}}:$TAG"
    echo "Tagging {{IMAGE}} -> $IMAGE_REF..."
    docker tag {{IMAGE}} "$IMAGE_REF"
    echo "Pushing $IMAGE_REF..."
    docker push "$IMAGE_REF"
    echo ""
    echo "Applying terraform for staging (staging-datacommons-web-service)..."
    cd {{TF_DIR}} && terraform workspace select STAGING \
      && terraform apply \
      -var-file={{justfile_directory()}}/{{TF_STAGING_VARS}} \
      -var="dc_web_service_image=$IMAGE_REF"

# Build, push, and deploy to production (image tagged prod-<git-hash>)
deploy-prod: build
    #!/usr/bin/env bash
    set -euo pipefail
    TAG="prod-$(git rev-parse --short HEAD)"
    IMAGE_REF="{{DOCKER_REGISTRY}}:$TAG"
    echo "Tagging {{IMAGE}} -> $IMAGE_REF..."
    docker tag {{IMAGE}} "$IMAGE_REF"
    echo "Pushing $IMAGE_REF..."
    docker push "$IMAGE_REF"
    echo ""
    echo "Applying terraform for production (prod-datacommons-web-service)..."
    cd {{TF_DIR}} && terraform workspace select PROD \
      && terraform apply \
      -var-file={{justfile_directory()}}/{{TF_PROD_VARS}} \
      -var="dc_web_service_image=$IMAGE_REF"

# ── Utilities ─────────────────────────────────

# Show current branch, remotes, Docker images, and env files
status:
    #!/usr/bin/env bash
    echo "Git branch:"
    git branch --show-current
    echo ""
    echo "Remotes:"
    git remote -v
    echo ""
    echo "Docker images (datacommons):"
    docker images | grep -E "datacommons|REPOSITORY" || echo "  (none found)"
    echo ""
    echo "Env files:"
    for f in custom_dc/one/env.list custom_dc/one/env.staging.list custom_dc/one/env.prod.list; do
        if [ -f "$f" ]; then echo "  ✓ $f"; else echo "  ✗ $f (missing)"; fi
    done
    echo ""
    echo "Local data directories:"
    for d in custom_dc/one_input custom_dc/one_output; do
        if [ -d "$d" ]; then echo "  ✓ $d"; else echo "  ✗ $d (run 'just run-data' to generate)"; fi
    done

# Stop all running datacommons containers
stop:
    #!/usr/bin/env bash
    docker ps --filter "ancestor={{IMAGE}}" -q | xargs -r docker stop
    echo "Stopped."

# Remove built Docker images
clean:
    #!/usr/bin/env bash
    docker rmi {{IMAGE}} 2>/dev/null || true
    docker rmi {{DOCKER_REGISTRY}}:{{IMAGE_TAG}} 2>/dev/null || true
    echo "Cleaned."

# Run TypeScript type checker locally (catches errors without a full Docker build)
typecheck:
    #!/usr/bin/env bash
    set -euo pipefail
    cd static
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies (first run only)..."
        npm ci --ignore-scripts
        echo ""
    fi
    echo "Running TypeScript type checker..."
    # Filter out upstream-only errors (missing @datacommonsorg packages, node_modules type conflicts)
    ERRORS=$(./node_modules/.bin/tsc --noEmit 2>&1 | grep -v 'node_modules/' | grep -v '@datacommonsorg/' | grep -v "'datacommons-" | grep 'error TS' || true)
    if [ -n "$ERRORS" ]; then
        # Separate ONE-specific errors from upstream errors
        ONE_ERRORS=$(echo "$ERRORS" | grep 'custom_dc/one' || true)
        OTHER_ERRORS=$(echo "$ERRORS" | grep -v 'custom_dc/one' || true)
        if [ -n "$ONE_ERRORS" ]; then
            echo "═══════════════════════════════════════════════════════════"
            echo " ✗  TypeScript errors in ONE files (must fix before build)"
            echo "═══════════════════════════════════════════════════════════"
            echo ""
            echo "$ONE_ERRORS"
            echo ""
            exit 1
        fi
        if [ -n "$OTHER_ERRORS" ]; then
            echo "Upstream TypeScript errors (informational — these usually pass in Docker):"
            echo "$OTHER_ERRORS" | head -10
            TOTAL=$(echo "$OTHER_ERRORS" | wc -l | tr -d ' ')
            if [ "$TOTAL" -gt 10 ]; then
                echo "  ... and $((TOTAL - 10)) more"
            fi
            echo ""
        fi
    fi
    echo "No ONE-specific TypeScript errors found. Safe to build."

# ── Internal ──────────────────────────────────

_check-env:
    #!/usr/bin/env bash
    if [ ! -f "{{ENV_FILE}}" ]; then
        echo "Error: {{ENV_FILE}} not found."
        echo "Run 'just setup' or 'just env' first."
        exit 1
    fi

_check-gcloud:
    #!/usr/bin/env bash
    if [ ! -f "{{GCP_ADC}}" ]; then
        echo "Error: GCP Application Default Credentials not found."
        echo "Run 'gcloud auth application-default login' to create them."
        exit 1
    fi

[no-exit-message]
_check-env-file file:
    #!/usr/bin/env bash
    if [ ! -f "{{file}}" ]; then
        echo "Error: {{file}} not found."
        echo "Run 'just env-all' to create env files for all environments."
        exit 1
    fi
