import { createIntl, createIntlCache } from "react-intl";

// Get locale from query params. If none, use navigator language.
function determineLocale() {
  const urlParams = new URLSearchParams(window.location.search);
  let locale = urlParams.get("hl");
  if (!locale) {
    locale = navigator.language;
  }
  return locale;
}
const locale = determineLocale();

// A single cache instance can be shared for all locales.
const intlCache = createIntlCache();

// TODO(tjann): see if we can ship locale specific js bundles.
function loadLocaleData(locale: string): Promise<Record<any, any>> {
  if (
    ["de", "es", "fr", "hi", "it", "ja", "ko", "pt-BR", "ru", "zh-CN"].includes(
      locale
    )
  ) {
    return import(`./compiled-lang/${locale}/place.json`);
  }
  return import("./compiled-lang/en/place.json");
}

// This IntlShape object will be used for both React Intl's
// React Component API (arg for RawIntlProvider) and
// Imperative API (format<X> method).
// TODO(datcom): Make this a promise.
let intl;
async function initIntl() {
  const messages = await loadLocaleData(locale);
  intl = createIntl({ locale, messages }, intlCache);
  // Now the intl object is localized and ready to use.
}
initIntl();

// Only use this for variables. Raw strings in JS should call
// intl.formatMessage or <FormattedMessage> directly
// in order for the extractor to pick up the id.
function translateVariableString(id: string): string {
  if (!id) {
    return "";
  }
  return intl.formatMessage({
    // Matching ID as above
    id: id,
    // Default Message in English.
    // Can consider suppressing log error when translation not found.
    defaultMessage: id,
    description: id,
  });
}

export { locale, intl, translateVariableString };
