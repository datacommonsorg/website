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

type StatVarChartLocation = {
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
  statVarChartLocations: Array<StatVarChartLocation>
): Promise<Array<React.ReactNode>> => {
  if (_.isEmpty(query) || _.isEmpty(statVarChartLocations)) {
    return [];
  }
  const url = "/api/explore/page-overview";
  const body = {
    q: query,
    statVars: statVarChartLocations.map((statVarChart) => {
      return statVarChart.title;
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
    const statVarOverviewExcerptsToTitle = new Map<string, string>(
      resp.data.stat_var_links.map((link) => [
        link.natural_language,
        link.stat_var_title,
      ])
    );
    const chartTitleToPageLocation = new Map<string, StatVarChartLocation>(
      statVarChartLocations.map((statVarChart) => [
        statVarChart.title,
        statVarChart,
      ])
    );

    // Adding capture groups to regex split delimiter causes them to appear in the output array, thus including annotated stat vars.
    const splitOverview = preprocessedOverview.split(SPLIT_LINKS);
    return splitOverview.map((part, index) => {
      const partId = `page_overview_${index}`;
      const formatMatch = part.match(CAPTURE_LINK_GROUP);

      // If substring doesn't match our link list or the title doesn't exist in our input, return a regular span to avoid faulty links.
      if (!formatMatch) {
        return <span key={partId}>{part}</span>;
      }

      const statVarOverviewExcerpt = formatMatch[1];
      const chartTitle = statVarOverviewExcerptsToTitle.get(
        statVarOverviewExcerpt
      );
      if (!chartTitle) {
        return <span key={partId}>{statVarOverviewExcerpt}</span>;
      }

      const chartIndex = chartTitleToPageLocation.get(chartTitle);
      if (!chartIndex) {
        return <span key={partId}>{statVarOverviewExcerpt}</span>;
      }
      const targetId = `explore_cat_${chartIndex.category}_blk_${chartIndex.block}`;
      return (
        <a
          key={partId}
          className="highlight-statvars"
          onClick={(): void => scrollToStatVar(targetId)}
        >
          {statVarOverviewExcerpt}
        </a>
      );
    });
  });
};

const getRelevantStatVars = (
  pageMetadata: SubjectPageMetadata
): Array<StatVarChartLocation> => {
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
