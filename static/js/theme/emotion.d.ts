import "@emotion/react";

import { Theme as CustomTheme } from "./types";

declare module "@emotion/react" {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  export interface Theme extends CustomTheme {}
}
