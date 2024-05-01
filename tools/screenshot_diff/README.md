# Screenshot Diff

This is a tool to get a link to see the screenshot diffs between autopush and prod. Please run this in a clean master.

To run:

```bash
# Pull tags from remote datacommonsorg/website repo. 
# Note: replace dc with what you use when you run `git pull dc master`
git pull dc --tags

# Run the script
./diff.sh
```

If you get a message to manually trigger a website cron testing job, you can do this by going to the [GKE console](https://pantheon.corp.google.com/kubernetes/cronjob/us-central1/website-us-central1/website/cron-testing) and clicking "Run now" ([screenshot](https://screenshot.googleplex.com/BoUb2yLuLVAsJJm)).