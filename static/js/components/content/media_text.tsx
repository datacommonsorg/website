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

import React, { ReactElement } from "react";

interface MediaTextProps {
  mediaType: "video" | "image";
  mediaUrl: string;
  title: string;
  children: ReactElement;
}

const MediaText = ({
  mediaType,
  mediaUrl,
  title,
  children,
}: MediaTextProps): ReactElement => {
  return (
    <section id="text-images" className="text-images">
      <div className="container">
        <div className="header">
          <h3> {title} </h3>
          {/* <h3>Your Data Commons at a glance</h3> */}
        </div>
        <div className="media">
          {mediaType === "image" ? (
            <img src={mediaUrl} alt={title} />
          ) : (
            <iframe
              src={`https://www.youtube.com/embed/${mediaUrl}`}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            ></iframe>
          )}
        </div>
        <div className="text">
          {children}
          {/* <p> A custom instance natively joins your data and the base Data Commons data (from datacommons.org) in a unified fashion. Your users can visualize and analyze the data seamlessly without the need for further data preparation.</p> 
          <p>You have full control over your own data and computing resources, with the ability to limit access to specific individuals or open it to the general public.</p>
          <p>Note that each new Data Commons is deployed using the Google Cloud Platform (GCP). </p> */}
        </div>
      </div>
    </section>
  );
};

export default MediaText;
