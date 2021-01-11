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

```
for LANG in de en es fr hi it ja ko pt-BR ru zh-CN;
do
npm run compile -- strings/$LANG/place.json --ast --out-file compiled-lang/$LANG/place.json &&
npm run compile -- strings/$LANG/stats_var_labels.json --ast --out-file compiled-lang/$LANG/stats_var_labels.json; done
```

## TODO

1. Make sure our English place types make it into the input translation files. I have a variable translation in the code but no way of extracting it, and it probably won't be covered by the chart configs.
1. Make sure we have translations for place names.
1. Adapt steps above to pull in actual translations.

# For Jinja / Python translations

See these pages for info about:

- [Babel](https://readthedocs.org/projects/python-babel/downloads/pdf/stable/)
- [Flask-Babel](https://flask-user.readthedocs.io/en/v0.6/internationalization.html)
- [Marking up strings for extraction](https://docs.ckan.org/en/2.9/contributing/string-i18n.html)

Use "TRANSLATORS:" to leave descriptive comments to help translators understand the context and deliver good translations.

To extract strings to the template file:
```
.env/bin/pybabel extract -F babel-mapping.ini -o server/l10n/messages.pot -c "TRANSLATORS:" --sort-output -w 1000 --omit-header server/
```

Then update the messages.po file per locale:
```
.env/bin/pybabel update -l $LOCALE -i server/l10n/messages.pot -w 1000 -d server/l10n
```

On server start, the messages are compiled, e.g.
```
.env/bin/pybabel compile -d server/l10n -D messages
```

# For chart_config.json translations

See tools/chart_config_extractor.py:

```
python3 tools/i18n/chart_config_extractor.py
.env/bin/pybabel update -l $LOCALE -i server/l10n/chart_titles.pot -d server/l10n -w 1000
.env/bin/pybabel compile -d server/l10n -D chart_titles
```