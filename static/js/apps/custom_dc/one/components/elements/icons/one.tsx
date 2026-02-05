/**
 * Copyright 2025 Google LLC
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

import React, { ReactElement } from "react";

export const One = (props: React.SVGProps<SVGSVGElement>): ReactElement => (
  <svg
    viewBox="0 0 80 80"
    width="1em"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M40 0C17.9261 0 0 17.8784 0 40C0 62.0739 17.8784 80 40 80C62.0739 80 80 62.1216 80 40C80 17.9261 62.0739 0 40 0ZM28.7485 45.5304C28.7485 50.3933 24.6484 53.7306 19.3087 53.7306C13.9213 53.7306 9.82122 50.441 9.82122 45.5304V32.2289C9.82122 27.3659 13.9213 24.0763 19.3087 24.0763C24.6484 24.0763 28.7485 27.3182 28.7485 32.2289V45.5304ZM50.8701 53.0155H44.6246L40.2384 43.8141L38.2837 39.7616V53.0155H31.5137V24.7914H38.093L42.3361 34.2312L44.1478 38.2837V24.7437H50.8701V53.0155ZM66.9845 35.8522V41.1919H61.4541V46.4362H70.0358V52.9678H53.826V24.7437H69.9881V30.8939H61.4064V35.8522H66.9845ZM19.261 30.3218C18.3552 30.3218 17.5447 30.8939 17.5447 31.7998V45.9595C17.5447 46.913 18.4029 47.4374 19.261 47.4374C20.1669 47.4374 20.9774 46.8653 20.9774 45.9595V31.7998C20.9774 30.8462 20.1669 30.3218 19.261 30.3218Z"></path>
  </svg>
);
