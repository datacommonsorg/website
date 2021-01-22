/**
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Helpers for formatJS i18n library. More info at formatjs.io
 */

import React from "react";
import { createIntl, createIntlCache, IntlCache, IntlShape } from "react-intl";

// A single cache instance can be shared for all locales.
// TODO(beets): might not be necessary since we create one intl object.
const intlCache: IntlCache = createIntlCache();

// This IntlShape object will be used for both React Intl's
// React Component API (arg for RawIntlProvider) and
// Imperative API (format<X> method).
let intl: IntlShape;

/**
 * Load compiled messages into the global intl object.
 *
 * @param locale: Locale determined server-side for consistency.
 * @param modules: An array of Promises from calling import on the compiled
 *   message module for the current locale. Note that this needs to be done from
 *   the app so that we won't have to bundle all compiled messages across apps.
 *   See https://webpack.js.org/api/module-methods/#dynamic-expressions-in-import
 */
async function loadLocaleData(
  locale: string,
  modules: Promise<Record<any, any>>[]
): Promise<void> {
  const allMessages = {};
  return Promise.all(modules).then((messages) => {
    for (const msg of messages) {
      Object.assign(allMessages, msg.default);
    }
    intl = createIntl({ locale, messages: allMessages }, intlCache);
  });
}

/**
 * Returns translation for message with :id. If unavailable, :id is returned as
 * the translation.
 *
 * Note: Only use this for variables. Raw strings in JS should call
 * intl.formatMessage or <FormattedMessage> directly in order for the extractor
 * to pick up the id.
 *
 * @param id: message bundle id
 * @return translation for :id, or :id if translation is unavailable.
 */
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

interface LocalizedLinkProps {
  className?: string;
  href: string;
  text: string;
}

function LocalizedLink(props: LocalizedLinkProps): JSX.Element {
  let href;
  if (intl.locale == "en") {
    href = props.href;
  } else {
    let url = new URL(props.href, document.location.origin);
    let urlParams = new URLSearchParams(url.searchParams);
    urlParams.set("hl", intl.locale);
    url.search = urlParams.toString();
    console.log(urlParams.toString());
    console.log(url.toString());
    href = url.toString();
  }
  return (
    <a href={href} className={props.className ? props.className : null}>
      {props.text}
    </a>
  );
}

export { LocalizedLink, loadLocaleData, intl, translateVariableString };
