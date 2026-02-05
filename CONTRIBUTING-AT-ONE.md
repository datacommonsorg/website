# Contributing to ONE Data Commons

This is the ONE Data fork of the [Data Commons website](https://github.com/datacommonsorg/website). We track the upstream `customdc_stable` branch and add our own customizations.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) (`gcloud`)
- [just](https://github.com/casey/just) — command runner (`brew install just`)
- Git with access to this repository
- Access to the `one-data-commons` GCP project (for deployment)

## Quick Start

```bash
# 1. Clone and set up remotes
git clone https://github.com/ONEcampaign/one-datacommons-website.git
cd one-datacommons-website
git remote add upstream https://github.com/datacommonsorg/website.git

# 2. Run first-time setup — prompts for API keys and creates env files
#    for all environments (local, staging, prod), configures Docker auth,
#    and updates submodules. Ask a team member for the API key values.
just setup

# 3. Build the Docker image
just build

# 4. Load data into local SQLite database (first time only)
just run-data

# 5. Run locally on http://localhost:8080
just run
```

Step 4 runs the data management container, which converts CSV data into a local SQLite database and generates NL embeddings. You only need to rerun it when your input data changes. If you skip this step, the services container will fail with a "Cannot open sqlite database" error.

## Available Commands

Run `just` or `just --list` for the full list. Here are the most common ones:

| Command | What it does |
|---------|-------------|
| `just setup` | First-time setup (interactive env prompts, Docker auth, submodules) |
| `just build` | Build the Docker image locally |
| `just run-data` | Run data container to load CSV data into SQLite and generate NL embeddings |
| `just run` | Run locally on port 8080 |
| `just dev` | Run with live frontend assets (pair with `just watch`) |
| `just watch` | Start webpack watch mode for incremental frontend rebuilds |
| `just shell` | Start container with bash (for debugging) |
| `just env` | Create local env file (interactive prompts) |
| `just env-staging` | Create staging env file (interactive prompts) |
| `just env-prod` | Create production env file (interactive prompts) |
| `just env-all` | Create all three env files |
| `just sync` | Guided upstream sync from `customdc_stable` |
| `just sync-auto` | Automatic upstream sync (merge + submodule update) |
| `just deploy` | Build and push to Artifact Registry |
| `just deploy-staging` | Build, push, and deploy to staging via Terraform |
| `just deploy-prod` | Build, push, and deploy to production via Terraform |
| `just tf-plan-staging` | Preview staging infrastructure changes |
| `just tf-plan-prod` | Preview production infrastructure changes |
| `just status` | Show current branch, remotes, Docker images |
| `just stop` | Stop running containers |
| `just clean` | Remove built Docker images |

## Frontend Development Without Full Rebuilds

A full Docker build takes ~15 minutes because it bundles the entire frontend via webpack. For frontend-only changes (TypeScript, React components, CSS), you can skip that by running webpack locally in watch mode:

**Terminal 1** — start the file watcher:
```bash
just watch
```

This runs webpack in development mode with `--watch`. It does a full build on first run, then rebuilds incrementally (a few seconds) whenever you save a file under `static/`.

**Terminal 2** — run the container with live assets:
```bash
just dev
```

This is the same as `just run` but mounts your local `server/dist/` into the container, so the Flask server serves the locally-built frontend. After webpack rebuilds, reload the page in your browser to see changes.

You still need a full `just build` for:
- Python/Flask server changes
- Changes to Docker-level configuration
- Changes to dependencies (`package.json`)
- Final verification before deploying

## Syncing Upstream Changes

The upstream Data Commons project releases stable updates on the `customdc_stable` branch. To pull in their latest changes:

```bash
# 1. Check how far behind you are:
just sync

# 2. Merge (pick one):
just sync-auto       # Merge, stop on conflicts for manual resolution
just sync-theirs     # Merge, accept upstream for ALL conflicts
just sync-resolve    # Merge, accept upstream for most, flag protected files for review
```

### Recommended sync workflow

1. Run `just sync-auto` first.
2. If there are conflicts, run `just sync-resolve`. This auto-resolves most files using upstream's version, but flags files listed in `.one-protected-paths` for manual review.
3. Resolve the flagged files manually (usually just `.gitignore` and `static/package.json`), then `git add` and `git commit --no-edit`.
4. Run `just submodules` to update git submodules.

If something goes wrong: `just sync-abort` returns to the pre-merge state.

## Project Structure (ONE-specific)

```
custom_dc/one/                          # Environment configuration
  env.list                              # Local dev env file (gitignored, from env.list.sample)
  env.staging.list                      # Staging env file (gitignored, from env.staging.sample)
  env.prod.list                         # Production env file (gitignored, from env.prod.sample)
  env.list.sample                       # Local dev template (committed)
  env.staging.sample                    # Staging template (committed)
  env.prod.sample                       # Production template (committed)

server/app_env/one.py                   # Flask app config (FLASK_ENV=one)
server/templates/custom_dc/one/         # Custom Jinja templates (header, footer, pages)

static/js/apps/custom_dc/one/          # Custom React apps
  base/                                 # Header, footer, base template entry point
    main.ts                             # Replaces upstream base entry point
    header_app.tsx                      # Custom header component
    components/                         # Custom components (footer, header bar, search)
  homepage/                             # Custom homepage React app
    main.ts                             # Replaces upstream homepage entry point
    app.tsx                             # Homepage component

static/js/theme/                        # Theme system
  theme.ts, types.ts, emotion.d.ts      # Upstream root-level theme (for relative imports)
  base_theme/                           # Upstream default theme (copy)
  dc_custom_theme/                      # ONE custom Emotion theme (override)

static/css/custom_dc/one/              # Custom SCSS
static/custom_dc/one/                  # Static assets (favicon, fonts, images, overrides.css)

static/webpack.one.js                  # Webpack wrapper (loads base config + ONE overrides)
static/webpack.custom_dc.js            # ONE overrides (entry points, aliases)
```

## Architecture: How Customization Works

ONE's customization goes beyond the [official Custom DC model](https://docs.datacommons.org/custom_dc/custom_ui.html) (which only supports Jinja templates and CSS overrides). We also replace React entry points and use a custom Emotion theme. Here's how it all fits together.

### Webpack Build Chain

The upstream `webpack.config.js` is **never modified**. Instead, we use a wrapper:

```
package.json build command
  → webpack --config webpack.one.js
      → loads webpack.config.js        (upstream, untouched)
      → loads webpack.custom_dc.js     (ONE overrides)
      → merges entry points and resolve aliases
      → outputs to server/dist/
```

`static/webpack.one.js` imports the base config and applies overrides from `static/webpack.custom_dc.js`:

- **Entry point replacements** — `base` and `homepage` are replaced with ONE's custom React apps. The default `homepage_custom_dc` entry is removed.
- **Webpack aliases** — `import from 'theme'` resolves to `dc_custom_theme/` instead of the root-level theme. The `auto_complete_input` component is replaced with ONE's custom version.

### Theme System

There are two ways upstream code imports themes:

| Import style | Resolves to | Used by |
|---|---|---|
| `import from '../../theme/theme'` (relative) | `static/js/theme/theme.ts` | ~24 upstream files |
| `import from 'theme'` (bare module) | `static/js/theme/dc_custom_theme/` via webpack alias | ~10 files (homepages, landing pages) |

The root-level `theme.ts` must always match upstream. The `dc_custom_theme/` directory is where ONE can diverge colors, typography, spacing, etc. without touching any upstream files.

### Flask Configuration

`FLASK_ENV=one` tells the server to load `server/app_env/one.py`, which sets:
- `CUSTOM = True` — enables custom DC mode
- `NAME = "ONE Data Commons"` — site branding
- `OVERRIDE_CSS_PATH` — points to ONE's CSS overrides
- Template directory — `server/templates/custom_dc/one/`

### What's Safe to Change Without Merge Conflicts

| Location | Risk | Notes |
|---|---|---|
| `custom_dc/one/` | None | ONE-only directory, not in upstream |
| `static/js/apps/custom_dc/one/` | None | ONE-only React apps |
| `static/js/theme/dc_custom_theme/` | None | ONE-only theme |
| `static/css/custom_dc/one/` | None | ONE-only styles |
| `server/templates/custom_dc/one/` | None | ONE-only templates |
| `static/webpack.one.js` | None | ONE-only wrapper |
| `static/webpack.custom_dc.js` | None | ONE-only overrides |
| `justfile` | None | ONE-only, not in upstream |
| `static/js/theme/base_theme/` | Low | ONE copy; keep in sync with upstream `theme/` |
| `static/package.json` | Low | 3 config filename changes in wireit section |
| `static/tsconfig.json` | Low | `baseUrl` and `paths` added for theme/component aliases |
| `.gitignore` | Low | Additive entries for ONE env files |

### Override Drift Detection

ONE replaces several upstream components via webpack aliases (e.g., the search bar, homepage, base app). When upstream changes the original files, ONE's replacements may need updating to stay compatible.

`.one-overridden-files` maps each upstream file to its ONE replacement. After every sync, `just check-overrides` runs automatically and warns if any originals have changed:

```
═══════════════════════════════════════════════════════════
 ⚠  1 overridden file(s) changed upstream
═══════════════════════════════════════════════════════════

  ⚠  static/js/components/nl_search_bar/auto_complete_input.tsx
     ONE replacement: static/js/apps/custom_dc/one/base/components/nl_search_bar/auto_complete_input.tsx
     Changes: 1 file changed, 5 insertions(+), 2 deletions(-)
```

If you see warnings, compare the upstream change with ONE's version and update as needed. You can also run `just check-overrides` at any time.

If you add a new component substitution, add the mapping to `.one-overridden-files`.

### Protected Paths

`.one-protected-paths` lists files that `just sync-resolve` will flag for manual review instead of auto-accepting upstream's version. If you add new ONE-specific modifications to upstream files, add them here.

## Configuration

There is one env file per environment, all under `custom_dc/one/`:

| File | Created by | Purpose |
|------|-----------|---------|
| `env.list` | `just env` | Local development |
| `env.staging.list` | `just env-staging` | Staging environment |
| `env.prod.list` | `just env-prod` | Production environment |

Each is gitignored. The `just env*` commands prompt interactively for secrets and offer sensible defaults for everything else. Run `just setup` or `just env-all` to create all three at once. If a file already exists, the command skips it — delete it first to regenerate.

The `.sample` files in the same directory serve as documentation of what each env file contains.

### Local development (`env.list`)

The interactive prompt asks for:
- **DC_API_KEY** / **MAPS_API_KEY** — required (ask a team member)
- **Cloud SQL** — optional; defaults to "no", which uses a local SQLite database

Other prompts with defaults:
- **INPUT_DIR** / **OUTPUT_DIR** — defaults to `custom_dc/sample` (upstream example data) and `custom_dc/sample_output`
- **DC_RELEASE** — Docker image tag, `stable` (tested) or `latest` (newest)

Everything else is set automatically: `FLASK_ENV=one`, `ENABLE_MODEL=true`, `USE_SQLITE=true`, `GOOGLE_CLOUD_PROJECT`.

**Important:** Local dev uses SQLite by default. Before running the services (`just run` or `just dev`), you must run the data container once to create the database:

```bash
just run-data
```

This processes CSV data from the input directory into a SQLite database in the output directory (`datacommons/datacommons.db`) and generates NL embeddings. Rerun it whenever your input data changes. With the default paths, the sample data works out of the box.

If you connect to Cloud SQL instead (answering "y" during `just env`), you don't need `just run-data` locally — the database is managed remotely.

### Staging / Production (`env.staging.list`, `env.prod.list`)

These prompts additionally ask for:
- **INPUT_DIR** / **OUTPUT_DIR** — GCS bucket paths (with defaults per environment)
- **Cloud SQL** credentials — instance, DB password
- **REDIS_HOST** / **ADMIN_SECRET** — application settings

## Deployment

To deploy to staging or production, use the combined commands that build the Docker image, push it to Artifact Registry (tagged with the git hash), and apply Terraform:

```bash
# Preview what Terraform will change first
just tf-plan-staging    # or just tf-plan-prod

# Build, push, and deploy
just deploy-staging     # or just deploy-prod
```

These commands:
1. Build the Docker image locally
2. Tag it as `staging-<git-hash>` (or `prod-<git-hash>`)
3. Push to Artifact Registry
4. Select the correct Terraform workspace
5. Run `terraform apply` with the environment's tfvars

For pushing to the registry only (without Terraform apply):

```bash
just deploy   # Build and push as :latest
```

The registry path is configured via `DOCKER_REGISTRY` in your env file. Default: `us-east4-docker.pkg.dev/one-data-commons/datacommons/website-compose`.

## Branching Strategy

- `master` — Main branch for the ONE fork
- `staging` — Auto-deploys to staging environment
- `customdc_stable` — Tracks upstream stable releases
- Feature branches — Branch off `master`, merge back via PR

## Infrastructure (Terraform)

Infrastructure is managed with Terraform in `deploy/terraform-custom-datacommons/modules/`.

### Workspaces

We use Terraform workspaces to manage staging and production in the same GCP project:

| Workspace | Namespace | tfvars file |
|-----------|-----------|-------------|
| `STAGING` | `staging` | `terraform.tfvars` |
| `PROD`    | `prod`    | `terraform_prod.tfvars` |

Select a workspace before running any terraform command:

```bash
cd deploy/terraform-custom-datacommons/modules
terraform workspace select STAGING   # or PROD
terraform plan -var-file=terraform.tfvars   # or terraform_prod.tfvars
```

### State Management

Terraform state is stored **locally** in `terraform.tfstate.d/` (one file per workspace). These files are **gitignored** because they contain secrets (database passwords, API keys).

If state is ever lost (new machine, accidental deletion), use the import script to rebuild it:

```bash
terraform workspace select STAGING
bash import_workspace.sh staging

terraform workspace select PROD
bash import_workspace.sh prod
```

The script is idempotent — it skips resources already in state.

### Shared Redis

Staging creates and owns the Redis instance. Production shares it via override variables instead of creating a separate instance:

```hcl
# terraform_prod.tfvars
enable_redis = false
redis_host = "10.67.34.172"
redis_port = "6379"
```

### ONE Overrides vs Upstream

The terraform module is upstream code with three ONE-specific changes:

| File | Change | Why |
|------|--------|-----|
| `main.tf` | `data "google_project" "current"` + API key uses `data.google_project.current.number` | Prevents API key replacement on every apply (project name vs numeric ID drift) |
| `main.tf` | `FLASK_ENV = var.flask_env` instead of `"custom"` | ONE needs `FLASK_ENV=one` for custom Flask config |
| `locals.tf` | `REDIS_HOST`/`REDIS_PORT` support override variables | Allows sharing a single Redis instance across environments |
| `variables.tf` | Added `flask_env`, `redis_host`, `redis_port` | Support variables for the above changes |

### Key Files

| File | Purpose |
|------|---------|
| `main.tf` | All GCP resource definitions (Cloud Run, SQL, Redis, IAM, etc.) |
| `variables.tf` | Variable declarations with defaults |
| `locals.tf` | Computed values, shared env vars for Cloud Run |
| `terraform.tfvars` | Staging variable values |
| `terraform_prod.tfvars` | Production variable values |
| `import_workspace.sh` | Disaster recovery: rebuild state from live GCP resources |
