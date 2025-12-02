# Setup website repo for local development

One-time steps to get the website repo setup locally on your machine.

## Step 1: Connect to GitHub

1. If you don't have a GitHub account already, [create
   one](https://github.com/signup).

2. Create and register an SSH key with GitHub following the [instructions
   here](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent).

3. Create a fork of the [datacommons website
   repo](github.com/datacommonsorg/website) by clicking on the “fork” button on the
   top right.

![Screenshot of github.com/datacommonsorg/website with a box around the "fork"
button at the top right](images/github-fork-button.png)

## Step 2: Setup local git repository

Open a new terminal window and enter the following commands into a shell:

1. Clone your fork.

   ```shell
   git clone <your repository fork here>
   ```

2. Add the main repository as a remote named “dc”.

   ```shell
   cd <your repo folder>
   git remote add dc https://github.com/datacommonsorg/website.git
   ```

3. Initialize `mixer` and `import` submodules.

   ```shell
   git submodule foreach git pull origin master
   git submodule update --init --recursive
   ```

4. Set your user name and email for git.

   ```shell
   git config user.name "Your Name"
   git config user.email "your.email@example.com"
   ```

5. Set merge settings to “no-rebase”.

   ```shell
   git config pull.rebase false
   ```

## 3. Install dependencies

1.  Install [uv](https://uv.pypa.io/en/stable/)

2.  Install [Python](https://www.python.org/) at version 3.12 (3.13 or above has
    an unmatched torch version). For version control, we recommend installing
    python using [pyenv](https://github.com/pyenv/pyenv).

3.  Install `gcloud` following the instructions here:
    <https://cloud.google.com/sdk/docs/install>

4.  Install nvm following the instructions here:
    <https://github.com/nvm-sh/nvm?tab=readme-ov-file#installing-and-updating>

5.  Use nvm to install node at version 18.4.0:

    ```shell
    nvm install 18.4.0
    nvm use 18.4.0
    ```

6.  Install [protoc](https://protobuf.dev/installation/) at version 3.21.12:

    On macs, you can [install via Homebrew](https://formulae.brew.sh/formula/protobuf@21):

    ```shell
    # On Macs, install via Homebrew (https://brew.sh/)
    brew install protobuf@21
    ```

7.  On Macs with ARM Processors (M series chips), you'll also need the
    following:

    ```shell
    # Using Homebrew (https://brew.sh/)
    brew install pkg-config cairo pango libpng jpeg giflib librsvg
    ```

8.  Make sure you have [Google
    Chrome](https://www.google.com/chrome/dr/download) installed and install
    [chromedriver](https://developer.chrome.com/docs/chromedriver/). Make sure
    the version of chromedriver you install matches the version of Google Chrome
    you have installed.

    On Macs, you can [install via Homebrew](https://formulae.brew.sh/cask/chromedriver):

    ```shell
    # On Macs, install via Homebrew (https://brew.sh/)
    brew install chromedriver
    ```

9. [Optional] Install [Google Cloud CLI](https://cloud.google.com/sdk?hl=en)

    The Google Cloud CLI is required to make place search work locally. To enable place search locally:

    First, install `gcloud` following the instructions here: <https://cloud.google.com/sdk/docs/install-sdk>.

    Next, ask the Data Commons team to grant you permissions to use a Google Maps API Key.

    Once you have a Google Maps API Key, authenticate locally with this command:

    ```shell
    gcloud auth application-default login
    ```

10. Setup all python environments

    ```shell
    cd <your local repository>
    ./run_test.sh --setup_all
    ```

## 4. Verify setup

If everything is set up correctly, you should be able to run each of the
following from the base directory in separate terminals.

```shell
# Terminal 1
# Will not terminate
# Should see 100% at the bottom of output
# Need to run this before first time running ./run_server.sh
./run_npm.sh
```

```shell
# Terminal 2
# Will not terminate
# Should see "Debugger is active!" in output
./run_nl_server.sh
```

```shell
# Terminal 3
# Will not terminate
# Should see "Debugger is active!" in output
#
# Note: Make sure ./run_nl_server.sh is running first (See Terminal 2 above)
# this script will fail if a local NL server is not online
./run_server.sh -m
```

```shell
# Terminal 4
# All tests should pass on an up-to-date master branch
./run_test.sh -a
```
