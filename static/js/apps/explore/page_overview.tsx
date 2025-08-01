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
 * Component for rendering the generated page overview.
 */

import axios from "axios";
import _ from "lodash";
import React, { ReactElement, useEffect, useState } from "react";

import { Loading } from "../../components/elements/loading";
import { SubjectPageMetadata } from "../../types/subject_page_types";

const GLOBAL_CAPTURE_LINK_GROUP = /<([^<>]+)>/g;
const CAPTURE_LINK_GROUP = /<([^<>]+)>/;
const SPLIT_LINKS = /(<[^<>]+>)/;
const CHECK_MARKERS_EXIST = /<|>/;
const GLOBAL_MARKERS = /<|>/g;

type ChartIndex = {
  title: string;
  block: number;
  category: number;
};

interface PageOverviewPropType {
  query: string;
  pageMetadata: SubjectPageMetadata;
}

export function PageOverview(props: PageOverviewPropType): ReactElement {
  const [pageOverview, setPageOverview] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const statVars = getRelevantStatVars(props.pageMetadata);
    getPageOverview(props.query, statVars)
      .then((value) => {
        setPageOverview(value);
      })
      .catch(() => {
        setPageOverview([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [props.query, props.pageMetadata]);

  return (
    <>
      {loading && (
        <div className="page-overview-loading">
          <Loading />
        </div>
      )}
      {pageOverview && (
        <div className="page-overview-inner">{pageOverview}</div>
      )}
    </>
  );
}

const getPageOverview = async (
  query: string,
  statVars: Array<ChartIndex>
): Promise<Array<React.ReactNode>> => {
  if (_.isEmpty(query) || _.isEmpty(statVars)) {
    return [];
  }
  const url = "/api/explore/page-overview";
  const body = {
    q: query,
    statVars: statVars.map((stat) => {
      return stat.title;
    }),
  };
  return await axios.post(url, body).then((resp) => {
    // Check link syntax in overview
    const preprocessedOverview = resp.data.page_overview;
    const testStatSyntax = preprocessedOverview.replace(
      GLOBAL_CAPTURE_LINK_GROUP,
      "$1"
    );
    // If the markers still exist, the links were not marked properly so the overview with no links is returned
    if (CHECK_MARKERS_EXIST.test(testStatSyntax)) {
      const cleanedOverview = testStatSyntax.replace(GLOBAL_MARKERS, "");
      return <span>{cleanedOverview}</span>;
    }
    // Create Maps to speed up string look ups
    const preprocessedStatVarIndices = resp.data.stat_var_links;
    const substringsToStatVarIndex = new Map<string, string>();
    for (const statVarIdx of preprocessedStatVarIndices) {
      substringsToStatVarIndex.set(
        statVarIdx.natural_language,
        statVarIdx.stat_var_title
      );
    }
    const titleToCatNBlockIndex = new Map<string, ChartIndex>();
    for (const statVarChart of statVars) {
      titleToCatNBlockIndex.set(statVarChart.title, statVarChart);
    }

    const splitOverview = preprocessedOverview.split(SPLIT_LINKS);
    return splitOverview.map((part, index) => {
      const partId = `page_overview_${index}`;
      const formatMatch = part.match(CAPTURE_LINK_GROUP);
      // If substring matches our link list and the title exists in our input, return a link else a span
      if (formatMatch) {
        const naturalLanguageStatVar = formatMatch[1];
        const naturalLanguageMatch = substringsToStatVarIndex.has(
          naturalLanguageStatVar
        );
        const titleMatch =
          naturalLanguageMatch &&
          titleToCatNBlockIndex.has(
            substringsToStatVarIndex.get(naturalLanguageStatVar)
          );
        if (titleMatch) {
          const chartTitle = substringsToStatVarIndex.get(
            naturalLanguageStatVar
          );
          const categoryIndex = titleToCatNBlockIndex.get(chartTitle).category;
          const blockIndex = titleToCatNBlockIndex.get(chartTitle).block;
          const targetId = `explore_cat_${categoryIndex}_blk_${blockIndex}`;
          return (
            <a
              key={partId}
              className="highlight-statvars"
              onClick={(): void => scrollToStatVar(targetId)}
            >
              {naturalLanguageStatVar}
            </a>
          );
        } else {
          return <span key={partId}>{naturalLanguageStatVar}</span>;
        }
      } else {
        return <span key={partId}>{part}</span>;
      }
    });
  });
};

const getRelevantStatVars = (
  pageMetadata: SubjectPageMetadata
): Array<ChartIndex> => {
  return pageMetadata.pageConfig.categories.flatMap((category, categoryIndex) =>
    category.blocks.map((block, blockIndex) => ({
      title: block.title,
      category: categoryIndex,
      block: blockIndex,
    }))
  );
};

const scrollToStatVar = (id): void => {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};
