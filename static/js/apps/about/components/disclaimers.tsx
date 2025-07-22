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

import React, { ReactElement } from "react";
import { TextColumns } from "../../../components/content/text_columns";

/**
 * A component to display the Disclaimers at the bottom of the about page
 */

export const Disclaimers = (): ReactElement => {
  return (
    <div>
        <h6>Disclaimers</h6>
        <br />
        <TextColumns>
        <TextColumns.Left>
            <p>All data and information provided by Google Data Commons is offered "as is" and is intended for informational and research purposes only. It is not intended as professional advice of any kind (e.g., financial, investment, legal, tax, medical) and should not be relied upon as the sole basis for any decisions. Users should exercise their own judgment and discretion when interpreting and using the data.</p>
            <p>Google does not endorse any specific use of the data or guarantee the suitability of any analysis or derivative work created using Data Commons. Google will not be liable for any damages or losses arising from the use of, or reliance on, the information provided through Data Commons.</p>
        </TextColumns.Left>
        <TextColumns.Right>
            <p>Data in Data Commons is compiled from various third-party providers. While efforts are made to clean, normalize, and join data at scale, Google does not guarantee the accuracy, adequacy, or completeness of any data. Google is not responsible for errors, omissions, delays, or interruptions in data, or for any actions taken in reliance thereon. Data refresh frequency varies by source.</p>
        </TextColumns.Right>
        </TextColumns>
    </div>

  );
};