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

/**
 * A hook for managing the lifecycle of a promise or multiple promises
 * within a React component. This allows the calling components to use
 * the promises without internally managing the loading and error hooks.
 */

import { useEffect, useState } from "react";

export function usePromiseResolver<T>(promise: () => Promise<T>): {
  data: T | null;
  loading: boolean;
  error: Error | null;
};

export function usePromiseResolver<T>(promises: (() => Promise<T>)[]): {
  data: T[] | null;
  loading: boolean;
  error: Error | null;
};

/**
 * @param promises A memoized function (or array of functions) that
 * returns the promise(s) to be resolved. The hook will re-execute when the
 * promises or promises change.
 * @returns An object containing the resolved data, loading state, and error state.
 */
export function usePromiseResolver<T>(
  promises: (() => Promise<T>) | (() => Promise<T>)[]
): { data: T | T[] | null; loading: boolean; error: Error | null } {
  const [data, setData] = useState<T | T[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isCanceled = false;
    setLoading(true);
    setError(null);
    setData(null);

    const promise = Array.isArray(promises)
      ? Promise.all(promises.map((p) => p()))
      : promises();

    promise
      .then((result: T | T[]) => {
        if (!isCanceled) {
          setData(result);
        }
      })
      .catch((e: Error) => {
        if (!isCanceled) {
          setError(e);
        }
      })
      .finally(() => {
        if (!isCanceled) {
          setLoading(false);
        }
      });

    return () => {
      isCanceled = true;
    };
  }, [promises]);

  return { data, loading, error };
}
