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

import { Dispatch, SetStateAction, useState } from "react";

/**
 * A custom hook to manage state that can be either controlled (from props)
 * or uncontrolled (internal component state). If uncontrolled, behaves
 * just like React.useState. If controlled, will use the given controlled
 * value and setter.
 *
 * @param controlledValue The value passed from props (if any).
 * @param setControlledValue The value setter passed from props (if any).
 *                           Must be provided if controlledValue is provided.
 * @param defaultValue The initial value to use if uncontrolled.
 * @returns A [value, setValue] tuple, just like React.useState.
 */
export function useControllableState<T>(
  controlledValue: T | undefined,
  setControlledValue: ((newValue: T) => void) | undefined,
  defaultValue: T
): readonly [T, Dispatch<SetStateAction<T>>] {
  // Determine if the component is controlled
  const isControlled =
    controlledValue !== undefined && setControlledValue !== undefined;

  // Set up internal state for the uncontrolled case
  const [internalValue, setInternalValue] = useState(defaultValue);

  // Used the controlled value if controlled, otherwise use internal value
  const stateValue = isControlled ? controlledValue : internalValue;

  // Used controlled setter if controlled, otherwise use internal setter
  const setStateValue = isControlled ? setControlledValue : setInternalValue;

  return [stateValue, setStateValue];
}
