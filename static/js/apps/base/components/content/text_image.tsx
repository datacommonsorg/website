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

const TextImage = (): ReactElement => {
  return (
    <section id="hero-columns" className="hero-columns">
      <div className="container">
        <div className="header">
          <h3>Your Data Commons at a glance</h3>
        </div>
        <div className="image">
          <img src="/images/content/about_diagram.png" alt="Data Commons Query Diagram" />
        </div>
        <div className="text">
          <p> A custom instance natively joins your data and the base Data Commons data (from datacommons.org) in a unified fashion. Your users can visualize and analyze the data seamlessly without the need for further data preparation.</p> 
          <p>You have full control over your own data and computing resources, with the ability to limit access to specific individuals or open it to the general public.</p>
          <p>Note that each new Data Commons is deployed using the Google Cloud Platform (GCP). </p>
        </div>
      </div>
    </section>
  );
};

export default TextImage;