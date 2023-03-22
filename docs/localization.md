# Data Commons Website Localization

There are 2 internationalization libraries used

- FormatJS/react-intl for client-side strings (React in static/)
- pybabel for server-side strings (Jinja / Python in server/)

Background reading:

- [Babel](https://readthedocs.org/projects/python-babel/downloads/pdf/stable/)
- [Flask-Babel](https://flask-user.readthedocs.io/en/v0.6/internationalization.html)
- [Marking up strings for extraction](https://docs.ckan.org/en/2.9/contributing/string-i18n.html)
- [FormatJS](https://formatjs.io/)

## Adding / modifying strings

Note: Please add very detailed descriptions and instructions for the
translators. Provide context, example usage, specific links to definitions
and capture screenshots.

For pybabel, use "TRANSLATORS:" right above the string to leave descriptions.

Prepare mesages for translation by extracting from both python and react with:

```bash
./scripts/extract_messages.sh
```

Send a PR with the changes from the script then follow the instructions in [google3](http://google3/datacommons/i18n/README.md).

## Compile translation files for use

In order to use the extracted strings (regardless of translation status),
compile the messages to be used by both libraries after following the steps in [google3](http://google3/datacommons/i18n/README.md).

```bash
./scripts/compile_messages.sh
```

Restart the flask / minikube server (for template strings) or npm for these strings to take effect.
To test the instructions, append the `hl=<language_code>` to the URL. e.g.: /place/country/USA?hl=fr

## Adding languages

- Reach out to beets for help getting the strings marked for translation into the new language.
- Update both compile_messages.sh and extract_messages.sh with the list of languages.
- Once translations are ready:
  - Pull in the strings to both server/i18n and static/js/i18n, compile using step above.
  - Add the language to the list in server/lib/i18n.py.
