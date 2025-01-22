# Data Commons WebDriver Unit Tests

## How To Run the Data Commons WebDriver Unit Tests

Run the following command from the repo root:

```bash
./run_tests.sh -w
```

### Run a subset of tests

#### All tests in a class

```bash
./run_Test.sh -w -k "TestClass"
```

#### Single method in a class

```bash
./run_test.sh -w -k "TestClass and test_method"
```

See also the [Pytest syntax reference](https://docs.pytest.org/en/stable/how-to/usage.html#specifying-which-tests-to-run).
Note that assuming there are no duplicate test class names, this is the equivalent of

```bash
./run_test.sh -w path/to/file_with_test.py::TestClass::test_method
```

### Check if a test is flaky

If you suspect a test is flaky (failing a small percent of runs consistently),
you can use [pytest-flakefinder](https://pypi.org/project/pytest-flakefinder/)
to run it many times at once.

Run a test 50 times:

```bash
./run_test.sh -w --flake-finder -k "TestClass and test_method"
```

Run a test 100 times:

```bash
./run_test.sh -w --flake-finder --flake-runs=100 -k "TestClass and test_method"
```

If you find that a test fails (often due to a TimeoutException), try using one of the strategies below to make sure all required elements have loaded before asserting on them.

## Things To Note

Data Commons sites can take up to a few seconds to load; thus, WebDriver needs to be told what elements to wait for to know that the page has finished loading/rendering.

- `SLEEP_SEC` represents the maximum time for a test to finish. If this time is exceeded, the test will fail with a `TimeoutException`. By default, the test cases use 60 seconds.
- WebDriver allows to select HTML elements using `By.ID, By.CSS_SELECTOR, By.CLASS_NAME, By.XPATH`.
- Sometimes, it is more convenient to use CSS_SELECTOR or XPATH.

  - `By.CSS_SELECTOR('.myclass:nth-element(3)')`
  - `By.XPATH('//*[@id="my-id"]/span/button')`

- LiveServerTestCase will run the methods in the following order:

  - setUpClass()
  - create_app()
  - setUp()
  - test1()
  - tearDown()
  - create_app()
  - setUp()
  - test2()
  - tearDown()
  - tearDownClass()

### 1. Wait Until HTML Element is Present in DOM

WebDriver can wait for an element to be present in the DOM using `presence_of_element_located`. An example would be to wait for "my-button" to appear after an event has triggered.
element_present = EC.presence_of_element_located(
(By.ID, 'my-button'))
WebDriverWait(self.driver, SLEEP_SEC).until(element_present)

### 2. Wait Until HTML Element Contains Desired Text

There are some cases where the element is already part of the DOM, but that element's content is still loading. For example, a chart title might initially be `""` but then change to `"Poverty In the USA"` after an API request has finished loading. If this is the case, we have to tell WebDriver to wait until the text completes loading.

In the example below, WebDriver will wait until the element contains `"Mountain View"` as part of the place-name text.

    element_present = EC.text_to_be_present_in_element(
    (By.ID, 'my-id'),
    'Mountain View')
    WebDriverWait(self.driver, SLEEP_SEC).until(element_present)

### 3. Wait Until HTML Element is Clickable

If a test flakes with an "element not interactable" error, you may need to wait for the expected condition `element_to_be_clickable`. You can combine the waiting step and the clicking step by passing an element locator the the shared helper `click_el`:

    shared.click_el(self.driver,
      (By.ID, 'Median_Income_Persondc/g/Demographics-Median_Income_Person'))
    shared.click_el(self.driver, (By.CLASS, 'continue-button'))

### 4. Wait Until HTML Element Disappears

If you want to wait until an element disappears from the DOM, use `invisibility_of_element_located`.

For example, in the Data Commons Timeline Tool, when a place is de-selected, some HTML elements have to be removed from the DOM.

WebDriver can wait for the 2nd element to disappear as follows:

    element_present = EC.invisibility_of_element_located(
    (By.CSS_SELECTOR,'.my-class:nth-child(2)'))
    WebDriverWait(self.driver, SLEEP_SEC).until(element_present)

### 5. Wait Until Page Title Changes

If you want to make sure that the site's title is correct, wait until the title contains your desired text. This can be used to check to see if an on-click event works as expected.

    WebDriverWait(self.driver, SLEEP_SEC).until(EC.title_contains(TITLE_TEXT))
