/**
 * Copyright 2022 Google LLC
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
import _ from "lodash";
import React from "react";

import { ConstantVar } from "./components/mapping_templates/constant_var";
import { MulitVarCol } from "./components/mapping_templates/multi_var_col";
import { MultiVarMultiDateCol } from "./components/mapping_templates/multi_var_mulit_date_col";
import { SingleVarMultiDateCol } from "./components/mapping_templates/single_var_multi_date_col";
import { CsvData, MappedThing, Mapping } from "./types";

// information about a template
export interface TemplateInfo {
  title: string;
  subtitle: string;
  explanation: JSX.Element;
  table: JSX.Element;
}

const CONSTANT_VAR_TABLE = (
  <table>
    <thead>
      <tr>
        <th>Place</th>
        <th>Date</th>
        <th>Value</th>
        <th>...</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>USA</td>
        <td>2019</td>
        <td>2.0</td>
        <td>...</td>
      </tr>
      <tr>
        <td>USA</td>
        <td>2020</td>
        <td>2.3</td>
        <td>...</td>
      </tr>
    </tbody>
  </table>
);

const CONSTANT_VAR_EXPLANATION = (
  <div>This file contains data about Median_Income for many places</div>
);

const SINGLE_VAR_MULTI_DATE_COL_TABLE = (
  <table>
    <thead>
      <tr>
        <th>Place</th>
        <th>2019</th>
        <th>2020</th>
        <th>...</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>USA</td>
        <td>1.0</td>
        <td>2.0</td>
        <td>...</td>
      </tr>
      <tr>
        <td>IND</td>
        <td>1.4</td>
        <td>2.3</td>
        <td>...</td>
      </tr>
    </tbody>
  </table>
);

const SINGLE_VAR_MULTI_DATE_COL_EXPLANATION = (
  <div>
    This file contains data about Median_Income, with data about multiple dates
    on each row.
  </div>
);

const MULTI_VAR_MULTI_DATE_COL_TABLE = (
  <table>
    <thead>
      <tr>
        <th>Place</th>
        <th>Variable</th>
        <th>2019</th>
        <th>2020</th>
        <th>...</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>USA</td>
        <td>Female Population</td>
        <td>1.0</td>
        <td>2.0</td>
        <td>...</td>
      </tr>
      <tr>
        <td>USA</td>
        <td>Male Population</td>
        <td>1.4</td>
        <td>2.3</td>
        <td>...</td>
      </tr>
    </tbody>
  </table>
);

const MULTI_VAR_MULTI_DATE_COL_EXPLANATION = (
  <div>
    This file containes data about the variables &quot;Female Population&quot;
    and &quot;Male Population&quot;, with data about a single place and date on
    each row for each variable.
  </div>
);

const MULTI_VAR_COL_TABLE = (
  <table>
    <thead>
      <tr>
        <th>Place</th>
        <th>Date</th>
        <th>Female Population</th>
        <th>Male Population</th>
        <th>...</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>USA</td>
        <td>2019</td>
        <td>1.0</td>
        <td>2.0</td>
        <td>...</td>
      </tr>
      <tr>
        <td>IND</td>
        <td>2020</td>
        <td>1.4</td>
        <td>2.3</td>
        <td>...</td>
      </tr>
    </tbody>
  </table>
);

const MULTI_VAR_COL_EXPLANATION = (
  <div>
    This file contains data about the variables &quot;Female Population&quot;
    and &quot;Male Population&quot;, with data about a single place and variable
    on each row for mulitple dates.
  </div>
);

// All the available template options where key is templateId and value is info
// about the temaplate. Every templateId in this object must also be a key in
// TEMPLATE_MAPPING_COMPONENTS
export const TEMPLATE_OPTIONS: { [templateId: string]: TemplateInfo } = {
  constantVar: {
    title: "Single Variable",
    subtitle: "One date column",
    explanation: CONSTANT_VAR_EXPLANATION,
    table: CONSTANT_VAR_TABLE,
  },
  multiVarCol: {
    title: "Multiple Variables",
    subtitle: "One date column",
    explanation: MULTI_VAR_COL_EXPLANATION,
    table: MULTI_VAR_COL_TABLE,
  },
  multiVarMultiDateCol: {
    title: "Multiple Variables",
    subtitle: "Multiple date columns",
    explanation: MULTI_VAR_MULTI_DATE_COL_EXPLANATION,
    table: MULTI_VAR_MULTI_DATE_COL_TABLE,
  },
  singleVarMultiDateCol: {
    title: "Single Variable",
    subtitle: "Multiple date columns",
    explanation: SINGLE_VAR_MULTI_DATE_COL_EXPLANATION,
    table: SINGLE_VAR_MULTI_DATE_COL_TABLE,
  },
};

export interface MappingTemplateProps {
  csvData: CsvData;
  userMapping: Mapping;
  onChangeUserMapping: (mapping: Mapping) => void;
}

// Map of templateId to the mapping component to render for that templateId.
// templateId must be present in TEMPLATE_OPTIONS in order for users to choose
// this template.
// TODO: Fold in TEMPLATE_OPTIONS to each component.
export const TEMPLATE_MAPPING_COMPONENTS: {
  [templateId: string]: (props: MappingTemplateProps) => JSX.Element;
} = {
  constantVar: ConstantVar,
  multiVarCol: MulitVarCol,
  multiVarMultiDateCol: MultiVarMultiDateCol,
  singleVarMultiDateCol: SingleVarMultiDateCol,
};

function getConstantVarUserMapping(predictedMapping: Mapping): Mapping {
  let userMapping = new Map();
  if (!_.isEmpty(predictedMapping)) {
    userMapping = _.clone(predictedMapping);
    predictedMapping.forEach((mappingVal, mappedThing) => {
      // mappingVal for stat var must have fileConstant
      const invalidStatVarVal =
        mappedThing === MappedThing.STAT_VAR &&
        _.isEmpty(mappingVal.fileConstant);
      // mappingVal for non stat var things must have a column
      const invalidNonStatVarVal =
        mappedThing !== MappedThing.STAT_VAR && _.isEmpty(mappingVal.column);
      if (invalidStatVarVal || invalidNonStatVarVal) {
        console.log(
          `Invalid mappingVal for ${mappedThing}. Entry deleted from mapping.`
        );
        userMapping.delete(mappedThing);
      }
    });
  }
  return userMapping;
}

function getSingleVarMultiDateUserMapping(predictedMapping: Mapping): Mapping {
  let userMapping = new Map();
  if (!_.isEmpty(predictedMapping)) {
    userMapping = _.clone(predictedMapping);
    const nonColumnMappedThings = new Set([
      MappedThing.STAT_VAR,
      MappedThing.DATE,
    ]);
    predictedMapping.forEach((mappingVal, mappedThing) => {
      let isInvalid = false;
      // mappingVal for stat var must have fileConstant
      if (
        mappedThing === MappedThing.STAT_VAR &&
        _.isEmpty(mappingVal.fileConstant)
      ) {
        isInvalid = true;
      }
      // mapping val for date must have headers
      isInvalid =
        isInvalid ||
        (mappedThing === MappedThing.DATE && _.isEmpty(mappingVal.headers));
      // mappingVal for all other mapped things must have a column
      isInvalid =
        isInvalid ||
        (!nonColumnMappedThings.has(mappedThing) &&
          _.isEmpty(mappingVal.column));
      if (isInvalid) {
        console.log(
          `Invalid mappingVal for ${mappedThing}. Entry deleted from mapping.`
        );
        userMapping.delete(mappedThing);
      }
    });
  }
  return userMapping;
}

// Map of templateId to a function that takes the predicted mapping and returns
// the user mapping to use for that template.
// TODO: add test that checks every template has a user mapping function once
//       user mapping functions are added for the rest of the existing templates
export const TEMPLATE_PREDICTION_VALIDATION: {
  [templateId: string]: (predictedMapping: Mapping) => Mapping;
} = {
  constantVar: getConstantVarUserMapping,
  singleVarMultiDateCol: getSingleVarMultiDateUserMapping,
};
