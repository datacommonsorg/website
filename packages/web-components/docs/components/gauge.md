# Data Commons Gauge Chart Web Component

[Data Commons Web Component](../../README.md) for visualizing a single statistical variable about a single place.

## Usage

```html
<datacommons-gauge
  title="Percentage of US Population that are Internet Users"
  place="country/USA"
  variable="Count_Person_IsInternetUser_PerCapita"
  min="0"
  max="100"
></datacommons-gauge>
```

<img src="../assets/gauge.png" width="620"/>

### Attributes

Required:

- `max` _number_

  Gauge maximum value.

- `min` _number_

  Gauge minimum value.

- `place` _string_

  Place DCID to plot.

- `title` _string_

  Chart title.

- `variable` _string_

  Variable DCID to plot.

Optional:

- `colors` _space-separated list of strings_

  Optionally specify a custom chart color scheme for the display variable. Will interpolate colors linearly depending on how many are passed in.

  Values should follow CSS specification (keywords, rgb, rgba, hsl, #hex). Separate multiple values with spaces, e.g., `"#ff0000 #00ff00 #0000ff"`. Make sure individual colors have no spaces. For example, use `rgba(255,0,0,0.3)` instead of `rgba(255, 0, 0, 0.3)`.
