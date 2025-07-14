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

/**
 * Component for rendering the generated follow up questions.
 */
import axios from "axios";
import _ from "lodash";
import React, { ReactElement, useEffect, useState } from "react";
import { SubjectPageMetadata } from "../../types/subject_page_types";


interface PageOverviewPropType {
  query: string;
  pageMetadata: SubjectPageMetadata;
}

export function PageOverview(props: PageOverviewPropType): ReactElement {
    const [pageOverview, setPageOverview] = useState("")
    useEffect(() => {
        const statVars = getRelevantStatVars(props.pageMetadata);
    getPageOverview(props.query,statVars)
    .then((value) => {
        setPageOverview(value);
    })
    .catch(() => {
        setPageOverview("");
    })
    }, [props.query,props.pageMetadata])

    return (
        <div>
            <span className="page-overview-span">{pageOverview}</span>
        </div>
    )
}

// Gets page overview from the /api/explore/page-overview endpoint and processes the response
const getPageOverview = async (
  query: string,
  statVars: string[]
): Promise<string> => {
  if (_.isEmpty(query) || _.isEmpty(statVars)) {
    return "";
  }
  const url = "/api/explore/page-overview";
  const body = {
    q: query,
    statVars: statVars,
  };
  return await axios.post(url, body).then((resp) => {
    return resp.data.page_overview;
  });
};

// TODO (javiervazquez) : Fix the constant index
const getRelevantStatVars = (pageMetadata: SubjectPageMetadata): string[] => {
    return pageMetadata.pageConfig.categories[0].blocks.map((block) => {
        return block.title;
    })
}