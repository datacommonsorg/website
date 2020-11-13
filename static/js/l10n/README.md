# FormatJS i18n instructions

These commands should be run in the /static subdirectory.

## Extract strings from .ts and .tsx files with default formatter

```
npm run extract -- 'js/**/*.ts*' --out-file js/l10n/extracted_strings.json --id-interpolation-pattern '[sha512:contenthash:base64:6]'
```

## Compile translation files for use

```
npm run compile -- js/l10n/lang/en.json --ast --out-file js/l10n/compiled-lang/en.json
```
