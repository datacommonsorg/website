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

import axios, { AxiosResponse } from "axios";
import _ from "lodash";
import React, { ReactElement, useEffect, useState } from "react";

import { Loading } from "../../components/elements/loading";
import { SubjectPageMetadata } from "../../types/subject_page_types";
import { isFeatureEnabled, PAGE_OVERVIEW_LINKS } from "../../shared/feature_flags/util";

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

interface PageOverviewApiResponse {
  pageOverview: string;
  statVarChartLinks: Array<{
    naturalLanguage: string;
    statVarTitle: string;
  }>;
}

interface PageOverviewPostBody {
  q: string;
  statVars: string[];
}

export function PageOverview(props: PageOverviewPropType): ReactElement {
  const [pageOverview, setPageOverview] = useState<Array<React.ReactNode>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  useEffect(() => {
    const statVars: Array<StatVarChartLocation> = getRelevantStatVars(
      props.pageMetadata
    );
    getPageOverview(props.query, statVars)
      .then((value: Array<React.ReactNode>) => {
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
  const body: PageOverviewPostBody = {
    q: query,
    statVars: statVarChartLocations.map((statVarChart) => {
      return statVarChart.title;
    }),
  };
  return await axios
    .post<PageOverviewApiResponse>(url, body)
    .then((resp: AxiosResponse<PageOverviewApiResponse>) => {
      // Check link syntax in overview
      const preprocessedOverview: string = resp.data.pageOverview;
      const testStatSyntax: string = preprocessedOverview.replace(
        GLOBAL_CAPTURE_LINK_GROUP,
        "$1"
      );
      // If the markers still exist, the links were not marked properly so the overview with no links is returned
      if (CHECK_MARKERS_EXIST.test(testStatSyntax) || (!isFeatureEnabled(PAGE_OVERVIEW_LINKS))) {
        const cleanedOverview: string = testStatSyntax.replace(
          GLOBAL_MARKERS,
          ""
        );
        return [<span key="page_overview_0">{cleanedOverview}</span>];
      }
      // Create Maps to speed up string look ups
      const statVarOverviewExcerptsToTitle = new Map<string, string>(
        resp.data.statVarChartLinks.map((link) => [
          link.naturalLanguage,
          link.statVarTitle,
        ])
      );
      const chartTitleToPageLocation = new Map<string, StatVarChartLocation>(
        statVarChartLocations.map((statVarChart) => [
          statVarChart.title,
          statVarChart,
        ])
      );

      // Adding capture groups to regex split delimiter causes them to appear in the output array,
      // thus including annotated stat vars.
      const splitOverview: Array<string> =
        preprocessedOverview.split(SPLIT_LINKS);
      return splitOverview.map((part, index) => {
        const partId = `page_overview_${index}`;
        const formatMatch: RegExpMatchArray | null =
          part.match(CAPTURE_LINK_GROUP);

        // If substring doesn't match our link list or the title doesn't exist in our input,
        // return a regular span to avoid faulty links.
        if (!formatMatch) {
          return <span key={partId}>{part}</span>;
        }

        const statVarOverviewExcerpt: string = formatMatch[1];
        const chartTitle: string | undefined =
          statVarOverviewExcerptsToTitle.get(statVarOverviewExcerpt);
        if (!chartTitle) {
          return <span key={partId}>{statVarOverviewExcerpt}</span>;
        }

        const chartIndex: StatVarChartLocation | undefined =
          chartTitleToPageLocation.get(chartTitle);
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

const scrollToStatVar = (id: string): void => {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};
