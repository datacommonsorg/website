import "@emotion/react";

import { Theme as CustomTheme } from "../base_theme/types";

declare module "@emotion/react" {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  export interface Theme extends CustomTheme {}
}
