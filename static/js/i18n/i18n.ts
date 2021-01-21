import { createIntl, createIntlCache, IntlShape } from "react-intl";

// Get locale from query params. If none, use navigator language.
// function determineLocale() {
//   const urlParams = new URLSearchParams(window.location.search);
//   const locale = urlParams.get("hl");
//   if (
//     [
//       "de",
//       "en",
//       "es",
//       "fr",
//       "hi",
//       "it",
//       "ja",
//       "ko",
//       "pt-BR",
//       "ru",
//       "zh-CN",
//     ].includes(locale)
//   ) {
//     return locale;
//   }
//   return "en";
// }
// const locale = determineLocale();

// A single cache instance can be shared for all locales.
// TODO(beets): might not be necessary since we create one intl object.
const intlCache = createIntlCache();

// This IntlShape object will be used for both React Intl's
// React Component API (arg for RawIntlProvider) and
// Imperative API (format<X> method).
let intl: IntlShape;

/**
 * Load compiled messages into the global intl object.
 *
 * @param locale: Locale determined server-side for consistency.
 * @param modules: An array of Promises from calling import on the compiled message module for the current locale. Note that this needs to be done from the app so that we won't have to bundle all compiled messages across apps. See https://webpack.js.org/api/module-methods/#dynamic-expressions-in-import
 */
async function loadLocaleData(
  locale: string,
  modules: Promise<Record<any, any>>[]
): Promise<void> {
  const allMessages = {};
  Promise.all(modules).then((messages) => {
    for (const msg of messages) {
      Object.assign(allMessages, msg.default);
    }
    intl = createIntl({ locale, messages: allMessages }, intlCache);
  });
}

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

export { loadLocaleData, intl, translateVariableString };
