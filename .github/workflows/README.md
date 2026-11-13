# GitHub Actions Workflows

* Any job configured as a **required status check** on `master` must trigger on both `pull_request` and `merge_group`, or the merge queue will wait until it times out.
  * Merge queue runs do not have access to the PR title, description, or number, so skip any step that checks those fields.
* Do not use `pull_request_target` triggers, which are blocked by GitHub Enterprise policy in public repositories.
  * Use `pull_request` triggers with minimal read-only permissions so workflows pass `zizmor` without ignore directives.
