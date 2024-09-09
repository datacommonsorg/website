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
 * Main component for the build your own Data Commons page
 */

import React, { ReactElement } from "react";

import MediaText from "../../components/content/media_text";
import { Routes } from "../../shared/types/base";

interface AppProps {
  //the routes dictionary - this is used to convert routes to resolved urls
  routes: Routes;
}

/**
 * Application container
 */
export function App({ routes }: AppProps): ReactElement {
  return (
    <>
      <section className="text-columns">
        <div className="container">
          <header className="header">
            <h3>Why Data Commons</h3>
          </header>
          <div className="col_left">
            <p>
              Many of the big challenges we face — climate change, increasing
              inequities, epidemics of diabetes and other health conditions —
              will need deep insights to solve. These insights will need to be
              firmly grounded in data. Fortunately, a lot of this data is
              already publicly available. Unfortunately, there is a difference
              between data being public and data being easily usable by those
              who need access to it. It is this gap that we are trying to
              bridge. Google has organized and made easily accessible many kinds
              of information — web pages, images, maps, videos and so on. Now we
              are doing this for publicly available data. We have organized the
              core of this data from a wide range of sources, ranging from
              governmental statistical organizations like census bureaus to
              organizations like the World Bank and the United Nations. And
              recent advances in AI have enabled us to go much farther than we
              had thought possible in making this data easily accessible - now
              you can use natural language to access the data.{" "}
            </p>
          </div>
          <div className="col_right">
            <p>
              Data Commons synthesizes a single graph from these different data
              sources. It links references to the same entities (such as cities,
              counties, organizations, etc.) across different datasets to nodes
              on the graph, so that users can access data about a particular
              entity aggregated from different sources without data cleaning or
              joining.{" "}
            </p>
            <p>
              <strong>
                We hope the data contained within Data Commons will be useful to
                students, researchers, and enthusiasts across different
                disciplines.
              </strong>
            </p>
          </div>
        </div>
      </section>

      <MediaText
        title="Who can use it"
        mediaType="video"
        mediaSource="O6iVsS-RDYI"
      >
        <>
          <p>
            {" "}
            Data Commons can be accessed by anyone here at Datacommons.org.
            Students, researchers, journalists, non profits, policymakers, and
            private enterprises can access the tools and allow them to
            manipulate and make decisions based on data without the need to know
            how to code. Software developers can use the REST, Python and Google
            Sheets APIs, all of which are free for educational, academic and
            journalistic research purposes.{" "}
          </p>
        </>
      </MediaText>

      <section className="text-columns">
        <div className="container">
          <header className="header">
            <h3>Collaborations</h3>
          </header>
          <div className="col_left">
            <p>
              Data Commons has benefited greatly from many collaborations. In
              addition to help from US Department of Commerce (notably the
              Census Bureau), we have received help from our many academic
              collaborations, including, University of California San Francisco,
              Stanford University, University of California Berkeley, Harvard
              University and Indian Institute of Technology Madras. We have also
              collaborated with nonprofits such as Techsoup, Feeding America,
              and Resources for the Future.
            </p>
          </div>
          <div className="col_right">
            <p>
              We are looking for more collaborators, both for adding new data to
              Data Commons and for building new and interesting applications of
              Data Commons. Please fill out this form if you are interested in
              working with us.
            </p>
          </div>
        </div>
      </section>

      <section className="text-columns no-header">
        <div className="container">
          <div className="col_left">
            <h3>Stay in touch</h3>
            <p>Stay informed about the latest Data Commons developments: visit our blog or sign up for our mailing list</p>
            <a href="#" className="btn btn-primary">Join the mailing list</a>
          </div>
          <div className="col_right">
            <h3>See Also</h3>
            <ul>
              <li><a href="#">Data Sources</a></li>
              <li><a href="#">Disclaimers</a></li>
              <li><a href="#">Frequently Asked Questions</a></li>
              <li><a href="#">Blog</a></li>
            </ul>
          </div>
        </div>
      </section>

    </>
  );
}
