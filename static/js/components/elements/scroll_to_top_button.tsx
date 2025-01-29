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
 * A component that renders a scroll to top button  - a commonly-used component that
 * displays a floating arrow in the bottom right corner of the page. On click, it
 * brings you back to the top.
 */

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, { useEffect, useState } from "react";

import { ArrowUpward } from "./icons/arrow_upward";

export const ScrollToTopButton = (): JSX.Element => {
  const [isVisible, setIsVisible] = useState(false);
  const theme = useTheme();

  // Show button when page is scrolled down
  useEffect(() => {
    const toggleVisibility = (): void => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);
    return (): void => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = (): void => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <button
      onClick={scrollToTop}
      css={css`
        position: fixed;
        bottom: 20px;
        right: 20px;
        background-color: ${theme?.colors?.button?.primary?.base};
        color: white;
        border: none;
        border-radius: 50%;
        padding: 10px;
        cursor: pointer;
        opacity: 0.8;
        z-index: 100; // Ensure it's above other elements
        transition: opacity 0.3s ease;
        display: ${isVisible ? "block" : "none"};

        &:hover {
          opacity: 1;
          background-color: ${theme?.colors?.button?.primary?.dark};
        }
      `}
    >
      <ArrowUpward />
    </button>
  );
};
