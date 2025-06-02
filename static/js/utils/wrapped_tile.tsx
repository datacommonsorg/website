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
 * This component wraps a chart tile in the Emotion theme and
 * styled-components style-sheet manager.
 *
 * This originally resided directly in utils.ts, using nested
 * createElements. However, with the added nesting and corresponding
 * complexity introduced by the Emotion cache and theme providers,
 * it was moved to its own file and converted to jsx.
 */

import createCache from "@emotion/cache";
import { CacheProvider, ThemeProvider } from "@emotion/react";
import React, { ReactElement, useMemo } from "react";
import { StyleSheetManager } from "styled-components";

import theme from "../theme/theme";

export interface WrappedTileProps {
  // Tile jsx
  Tile: (props: any) => ReactElement;
  // The tile's props
  tileProps: any;
  // The host element where Emotion and Styled
  // Components will inject their styles.
  styleHost: HTMLElement;
}

export function WrappedTile({
  Tile,
  tileProps,
  styleHost,
}: WrappedTileProps): ReactElement {
  const cache = useMemo(
    () => createCache({ key: "wc", container: styleHost }),
    [styleHost]
  );

  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={theme}>
        <StyleSheetManager target={styleHost}>
          <Tile {...tileProps} />
        </StyleSheetManager>
      </ThemeProvider>
    </CacheProvider>
  );
}
