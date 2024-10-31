import { useCallback, useEffect, useMemo, useState } from "react";

/*
  A breakpoints constant object for responsiveness, for access on the TypeScript side.
  These are the default breakpoints for a page that does not have custom breakpoints and are
  applied in: `static/css/base.scss`

  If a page does not use default breakpoints and those breakpoints are required on
  the TypeScript side, a separate breakpoint object can be created and passed into the hook.
*/
export const BREAKPOINTS = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 1068,
  xl: 1350,
  xxl: 1400,
};

type Breakpoints = Record<string, number>;

/*
 For all comparison functions (up, down, only), the given size ("md", "lg", etc.) refers to
 the screen size range, not just a single breakpoint. This aligns with the equivalent Bootstrap media queries.

 - `up("md")`: Returns true if the window is at least in the "md" screen size range
    (768px or larger by default).
 - `down("md")`: Returns true if the window is in the "md" screen size range or smaller
    (i.e., smaller than the "lg" screen size).
 - `only("md")`: Returns true if the window is within the "md" screen size range
    (768px or larger and smaller than 1068px).
 */

interface BreakpointInterface<B extends Breakpoints = Breakpoints> {
  // Returns true if the current window size is greater than or equal to the size given (such as "md")
  up: (key: keyof B) => boolean;
  // Returns true if the current window size is less than or equal to the size given (such as "md")
  down: (key: keyof B) => boolean;
  // Returns true if the current window size is the size given (such as "md")
  only: (key: keyof B) => boolean;
}

export function useBreakpoints<B extends Breakpoints = typeof BREAKPOINTS>(
  customBreakpoints?: B
): BreakpointInterface<B> {
  const breakpoints = customBreakpoints ?? (BREAKPOINTS as unknown as B);

  const isClient = typeof window !== "undefined";
  const [windowWidth, setWindowWidth] = useState<number>(
    isClient ? window.innerWidth : 0
  );

  useEffect(() => {
    if (!isClient) return;

    const handleResize = (): void => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [isClient]);

  const sortedBreakpoints = useMemo(() => {
    return Object.entries(breakpoints)
      .sort(([, sizeA], [, sizeB]) => sizeA - sizeB)
      .map(([name]) => name as keyof B);
  }, [breakpoints]);

  const up = useCallback(
    (key: keyof B): boolean => {
      const breakpointValue = breakpoints[key];
      return windowWidth >= breakpointValue;
    },
    [windowWidth, breakpoints]
  );

  const down = useCallback(
    (key: keyof B): boolean => {
      const index = sortedBreakpoints.indexOf(key);

      if (index + 1 >= sortedBreakpoints.length) {
        return true;
      }

      const nextBreakpoint = sortedBreakpoints[index + 1];
      const nextBreakpointValue = breakpoints[nextBreakpoint];

      return windowWidth < nextBreakpointValue;
    },
    [windowWidth, breakpoints, sortedBreakpoints]
  );

  const only = useCallback(
    (key: keyof B): boolean => {
      const index = sortedBreakpoints.indexOf(key);

      const currentBreakpointValue = breakpoints[key];
      const nextBreakpointValue =
        index + 1 < sortedBreakpoints.length
          ? breakpoints[sortedBreakpoints[index + 1]]
          : Infinity;

      return (
        windowWidth >= currentBreakpointValue &&
        windowWidth < nextBreakpointValue
      );
    },
    [windowWidth, breakpoints, sortedBreakpoints]
  );

  return { up, down, only };
}
