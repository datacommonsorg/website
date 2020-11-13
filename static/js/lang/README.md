# FormatJS i18n instructions

These commands should be run in the /static subdirectory.

## Extract strings from .ts and .tsx files with default formatter

```
npm run extract -- 'js/**/*.ts*' --out-file ../server/locales/lng/en.json --id-interpolation-pattern '[sha512:contenthash:base64:6]'
```

## Compile translation files for use

```
npm run compile -- ../server/locales/lng/en.json --ast --out-file ../server/locales/compiled-lng/en.json
```

## Not working yet

### Extract strings from .ts and .tsx files with special formatter

```
npm run extract -- 'js/**/*.ts*' --out-file ../server/locales/lng/en.json --id-interpolation-pattern '[sha512:contenthash:base64:6]' --format=js/formatter.js
```

### Compile translation files for use with special formatter

```
npm run compile -- ../server/locales/lng/en.json --ast --out-file ../server/locales/compiled-lng/en.json --format=js/formatter.js
```
