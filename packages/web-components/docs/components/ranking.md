# Data Commons Ranking Chart Web Component

[Data Commons Web Component](../../README.md) for listing statistical variables around a single place in descending or ascending order.

## Usage

```html
<datacommons-ranking
  title="US States with the Highest Population"
  parentPlace="country/USA"
  childPlaceType="State"
  variable="Count_Person"
></datacommons-ranking>
```

<img src="../assets/ranking.png" width="620"/>

### Attributes

Required:

- `childPlaceType` _string_

  Child place types to plot. Example: `State`.

- `parentPlace` _string_

  Parent place DCID to plot. Example: `country/USA`.

- `title` _string_

  Chart title.

- `variable` _string_

  Variable DCID to plot. Example: `Count_Person`

Optional:

- `showLowest` _boolean_

  Include to sort values in ascending order.

  Default sort order: descending.

### Examples

Show a ranking of US States by population, lowest to highest

```html
<datacommons-ranking
  title="US States with the Lowest Population"
  parentPlace="country/USA"
  childPlaceType="State"
  variable="Count_Person"
  showLowest
></datacommons-ranking>
```
