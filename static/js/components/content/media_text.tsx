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
 * A component to display a media/text component. This component renders in two columns a piece of
 * media (video or image) and text content
 */

/** @jsxImportSource @emotion/react */

import { css, useTheme } from "@emotion/react";
import React, { ReactElement } from "react";

interface MediaTextProps {
  //the type of media that will be displayed - either a video or an image, with a video representing a YouTube video
  mediaType: "video" | "image";
  //the source of the media - for video, this will be the video id, and for an image this will be the url
  mediaSource: string;
  //the header of the component (optional)
  header?: string;
  //the typographical component for the header (defaults to "h4")
  headerComponent?: "h3" | "h4" | "p";
  //the alt for the image (optional)
  imageAlt?: string;
  //the text (or other) content, given as the children of the component
  children: ReactElement;
}

export const MediaText = ({
  mediaType,
  mediaSource,
  header,
  headerComponent,
  imageAlt,
  children,
}: MediaTextProps): ReactElement => {
  const theme = useTheme();
  return (
    <article
      css={css`
        display: grid;
        grid-template-columns: 6fr 4fr;
        gap: ${theme.spacing.md}px ${theme.spacing.xxl}px;
        @media (max-width: ${theme.breakpoints.md}px) {
          gap: ${theme.spacing.md}px ${theme.spacing.xl}px;
        }
        @media (max-width: ${theme.breakpoints.sm}px) {
          grid-template-columns: 1fr;
          gap: ${theme.spacing.md}px;
        }
      `}
    >
      {header && (
        <header
          css={css`
            grid-column: 1 / span 2;
            order: 0;
            @media (max-width: ${theme.breakpoints.sm}px) {
              grid-column: 1;
            }
            & > h3 {
              ${theme.typography.heading.md}
            }
            & > h4 {
              ${theme.typography.heading.sm}
            }
            & > p {
              ${theme.typography.text.md}
            }
          `}
        >
          {(!headerComponent || headerComponent === "h4") && <h4>{header}</h4>}
          {headerComponent === "h3" && <h3>{header}</h3>}
          {headerComponent === "p" && <p>{header}</p>}
        </header>
      )}
      <div className="media">
        {mediaType === "image" ? (
          <figure
            css={css`
              ${theme.elevation.secondary}
              ${theme.radius.secondary}
                overflow: hidden;
              background-color: ${theme.colors.background.primary.light};
            `}
          >
            <img
              css={css`
                display: block;
                width: 100%;
                height: auto;
              `}
              src={mediaSource}
              alt={imageAlt}
            />
          </figure>
        ) : (
          <div
            css={css`
              ${theme.elevation.secondary}
              ${theme.radius.secondary}
                box-sizing: border-box;
              position: relative;
              width: 100%;
              display: block;
              border: none;
              outline: none;
              overflow: hidden;
              padding-bottom: 56.25%;
              border-radius: 20px;
              background-color: ${theme.colors.background.primary.light};
              & > iframe,
              & > video {
                margin: 0;
                padding: 0;
                border: none;
                outline: none;
                isolation: isolate;
                box-sizing: border-box;
                display: block;
                width: 100%;
                height: 100%;
                position: absolute;
                top: 0;
                right: 0;
                bottom: 0;
                left: 0;
              }
            `}
          >
            <iframe
              src={`https://www.youtube.com/embed/${mediaSource}`}
              title="YouTube video player"
              style={{ border: "none" }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            ></iframe>
          </div>
        )}
      </div>
      <div
        css={css`
          & > h3 {
            ${theme.typography.heading.sm}
          }
          & > h4 {
            ${theme.typography.heading.xs}
          }
          & > p {
            ${theme.typography.text.md}
          }
        `}
      >
        {children}
      </div>
    </article>
  );
};
