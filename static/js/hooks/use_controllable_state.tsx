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

import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

/**
 * A custom hook to manage state that can be either controlled (from props)
 * or uncontrolled (internal component state). If uncontrolled, behaves
 * just like React.useState. If controlled, will use the given controlled
 * value and setter.
 *
 * @param value The value passed from props (if any).
 * @param onChange The value setter passed from props (if any).
 *                           Must be provided if value is provided.
 * @param defaultValue The initial value to use if uncontrolled.
 * @returns A [value, setValue] tuple, just like React.useState.
 */
export function useControllableState<T>(
  value: T | undefined,
  onChange: ((next: T) => void) | undefined,
  defaultValue: T | (() => T)
): readonly [T, Dispatch<SetStateAction<T>>] {
  // Determine if the component is controlled
  // Use controlled mode if a value is passed in from props
  const isControlled = value !== undefined;

  // Set up internal state for the uncontrolled case
  const [internalValue, setInternalValue] = useState(defaultValue);

  // Used the controlled value if controlled, otherwise use internal value
  const stateValue = isControlled ? value : internalValue;

  // Wrap stateValue in a ref so that it's not a dependency in setStateValue
  // This keeps setStateValue stable instead of recreating itself when the value changes
  const stateValueRef = useRef(stateValue);
  useEffect(() => {
    stateValueRef.current = stateValue;
  }, [stateValue]);

  // Callback to set the state value
  const setStateValue: Dispatch<SetStateAction<T>> = useCallback(
    (newValue) => {
      const currentValue = stateValueRef.current;

      // If new value follows (prev) => prev + 1 pattern, execute function
      const resolvedValue =
        newValue instanceof Function ? newValue(currentValue) : newValue;

      if (!isControlled) {
        // If uncontrolled, use internal setter
        setInternalValue(resolvedValue);
      }

      if (onChange) {
        // If controlled, use controlled setter if provided
        onChange(resolvedValue);
      }
    },
    [isControlled, onChange]
  );

  return [stateValue, setStateValue];
}
