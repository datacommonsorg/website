# datacommons-js

Embed [datacommons.org](https://datacommons.org) [statistical variable](https://datacommons.org/tools/statvar) visualizations in your web application.

## Usage

Include datacommons.js and styles in your html

```
<link rel="stylesheet" href="https://www.datacommons.org/css/ranking.min.css" />
<link rel="stylesheet" href="https://www.datacommons.org/css/nl_interface.min.css" />
<script src="https://datacommons.org/datacommons.js"></script>
```

## Examples

For a complete example, see [example.html](./example.html)

### Bar chart

Draw a multi-variable bar chart

Initialize empty div

```html
<div id="bar-example"></div>
```

Render the chart

```js
datacommons.drawBar(document.getElementById("bar-example"), {
  id: "bar-chart-1",
  svgChartHeight: 200,
  className: "my-chart",
  apiRoot: datacommons.root,
  isDataTile: false,
  title:
    "Population Below Poverty Level Status in Past Year in States of United States (2020)",
  place: {
    dcid: "country/USA",
    name: "United States of America",
    types: ["Country"],
  },
  enclosedPlaceType: "State",
  statVarSpec: [
    {
      name: "Population Below Poverty Level Status in Past Year",
      statVar: "Count_Person_BelowPovertyLevelInThePast12Months",
    },
  ],
});
```

Renders:

![Bar chart](./assets/bar-chart.png "Bar Chart")

### Line chart

Draw a multi-variable line chart

Initialize empty div

```html
<div id="line-example"></div>
```

Render the chart

```js
datacommons.drawLine(document.getElementById("line-example"), {
  id: "line-chart-1",
  svgChartHeight: 200,
  className: "my-chart",
  apiRoot: datacommons.root,
  isDataTile: false,
  title:
    "Population Below Poverty Level Status in Past Year in United States (2020)",
  place: {
    dcid: "country/USA",
    name: "United States of America",
    types: ["Country"],
  },
  statVarSpec: [
    {
      name: "Population Below Poverty Level Status in Past Year",
      statVar: "Count_Person_BelowPovertyLevelInThePast12Months",
    },
  ],
});
```

Renders:
![Line chart](./assets/line-chart.png "Line Chart")

### Map chart

Draw a choropleth map

Initialize empty div

```html
<div id="map-example"></div>
```

Render the chart

```js
datacommons.drawMap(document.getElementById("map-example"), {
  id: "map-chart-1",
  svgChartHeight: 200,
  className: "my-chart",
  apiRoot: datacommons.root,
  isDataTile: false,
  title:
    "Population Below Poverty Level Status in Past Year in States of United States (2020)",
  place: {
    dcid: "country/USA",
    name: "United States of America",
    types: ["Country"],
  },
  enclosedPlaceType: "State",
  statVarSpec: {
    name: "Population Below Poverty Level Status in Past Year",
    statVar: "Count_Person_BelowPovertyLevelInThePast12Months",
  },
});
```

Renders:

![Map chart](./assets/map-chart.png "Map Chart")

### Ranking chart

Draw ranking chart (bar chart + ordered table)

Initialize empty div

```html
<div id="ranking-example"></div>
```

Render the chart

```js
datacommons.drawRanking(document.getElementById("ranking-example"), {
  placeName: "USA",
  placeType: "State",
  withinPlace: "country/USA",
  statVar: "Count_Person_BelowPovertyLevelInThePast12Months",
  isPerCapita: false,
  scaling: 1,
  unit: "",
  date: "2020",
});
```

Renders:

![Ranking chart](./assets/ranking-chart.png "Ranking Chart")

## API

### `datacommons.drawBar`

Draws bar chart tile with specified [statistical variable](https://datacommons.org/tools/statvar).

- `element` (HTMLElement)

  DOM element to attach the chart

- `props` (BarTilePropType)

  Chart configuration object

  - `id` (string)

    DOM id attribute to attach to the chart

  - `title` (string)

    Chart title

  - `place` (NamedTypedPlace)

    Scope the statistical variable query by this place configuration

    - `dcid` (string): Place DCID
    - `name` (string): Place name
    - `types` (string[]): [Place types](https://datacommons.org/browser/Place)

  - `enclosedPlaceType` (string)

    Enclosing place type

  - `comparisonPlaces` (string[])

    A list of related places dcids to show comparison with the main place.

  - `statVarSpec` (StatVarSpec)

    Datacommons [statistical variable](https://datacommons.org/tools/statvar) configuration

    - `statVar` (string): Statistical variable dcid
    - `denom` (string): Denominator (e.g., `Count_Person`)
    - `unit` (string): [Unit](https://datacommons.org/browser/UnitOfMeasure) (e.g., '$')
    - `scaling` (number):
    - `log` (boolean): Set to true to color values using logarithmic scale
    - `name?` (string):

  - `svgChartHeight` (number)

    Height (px) for the underlying SVG chart.

  - `className` (string)

    Extra classes to add to the container.

  - `isDataTile?` (boolean)

    Whether or not to render the data version of this tile

  - `apiRoot` (string)

    Datacommons API root. Default: `https://datacommons.org`

### `datacommons.drawLine`

Draws line chart tile with specified [statistical variable](https://datacommons.org/tools/statvar).

- `element` (HTMLElement)

  DOM element to attach the chart

- `props` (LineTilePropType)

  Chart configuration object

  - `id` (string)

    DOM id attribute to attach to the chart

  - `title` (string)

    Chart title

  - `place` (NamedTypedPlace)

    Scope the statistical variable query by this place configuration

    - `dcid` (string): Place DCID
    - `name` (string): Place name
    - `types` (string[]): [Place types](https://datacommons.org/browser/Place)

  - `comparisonPlaces` (string[])

    A list of related places dcids to show comparison with the main place.

  - `statVarSpec` (StatVarSpec)

    Datacommons [statistical variable](https://datacommons.org/tools/statvar) configuration

    - `statVar` (string): Statistical variable dcid
    - `denom` (string): Denominator (e.g., `Total_Population`)
    - `unit` (string): [Unit](https://datacommons.org/browser/UnitOfMeasure) (e.g., '$')
    - `scaling` (number):
    - `log` (boolean): Set to true to color values using logarithmic scale
    - `name?` (string):

  - `svgChartHeight` (number)

    Height (px) for the underlying SVG chart.

  - `className` (string)

    Extra classes to add to the container.

  - `isDataTile?` (boolean)

    Whether or not to render the data version of this tile

  - `apiRoot` (string)

    Datacommons API root. Default: `https://datacommons.org`

### `datacommons.drawMap`

Draws choropleth map with specified statistical variables.

- `element` (HTMLElement)

  DOM element to attach the chart

- `props` (MapTilePropType)

  Chart configuration object

  - `id` (string)

    DOM id attribute to attach to the chart

  - `title` (string)

    Chart title

  - `place` (NamedTypedPlace)

    Scope the statistical variable query by this place configuration

    - `dcid` (string): Place DCID
    - `name` (string): Place name
    - `types` (string[]): [Place types](https://datacommons.org/browser/Place)

  - `enclosedPlaceType` (string)

    Enclosing place type

  - `statVarSpec` (StatVarSpec)

    Datacommons [statistical variable](https://datacommons.org/tools/statvar) configuration

    - `statVar` (string): Statistical variable dcid
    - `denom` (string): Denominator (e.g., `Total_Population`)
    - `unit` (string): [Unit](https://datacommons.org/browser/UnitOfMeasure) (e.g., '$')
    - `scaling` (number):
    - `log` (boolean): Set to true to color values using logarithmic scale
    - `name?` (string):

  - `svgChartHeight` (number)

    Height (px) for the underlying SVG chart.

  - `className` (string)

    Extra classes to add to the container.

  - `isDataTile?` (boolean)

    Whether or not to render the data version of this tile

  - `apiRoot` (string)

    Datacommons API root. Default: `https://datacommons.org`

### `datacommons.drawRanking`

Draw ranking chart (bar chart + ordered table)

- `element` (HTMLElement)

  DOM element to attach the chart

- `props` (RankingPagePropType)

  Chart configuration object

  - `placeName` (string)
  - `placeType` (string)
  - `withinPlace` (string)
  - `statVar` (string)
  - `isPerCapita` (boolean)
  - `scaling` (number)
  - `unit` (string)
  - `date` (string)
