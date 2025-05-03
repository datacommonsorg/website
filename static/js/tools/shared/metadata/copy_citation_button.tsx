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
    const id = window.setTimeout(() => setCopied(false), 3000);
    return (): void => window.clearTimeout(id);
  }, [copied]);

  return (
    <Button
      startIcon={!copied ? <ContentCopy /> : <Check />}
      ref={ref}
      disabled={disabled}
      {...rest}
      onClick={handleClick}
    >
      {children}
    </Button>
  );
});

CopyCitationButton.displayName = "CopyCitationButton";
