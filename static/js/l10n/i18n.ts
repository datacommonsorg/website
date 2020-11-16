import { createIntl, createIntlCache } from "react-intl";

// Get locale from query params. If none, use navigator language.
function determineLocale() {
  let urlParams = new URLSearchParams(window.location.search);
  let locale = urlParams.get("hl");
  if (!locale) {
    locale = navigator.language;
  }
  return locale;
}
const locale = determineLocale();

// A single cache instance can be shared for all locales.
const intlCache = createIntlCache();

// TODO(tjann): see if there's abetter Record type.
// TODO(tjann): see if we can ship locale specific js bundles.
function loadLocaleData(locale: string): Promise<Record<any, any>> {
  switch (locale) {
    case "es":
      return import("./compiled-lang/es.json");
    default:
      return import("./compiled-lang/en.json");
  }
}

// This IntlShape object will be used for both React Intl's
// React Component API (arg for RawIntlProvider) and
// Imperative API (format<X> method).
// TODO(datcom): see if we want to prefer the Component API as much as possible.
var intl;
async function initIntl() {
  const messages = await loadLocaleData(locale);
  intl = createIntl({ locale, messages }, intlCache);
  // Now the intl object is localized and ready to use.
}
initIntl();

// Only use this for variables. Raw strings in JS should call
// intl.formatMessage directly in order for the extractor to work.
// Note that for variables, we must use React Intl's imperative API.
function translateVariableString(
  id: string,
  defaultText: string = id,
  translatorHint: string = id
): string {
  if (!id) {
    return "";
  }
  return intl.formatMessage({
    // Matching ID as above
    id: id,
    // Default Message in English. Note that this will still log error.
    // TODO(tjann): See if we can surpress error logs.
    defaultMessage: defaultText,
    description: translatorHint,
  });
}

export { locale, intl, translateVariableString };
