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
 * A component to display a video hero component
 */

import React, { ReactElement } from "react";

interface HeroVideoProps {
  //a link to the video source
  videoSource: string;
  //a link to the poster image for the video
  videoPosterSource: string;
  //the content to be displayed alongside the video
  children: ReactElement;
}

export const HeroVideo = ({
  videoSource,
  videoPosterSource,
  children,
}: HeroVideoProps): ReactElement => {
  return (
    <section id="hero" className="hero">
      <div className="container">
        <div className="video-background">
          <video autoPlay loop muted poster={videoPosterSource}>
            <source src={videoSource} type="video/mp4" />
          </video>
        </div>
        <div className="big-description">{children}</div>
      </div>
    </section>
  );
};
