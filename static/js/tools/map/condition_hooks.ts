/**
 * Copyright 2022 Google LLC
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

// This module contains custom React hooks that checks conditions.

import { useContext, useMemo } from "react";

import { Context } from "./context";

// Custom hook to check if needs to compute ratio for the stat.
export function useIfRatio(): boolean {
  const { statVar } = useContext(Context);
  return useMemo(() => {
    return !!statVar.value.perCapita && !!statVar.value.denom;
  }, [statVar.value.perCapita, statVar.value.denom]);
}
