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
 * A component that renders the footer on all pages via the base template.
 */

/** @jsxImportSource @emotion/react */

import { css, SerializedStyles, useTheme } from "@emotion/react";
import React, { ReactElement } from "react";

import { Labels } from "../../../shared/types/base";
import { Theme } from "../../../theme/types";

interface FooterProps {
  //if true, will display an alternate, lighter version of the logo.
  brandLogoLight: boolean;
  //the labels dictionary - all labels will be passed through this before being rendered. If no value exists, the dictionary will return the key that was sent.
  labels: Labels;
}

const FOOTER_LINKS = [
  { label: "Terms and Conditions", href: "https://policies.google.com/terms" },
  {
    label: "Privacy Policy",
    href: "https://policies.google.com/privacy?hl=en-US",
  },
];

const footerLinks = (theme: Theme): SerializedStyles => css`
  display: flex;
  flex-wrap: wrap;
  font-size: 14px;
  margin: 0;
  padding: 0;

  li {
    display: block;
    margin: 0;
    padding: 0;
  }

  a {
    ${theme.typography.family.text};
    color: ${theme.colors.text?.tertiary?.dark};
    font-weight: 100;
    &:hover {
      text-decoration: underline;
    }
  }
`;

const Footer = ({ brandLogoLight, labels }: FooterProps): ReactElement => {
  const theme = useTheme();

  return (
    <footer
      // id="main-footer-container"
      css={css`
        display: flex;
        justify-content: space-between;
        flex-wrap: wrap;
        width: 100%;
        padding: ${theme.spacing.lg}px 0;
        margin: auto;
        max-width: ${theme.width.xl}px;
        @media (max-width: ${theme.breakpoints.lg}px) {
          max-width: 100%;
          padding: ${theme.spacing.lg}px ${theme.spacing.lg}px;
        }
        @media (max-width: 580px) {
          justify-content: center;
          gap: ${theme.spacing.sm}px;
        }
      `}
    >
      <div
        css={css`
          display: flex;
          align-items: center;
          gap: ${theme.spacing.sm}px;
        `}
      >
        <p
          css={css`
            ${theme.typography.family.text};
            ${theme.typography.text.xs};
            font-weight: 400;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            color: ${theme.colors.text?.tertiary?.dark};
            margin: 0;
          `}
        >
          {labels["An initiative from"]}
        </p>
        <img
          width="74"
          height="25"
          src={
            brandLogoLight
              ? "/images/google-logo-reverse.svg"
              : "/images/google-logo.svg"
          }
          alt="Google Logo"
          css={css`
            transform: translateY(-1px);
          `}
        />
      </div>
      <ul
        css={[
          footerLinks(theme),
          css`
            gap: ${theme.spacing.md}px;
            @media (max-width: ${theme.breakpoints.sm}px) {
              justify-content: center;
            }
          `,
        ]}
      >
        {FOOTER_LINKS.map(({ label, href }) => (
          <li key={href}>
            <a href={href}>{labels[label]}</a>
          </li>
        ))}
      </ul>
    </footer>
  );
};

export default Footer;
