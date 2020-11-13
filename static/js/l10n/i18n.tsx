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
function loadLocaleData(locale: string): Promise<Record<any, any>> {
  switch (locale) {
    case "es":
      return import("./compiled-lang/es.json");
    default:
      return import("./compiled-lang/en.json");
  }
}

var intl;
async function initIntl() {
  const messages = await loadLocaleData(locale);
  intl = createIntl({ locale, messages }, intlCache);
  // Now the intl object is localized and ready to use.
}
initIntl();

export { locale, intl };
