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

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement } from "react";

import { Loading } from "../elements/loading";

export interface MetadataSummaryProps {
  // Metadata loading state: true (loading), false (loaded), undefined (no metadata)
  metadataLoadingState?: boolean;
  // The metadata summary (based on the citation)
  metadataSummary?: string;
}

/**
 * Renders a small metadata/citation section under the block description.
 */
export function MetadataSummary({
  metadataLoadingState,
  metadataSummary,
}: MetadataSummaryProps): ReactElement | null {
  const theme = useTheme();

  const shouldShow =
    metadataLoadingState === true ||
    (metadataLoadingState === false && !!metadataSummary);

  if (!shouldShow) {
    return null;
  }

  return (
    <div
      className="metadata-summary"
      css={css`
        ${theme.typography.text.sm};
      `}
    >
      {metadataLoadingState === true && <Loading />}
      {metadataLoadingState === false && metadataSummary}
    </div>
  );
}
