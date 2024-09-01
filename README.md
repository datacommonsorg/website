# Data Commons Website

This repo hosts code for the Data Commons website.

## About Data Commons

[Data Commons](https://datacommons.org/) is an open knowledge graph that
provides a unified view across multiple public data sets and statistics. We've
bootstrapped the graph with lots of [data](https://docs.datacommons.org/datasets/)
from US Census, CDC, NOAA, etc., and through collaborations with the New York
Botanical Garden, Opportunity Insights, and more. However, Data Commons is meant
to be for community, by the community. We are excited to work with you to make
public data accessible to everyone.

To see the extent of data we have today, browse the graph using our
[browser](https://datacommons.org/browser).

## Contributing

### GitHub Workflow

In
[https://github.com/datacommonsorg/website](https://github.com/datacommonsorg/website),
click on "Fork" button to fork the repo.

Clone your forked repo to your desktop.

Add datacommonsorg/website repo as a remote:

```shell
git remote add dc https://github.com/datacommonsorg/website.git
```

Run the prerequisite steps in the [developer guide](docs/developer_guide.md).

Every time when you want to send a Pull Request, do the following steps:

```shell
git checkout master
git pull dc master
git checkout -b new_branch_name
# Make some code change
git add .
# Run tests
./run_test.sh -a
git commit -m "commit message"
# If tests pass
git push -u origin new_branch_name
```

Then in your forked repo, you can send a Pull Request. If this is your first
time contributing to a Google Open Source project, you may need to follow the
steps in [CONTRIBUTING.md](CONTRIBUTING.md).

Wait for approval of the Pull Request and merge the change.

### Local Development

Check steps in [developer guide](docs/developer_guide.md) for more detailed
instructions.

## License

Apache 2.0

## Support

For general questions or issues, please open an issue on our
[issues](https://github.com/datacommonsorg/website/issues) page. For all other
questions, please send an email to `support@datacommons.org`.
