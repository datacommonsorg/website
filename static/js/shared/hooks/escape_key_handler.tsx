/**
 * Copyright 2024 Google LLC
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
 * A hook to provide a handler for the escape key press event triggering the
 * provided handler function whenever the "Escape" key is pressed.
 */

import { useEffect } from "react";

export default function useEscapeKeyInputHandler(handler: () => void): void {
  useEffect(() => {
    function listener(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        handler();
      }
    }

    document.addEventListener("keydown", listener);

    return (): void => {
      document.removeEventListener("keydown", listener);
    };
  }, [handler]);
}
