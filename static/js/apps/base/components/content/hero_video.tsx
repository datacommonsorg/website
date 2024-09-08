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

const Hero = (): ReactElement => {
  return (
    <section id="hero" className="hero">
      <div className="container">
        <div className="video-background">
          <video autoPlay loop muted poster='/images/hero/hero_video.png'>
            <source src='/images/hero/hero_video.mp4' type='video/mp4' />
          </video>
        </div>
        <div className="big-description">
          <h3>Data Commons aggregates and harmonizes global, open data, giving everyone the power to uncover insights with natural language questions</h3>
          <p>Data Commons' open source foundation allows organizations to create tailored, private instances, deciding on the openness of their data contributions. <a href="#">Build yours today</a></p>
        </div>
      </div>
    </section>
  );
};

export default Hero;