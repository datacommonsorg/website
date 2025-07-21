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
import { Loading } from "../../components/elements/loading";


interface PageOverviewPropType {
  query: string;
  pageMetadata: SubjectPageMetadata;
}

export function PageOverview(props: PageOverviewPropType): ReactElement {
    const [pageOverview, setPageOverview] = useState([])
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const statVars = getRelevantStatVars(props.pageMetadata);
    getPageOverview(props.query,statVars)
    .then((value) => {
        console.log(value)
        setPageOverview(value);
    })
    .catch(() => {
        console.log("error")
        setPageOverview([]);
    })
    .finally(() => {
      setLoading(false);
    })
    }, [props.query,props.pageMetadata])

    return (
      <>
        {loading && (
          <div className="page-overview-loading">
            <Loading />
          </div>
        )}
        {pageOverview && (
          <div className="page-overview-container">
            {pageOverview}
          </div>
        )}
      </> 
    )
}

const getPageOverview = async (
  query: string,
  statVars: string[]
): Promise<Array<React.ReactNode>> => {
  if (_.isEmpty(query) || _.isEmpty(statVars)) {
    return [];
  }
  const url = "/api/explore/page-overview";
  const body = {
    q: query,
    statVars: statVars.map((stat,idx)=> {
      return {
        "statistical_variable_name":stat,
        "statistical_variable_index":idx,
      }
    }),
  };
  return await axios.post(url, body).then((resp) => {
    console.log(resp.data.page_overview);
    const preprocessed_overview = resp.data.page_overview;
    const split_overview = preprocessed_overview.split(/\{open\}(.*?)\{close\}/)
    return split_overview.map((part,index) => {
      const id = `page_overview_${index}`
      const hasIndex = part.match(/\[(\d+)\]/)
      if (hasIndex){
        const chartIndex = hasIndex[1];
        const targetId = `explore_cat_0_blk_${chartIndex}`;
        return <a
          key={id}
          className="highlight-statvars"
          onClick={(e) => {
            e.preventDefault(); // Prevent default anchor jump
            scrollToStatVar(targetId);
          }}
        >{part.substring(part.indexOf("]")+1)}</a>
      } else {
        return <span
        key={id}
        >{part}</span>
      }
    })
  });
};

// TODO (javiervazquez) : Fix the constant index
const getRelevantStatVars = (pageMetadata: SubjectPageMetadata): string[] => {
    return pageMetadata.pageConfig.categories[0].blocks.map((block) => {
        return block.title;
    })
}

const scrollToStatVar= (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth'});
    }
  };