# Data Commons WebDriver Unit Tests

## How To Run the Data Commons WebDriver Unit Tests

Run the following command from the parent directory:

    ./run_tests.sh -w

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

### 3. Wait Until HTML Element Disappears

If you want to wait until an element disappears from the DOM, use `invisibility_of_element_located`.

For example, in the Data Commons Timeline Tool, when a place is de-selected, some HTML elements have to be removed from the DOM.

WebDriver can wait for the 2nd element to disappear as follows:

    element_present = EC.invisibility_of_element_located(
    (By.CSS_SELECTOR,'.my-class:nth-child(2)'))
    WebDriverWait(self.driver, SLEEP_SEC).until(element_present)

### 4. Wait Until Page Title Changes

If you want to make sure that the site's title is correct, wait until the title contains your desired text. This can be used to check to see if an on-click event works as expected.

    WebDriverWait(self.driver, SLEEP_SEC).until(EC.title_contains(TITLE_TEXT)
