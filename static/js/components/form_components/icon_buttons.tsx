/**
 * Copyright 2024 Google LLC
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
 * Component for rendering a button
 */

import React, { useEffect, useRef, useState } from "react";
import { styled } from "styled-components";

import { saveToFile } from "../../shared/util";

// How long to show an alternate icon to denote the button was selected.
// For example, how long to show a checkmark after clicking the button.
// Measured in milliseconds.
const ICON_SELECTED_TIMEOUT = 2000;

/* Base Button Component*/

export const StyledButton = styled.button`
  align-items: center;
  background: ${(props) => props.theme.background};
  border: 1px solid #747775;
  border-radius: 100px;
  color: ${(props) => props.theme.color};
  cursor: pointer;
  display: flex;
  font-size: 14px;
  font-weight: 500;
  gap: 8px;
  justify-content: center;
  line-height: 20px;
  padding: 10px 24px;
  text-align: center;
  width: fit-content;

  &:hover {
    background-color: ${(props) => props.theme.hoverBackgroundColor};
    box-shadow: ${(props) => props.theme.hoverBoxShadow};
  }
  .icon {
    font-size: 18px;
  }
`;

const defaultColorTheme = {
  background: "var(--button-background-color, transparent)",
  color: "var(--button-text-color, black)",
  hoverBackgroundColor: "var(--button-highlight-background-color, transparent)",
  hoverBoxShadow: "none",
};

const emphasizedColorTheme = {
  background: "var(--button-emphasized-background-color, transparent)",
  color: "var(--button-emphasized-text-color, black)",
  hoverBackgroundColor:
    "var(--button-emphasized-background-color, transparent)",
  hoverBoxShadow:
    "0px 1px 2px 0px rgba(0, 0, 0, 0.30), 0px 1px 3px 1px rgba(0, 0, 0, 0.15)",
};

interface ButtonProps {
  children?: React.ReactNode;
  // Class name to add to button
  class?: string;
  // Whether to use emphasized styling
  emphasized?: boolean;
  // Icon to show on button to the left of text
  icon?: string;
  // Icon to show temporarily when button is clicked
  iconWhenClicked?: string;
  // Handler for what happens when button is clicked
  onClick: () => void;
}

export function IconButton(props: ButtonProps): JSX.Element {
  const [isClicked, setIsClicked] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout>(null);

  useEffect(() => {
    if (isClicked) {
      timerRef.current = setTimeout(() => {
        setIsClicked(false);
      }, ICON_SELECTED_TIMEOUT);
    }
    return () => clearTimeout(timerRef.current);
  }, [isClicked]);

  const onClickHandler = () => {
    props.onClick();
    setIsClicked(true);
  };

  return (
    <StyledButton
      onClick={onClickHandler}
      className={`button ${props.class || ""}`}
      theme={props.emphasized ? emphasizedColorTheme : defaultColorTheme}
    >
      {props.icon && (
        <span className="material-symbols-outlined icon">
          {(isClicked && props.iconWhenClicked) || props.icon}
        </span>
      )}
      {props.children}
    </StyledButton>
  );
}

/* Copy Button Component */

interface CopyButtonProps {
  //Text to copy to clipboard
  textToCopy: string;
}

export function CopyButton(props: CopyButtonProps): JSX.Element {
  return (
    <IconButton
      icon="file_copy"
      iconWhenClicked="done"
      onClick={() => navigator.clipboard.writeText(props.textToCopy)}
    >
      Copy
    </IconButton>
  );
}

/* Download Button Component */

interface DownloadButtonProps {
  // Content to write to downloaded file
  content: string;
  // Name to give to downloaded file, including extension
  filename: string;
}

export function DownloadButton(props: DownloadButtonProps): JSX.Element {
  return (
    <IconButton
      icon="download"
      iconWhenClicked="download_done"
      onClick={() => saveToFile(props.filename, props.content)}
    >
      Download
    </IconButton>
  );
}
