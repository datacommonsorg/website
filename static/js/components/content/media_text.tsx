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
 * A component to display a media/text component. This component renders in two columns a piece of media (video or image) and text content
 */

import React, { ReactElement } from "react";

interface MediaTextProps {
  //the type of media that will be displayed - either a video or an image, with a video representing a YouTube video
  mediaType: "video" | "image";
  //the source of the media - for video, this will be the video id, and for an image this will be the url
  mediaSource: string;
  //the title that renders at the top of the component
  title?: string;
  //the text (or other) content, given as the children of the component
  children: ReactElement;
}

const MediaText = ({
  mediaType,
  mediaSource,
  title,
  children,
}: MediaTextProps): ReactElement => {
  return (
    <section id="text-images" className="text-images">
      <div className="container">
        {title && (
          <div className="header">
            <h3> {title} </h3>
          </div>
        )}
        <div className="media">
          {mediaType === "image" ? (
            <figure>
              <img src={mediaSource} alt={title} />
            </figure>
          ) : (
            <div className="video-player">
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
        <div className="text">{children}</div>
      </div>
    </section>
  );
};

export default MediaText;
