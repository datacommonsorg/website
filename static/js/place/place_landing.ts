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

import { loadLocaleData } from "../i18n/i18n";
import { initSearchAutocomplete } from "../shared/place_autocomplete";

window.addEventListener("load", (): void => {
  const locale = document.getElementById("locale").dataset.lc;
  loadLocaleData(locale, [
    import(`../i18n/compiled-lang/${locale}/place.json`),
  ]).then(() => {
    initSearchAutocomplete("/place");
  });
});
