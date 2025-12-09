# WebDriver Testing Guide

This guide covers how to run, write, and maintain WebDriver tests for Data Commons.

## Running Tests

By default, tests run in **Replay Mode**. This uses recorded API responses from `server/tests/test_data/webdriver_recordings`, ensuring tests are fast and deterministic.

### Run all tests
```bash
./run_test.sh -w
```

Same as:

```bash
WEBDRIVER_RECORDING_MODE=replay ./run_test.sh -w
```

### Run specific tests
Filter by test name or class using `-k`:
```bash
./run_test.sh -w -k "homepage_test"
./run_test.sh -w -k "test_homepage_autocomplete_places"
```

## Writing New Tests

To write a new test, you need to capture real API traffic.

### Workflow

1.  **Write the test skeleton**: Create your test file and methods in the appropriate directory.
    - `server/webdriver/tests/`: Tests for datacommons.org (base DC) only.
    - `server/webdriver/shared_tests/`: Reusable test mixins shared between base and CDC tests.
    - `server/webdriver/cdc_tests/`: Tests specific to Custom Data Commons (CDC).
2.  **Record traffic**: Run the test in **Record Mode**. This hits the real API and saves responses to JSON.
    ```bash
    WEBDRIVER_RECORDING_MODE=record ./run_test.sh -w -k "my_new_test"
    ```
3.  **Verify**: Run in **Replay Mode** (default) to ensure it passes with the recorded data.
    ```bash
    WEBDRIVER_RECORDING_MODE=replay ./run_test.sh -w -k "my_new_test"
    ```
4.  **Commit**: Commit the new test file and the generated JSON recordings.

## Maintenance: Regenerating Recordings

If the API changes or data becomes stale, you must regenerate recordings.

### How to Regenerate
1.  **Delete old recordings** (Optional but recommended to avoid orphans):
    ```bash
    rm -rf server/tests/test_data/webdriver_recordings/
    ```
2.  **Run in Record Mode**:
    ```bash
    WEBDRIVER_RECORDING_MODE=record ./run_test.sh -w
    ```
    *Note: This will take a while as it hits the real API.*

## Troubleshooting

### Disable Headless Mode
To see the browser while debugging:
1.  Open `server/webdriver/base_utils.py`.
2.  Comment out `chrome_options.add_argument('--headless=new')`.

### Screenshots
Capture the state of the page for debugging:
```python
self.driver.save_screenshot('debug.png')
```

### Flakiness
Use the flake finder to run a test multiple times:
```bash
./run_test.sh -w --flake-finder -k "my_new_test"
```

## Architecture Overview

### Recorder Middleware
The recorder is a Flask middleware (`server/lib/recorder/core.py`) that intercepts requests.
- **Record Mode**: Proxies to the real API, saves response to disk.
- **Replay Mode**: Looks up response from disk based on request hash.
- **Live Mode**: Bypasses recorder entirely (used in production).

### Storage
Recordings are stored as JSON files in `server/tests/test_data/webdriver_recordings`.
- **Path Grouping**: APIs with variable resource identifiers in the path (e.g., `/api/place/<place_id>`) are grouped into a single directory (e.g., `api_place_summary`) to avoid creating a new folder for every unique resource.
- **Hashing**: Requests are hashed (SHA1) to determine the filename. Volatile parameters (like random timestamps) are stripped before hashing.

### Tarball (`webdriver_recordings.tar.gz`)
To avoid hitting inode limits and improving git performance (currently ~2.5k recording files), recordings are compressed into a tarball.
- **Extraction**: `run_test.sh` automatically extracts this tarball before running tests.
- **Compression**: `run_test.sh` automatically re-compresses it after running in `record` mode.

#### Optimization Flags
- `--no_extract`: Use when you have already extracted recordings and want to preserve manual changes or save time.
- `--no_compress`: Use in `record` mode to inspect generated JSON files before they are bundled.
