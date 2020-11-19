# Data Commons Website Localization

## FormatJS/react-intl instructions

These commands should be run in the /static subdirectory.

### Extract strings from .ts and .tsx files with default formatter

This will pull strings out into a JSON format that we can then
transform into a textproto accepted by TC.

```
npm run extract -- 'js/**/*.ts*' --out-file js/i18n/<app>.json --id-interpolation-pattern '[sha512:contenthash:base64:6]'
```

### Compile translation files for use

After transforming the translated textproto files from TC into json,
one more step to compile the JSON into a format usable by FormatJS.

Example for `en`:

```
npm run compile -- js/i18n/lang/en.json --ast --out-file js/i18n/compiled-lang/en.json
```

For now, `es` is copied and hand-updated from compiled-lang/en.json (which was generated directly from place.json).

## TODO

1. Make sure our English place types make it into the input translation files. I have a variable translation in the code but no way of extracting it, and it probably won't be covered by the chart configs.
1. Make sure we have translations for place names.
1. Adapt steps above to pull in actual translations.