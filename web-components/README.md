# Data Commons Web Components

Embed [Data Commons](https://datacommons.org)
[statistical variable](https://datacommons.org/tools/statvar) observation
visualizations in your web application.

## Usage

Include `datacommons.js` and `datacommons.min.css` in your html `<head>...</head>` tag. Then add the web components desired. Example:

```html
<html>
  <head>
    <link
      rel="stylesheet"
      href="https://datacommons.org/css/datacommons.min.css"
    />
    <script src="https://datacommons.org/datacommons.js"></script>
  </head>
  <body>
    <!-- Embed a line chart -->
    <datacommons-line
      title="US Population Over Time"
      place="country/USA"
      variables='["Count_Person"]'
    ></datacommons-line>
  </body>
</html>
```

For a full list of supported charts and attributes, see our
[Web Component Documentation](./docs/README.md).

### Finding DCIDs for Places and Variables

Many web component attributes require
[DCID](https://docs.datacommons.org/glossary.html#dcid)s, as input. To find the
DCID of a place or variable:

1. Search places or variables on the
   [Data Commons Search Page](https://datacommons.org/search).

2. Use the [Data Commons Graph Browser](https://datacommons.org/browser) to
   understand the relationship between places. For example, the
   [country/USA](https://datacommons.org/browser/country/USA) page shows us the
   DCIDs for all US states and territories.

3. Find properties of variables using the
   [Data Commons Statistical Variable Explorer](https://datacommons.org/tools/statvar).

Example: Inspecting
[Health / Health Insurance (Household) / No Health Insurance / Households Without Health Insurance](https://datacommons.org/tools/statvar#sv=Count_Household_NoHealthInsurance)
shows us that the statistical variable `Count_Household_NoHealthInsurance` is
available in the `United States` (Data Commons ID, or DCID: `country/USA`) at
`State`, `County`, and `City` levels.

<img src="./docs/assets/stat-var-explorer.png" width="600"/>

## Examples

Basic webpage with examples of each kind of supported chart:
[example.html](./examples/example.html)

Example of adding some custom javascript to enable dynamic updating of charts:
[example-dynamic.html](./examples/example-dynamic.html)
