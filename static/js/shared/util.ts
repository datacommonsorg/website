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

function randDomId(): string {
  return Math.random()
    .toString(36)
    .replace(/[^a-z]+/g, "")
    .substr(2, 10);
}

/**
 * Saves csv to filename.
 * @param {filename} string
 * @param {contents} string
 * @return void
 */
function saveToFile(filename: string, contents: string): void {
  let mimeType = "text/plan";
  if (filename.match(/\.csv$/i)) {
    mimeType = "text/csv;chartset=utf-8";
  } else if (filename.match(/\.svg$/i)) {
    mimeType = "image/svg+xml;chartset=utf-8";
  }
  const blob = new Blob([contents], { type: mimeType });
  const link = document.createElement("a");
  const url = window.URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.onclick = () => {
    setTimeout(() => window.URL.revokeObjectURL(url));
  };
  link.click();
  link.remove();
}

/**
 * Get the domain from a url.
 */
function urlToDomain(url: string): string {
  return url
    .replace("http://", "")
    .replace("https://", "")
    .replace("www.", "")
    .split(/[/?#]/)[0];
}

export { randDomId, saveToFile, urlToDomain };
