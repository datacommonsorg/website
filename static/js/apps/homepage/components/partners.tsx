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
 * A component that renders the partners section of the home page.
 */

import React, { ReactElement } from "react";

import { Partner } from "../../../shared/types/homepage";

interface PartnersProps {
  //the partners passed from the backend through to the JavaScript via the templates
  partners: Partner[];
}

const Partners = ({ partners }: PartnersProps): ReactElement => {
  return (
    <section className="container">
      <div className="partners">
        <h3>Other organizations with a Data Commons</h3>
        <ul className="partners-items">
          {partners.map((partner) => (
            <li key={partner.id}>
              <a
                key={partner.id}
                href={partner.url}
                title={partner.title}
                target="_blank"
                rel="noopener noreferrer"
                className={partner.id}
              >
                <img
                  src={"/images/partners/logo_" + partner.id + ".png"}
                  alt={partner.title}
                />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default Partners;
