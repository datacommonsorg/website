# Data Commons Slider Web Component

[Data Commons Web Component](../../README.md) for controlling the date in [datacommons-map](./map.md).

## Usage

```html
<!-- Listen for date changes on the "dc-year" channel -->
<datacommons-map
  header="Population"
  parentPlace="country/USA"
  childPlaceType="State"
  subscribe="dc-map"
  variable="Count_Person"
></datacommons-map>

<!-- Publish date changes on the "dc-year" channel  -->
<datacommons-slider
  publish="dc-map"
  variable="Count_Person"
  parentPlace="country/USA"
  childPlaceType="State"
></datacommons-slider>
```

<img src="../assets/map-slider.png" width="620"/>

### Attributes

Required:

- `dates` _space-separated list of strings_, optional if `variable`, `parentPlace`, and `childPlaceType` are specified

  Set date option range. Example: `"2001 2002 2003"`

- `childPlaceType` _string_, optional if `dates` specified

  Child place types of date range. Example: `State`.

- `parentPlace` _string_, optional if `dates` specified

  Parent place DCID of date range. Example: `country/USA`.

- `variable` _string_, optional if `dates` specified

  Variable DCID of date range. Example: `Count_Person`.

- `publish` _string_

  Event name to publish on slider change

Optional:

- `header` _string_

  Override default header text

- `value` _number_

  Initial slider value
