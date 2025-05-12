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
 * A wrapper for the button component that implements the copy to
 * clipboard functionality.
 */

/** @jsxImportSource @emotion/react */

import { css } from "@emotion/react";
import React, { forwardRef, useEffect, useState } from "react";

import {
  Button,
  ButtonElementProps,
} from "../../../components/elements/button/button";
import { Check } from "../../../components/elements/icons/check";
import { ContentCopy } from "../../../components/elements/icons/content_copy";

export type CopyCitationButtonProps = Omit<ButtonElementProps, "onClick"> & {
  // the content of the citation that will be copied to the clipboard
  citationToCopy: string;
  // optional "onClick" that, if given, will run in addition to the copy logic
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
};

const iconWrapper = css`
  position: relative;
  display: inline-block;
  width: 1em;
  height: 1em;
  & > svg {
    position: absolute;
    inset: 0;
    transition: opacity 150ms ease, transform 150ms ease;
  }
  & .hidden {
    opacity: 0;
    transform: scale(0);
  }
`;

export const CopyCitationButton = forwardRef<
  HTMLButtonElement,
  CopyCitationButtonProps
>((props: CopyCitationButtonProps, ref) => {
  const {
    citationToCopy,
    children,
    disabled = false,
    onClick,
    ...rest
  } = props;

  const [copied, setCopied] = useState(false);

  async function copyToClipboard(text: string): Promise<void> {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      return;
    }
    throw new Error("Unable to copy to clipboard");
  }

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    onClick?.(e);
    if (!disabled) void copyToClipboard(citationToCopy);
  };

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1500);
    return (): void => clearTimeout(id);
  }, [copied]);

  return (
    <Button
      ref={ref}
      disabled={disabled}
      {...rest}
      onClick={handleClick}
      startIcon={
        <span css={iconWrapper}>
          <ContentCopy className={copied ? "hidden" : undefined} />
          <Check className={!copied ? "hidden" : undefined} />
        </span>
      }
    >
      {children}
    </Button>
  );
});

CopyCitationButton.displayName = "CopyCitationButton";
