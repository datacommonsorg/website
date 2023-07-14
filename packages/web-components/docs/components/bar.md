# Data Commons Bar Chart Web Component

[Data Commons Web Component](../../README.md) for visualizing one or more statistical variables around one or more places on a bar chart.

## Usage

```html
<datacommons-bar
  title="Most populous states in the US"
  parentPlace="country/USA"
  childPlaceType="State"
  variables="Count_Person"
  maxPlaces="15"
></datacommons-bar>
```

## Attributes

Required:

- `childPlaceType` _string_, optional if `places` specified

  Child place types to plot. Example: `State`.

- `parentPlace` _string_, optional if `places` specified

  Parent place DCID to plot. Example: `country/USA`.

- `places` _space-separated list of strings_, optional if `childPLaceType` and `parentPlace` specified

  Place DCID(s) to plot. Example: `"geoId/12 geoId/13"`).

- `title` _string_

  Chart title.

- `variables` _space-separated list of strings_

  Variable DCID(s) to plot. Example: `"Count_Person Count_Farm"`.

Optional:

- `barHeight` _number_

  Bar height (in px) for horizontal charts.

- `colors` _space-separated list of strings_

  Optionally specify a custom chart color for each variable. Pass colors in the same order as variables.

  Values should follow CSS specification (keywords, rgb, rgba, hsl, #hex). Separate multiple values with spaces, e.g., `"#ff0000 #00ff00 #0000ff"`. Make sure individual colors have no spaces. For example, use `rgba(255,0,0,0.3)` instead of `rgba(255, 0, 0, 0.3)`.

- `maxPlaces` _number_

  Maximum _number_ of child places to plot. Default: `7`.

- `sort` _string_

  Bar chart sort order

  Options:

  - `ascending` (ascending by the variable's value)
  - `descending` (descending by the variable's value)
  - `ascendingPopulation` (ascending by the place's population)
  - `descendingPopulation` (descending by the place's population)
  - Default: `descendingPopulation`

- `horizontal` _boolean_

  Include to draw bars horizontally instead of vertically

- `stacked` _boolean_
  Include to draw as stacked bar chart instead of grouped chart

- `lollipop` _boolean_

  Include to draw lollipops instead of bars

## Examples

A bar chart of population for states in the US:

```html
<datacommons-bar
  title="Population of US States"
  parentPlace="country/USA"
  childPlaceType="State"
  variables="Count_Person"
></datacommons-bar>
```

A bar chart of population for specific US states:

```html
<datacommons-bar
  title="Population of US States"
  variables="Count_Person"
  places="geoId/01 geoId/02"
></datacommons-bar>
```

A stacked bar chart of population for specific US states:

```html
<datacommons-bar
  title="Population of US States"
  variableDcid="Count_Person"
  places="geoId/01 geoId/02"
  stacked
></datacommons-bar>
```

A horizontal, stacked bar chart of median income for specific US states:

```html
<datacommons-bar
  title="Median income by gender"
  variables="Median_Income_Person_15OrMoreYears_Male_WithIncome Median_Income_Person_15OrMoreYears_Female_WithIncome"
  places="geoId/01 geoId/02 geoId/04 geoId/20 geoId/21 geoId/22 geoId/23 geoId/24 geoId/25"
  stacked
  horizontal
  sort="descending"
></datacommons-bar>
```

A lollipop chart of population for states in the US:

```html
<datacommons-bar
  title="Population of US States"
  parentPlace="country/USA"
  childPlaceType="State"
  variables="Count_Person"
  lollipop
></datacommons-bar>
```
