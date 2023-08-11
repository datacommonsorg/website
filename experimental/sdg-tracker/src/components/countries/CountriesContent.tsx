/**
 * Copyright 2023 Google LLC
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

import { CaretDownOutlined } from "@ant-design/icons";
import { Breadcrumb, Input, Layout } from "antd";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { useStoreActions, useStoreState } from "../../state";
import {
  ChartConfigCategory,
  ChartConfigTile,
  FulfillResponse,
} from "../../utils/types";
const SearchCard = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;

  h5 {
    font-size: 1rem;
    font-weight: 300;
    padding: 0;
    margin: 0;
  }

  margin: 0 0 1rem;
  padding: 1rem 24px;
  background: white;
  box-shadow: 0px 0px 6px rgba(3, 7, 18, 0.03),
    0px 1px 22px rgba(3, 7, 18, 0.06);
`;
const ChartContentHeader = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  margin-bottom: 2rem;
  width: 100%;
  img {
    width: 5rem;
    height: 5rem;
    margin-right: 2rem;
    border-radius: 1rem;
  }
  h3 {
    font-size: 1.5rem;
    font-weight: 300;
    margin-bottom: 0.25rem;
  }
`;
const ChartContentBody = styled.div`
  h3 {
    font-size: 2.5rem;
    font-weight: 300;
  }
`;
const ContentCard = styled.div`
  margin: 0 0 1rem;
  padding: 24px;
  background: white;
  border-radius: 1rem;
`;
const PlaceChips = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0 24px;
  margin: 0 0 1rem;
`;
const PlaceChip = styled.div`
  padding: 0.25rem 0.75rem;
  border-radius: 2rem;
  background: white;
  border: 1px solid #e9e9e9;
  cursor: pointer;
  display: flex;
  align-items: center;
  svg {
    margin-left: 0.25rem;
  }
  &.selected {
    background: #e1e1e1;
    border: 1px solid #dcdcdc;
  }
  &:hover {
    background: #e1e1e1;
    border: 1px solid #dcdcdc;
  }
`;
const StyledInput = styled(Input)`
  border-radius: 2rem;
  padding: 0.5rem 1rem;
`;

const PlaceTitle = styled.div`
  display: flex;
  font-size: 2rem;
  padding: 0rem 24px;
`;
interface ChartConfig {
  title: string;
  type: "BAR"; // TODO: Add support for additional charts
  variables: string[];
}

const CountriesContent: React.FC<{
  selectedVariableGroupDcid?: string;
}> = (props) => {
  const placeDcid = "Earth";
  const { selectedVariableGroupDcid } = props;
  const regions = useStoreState((s) =>
    s.regions.dcids.map((dcid) => s.regions.byDcid[dcid])
  );
  const fulfillmentsById = useStoreState((s) => s.fulfillments.byId);
  const fetchTopicFulfillment = useStoreActions((a) => a.fetchTopicFulfillment);
  const [isFetchingFulfillment, setIsFetchingFulfillment] = useState(false);
  const [fulfillmentResponse, setFulfillmentResponse] =
    useState<FulfillResponse>();

  /**
   *
   */
  useEffect(() => {
    if (!selectedVariableGroupDcid) {
      return;
    }
    (async () => {
      setIsFetchingFulfillment(true);
      const topicDcid = selectedVariableGroupDcid
        .replace("/g/", "/topic/")
        .toLocaleLowerCase();
      const fulfillment = await fetchTopicFulfillment({
        entityDcids: [placeDcid],
        variableDcids: [topicDcid],
        fulfillmentsById,
      });
      setIsFetchingFulfillment(false);
      setFulfillmentResponse(fulfillment);
    })();
  }, [placeDcid, selectedVariableGroupDcid]);

  const selectedPlaceName = "World";
  return (
    <Layout style={{ height: "100%", flexGrow: 1 }}>
      <Layout.Content style={{ padding: "0rem 0" }}>
        <SearchCard>
          <StyledInput
            placeholder='Search countries or regional topics. Examples: "Afghanistan", "Access to Clean Energy in Afghanistan", "Poverty in Sub-Saharan Africa"'
            allowClear
            size="large"
          />
        </SearchCard>

        <PlaceTitle>{selectedPlaceName}</PlaceTitle>
        <Breadcrumb style={{ margin: "16px 0", padding: "0 24px" }}>
          <Breadcrumb.Item>
            <Link to="/countries">All SDG Goals</Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <Link to="/countries">1: No Poverty</Link>
          </Breadcrumb.Item>
        </Breadcrumb>
        <PlaceChips>
          <PlaceChip>
            Select Country <CaretDownOutlined />
          </PlaceChip>
          <PlaceChip className="selected">World</PlaceChip>
          {regions.map((region) => (
            <PlaceChip key={region.dcid}>{region.name}</PlaceChip>
          ))}
        </PlaceChips>
        <Layout.Content style={{ padding: "0 24px 24px" }}>
          <ChartContent
            fulfillmentResponse={fulfillmentResponse}
            placeDcid={placeDcid}
            selectedVariableGroupDcid={selectedVariableGroupDcid}
          />
        </Layout.Content>
      </Layout.Content>
    </Layout>
  );
};

const ChartContent: React.FC<{
  fulfillmentResponse?: FulfillResponse;
  placeDcid: string;
  selectedVariableGroupDcid?: string;
}> = (props) => {
  const { fulfillmentResponse, placeDcid, selectedVariableGroupDcid } = props;
  const selectedVariableGroup = useStoreState((s) =>
    selectedVariableGroupDcid
      ? s.variableGroups.byDcid[selectedVariableGroupDcid]
      : null
  );

  if (!selectedVariableGroup || !fulfillmentResponse) {
    return (
      <ContentCard>
        <h5>Explore SDG progress</h5>
        <p>Select a goal on the left to get started.</p>
      </ContentCard>
    );
  }
  return (
    <>
      {fulfillmentResponse.config.categories.map((chartConfigCategory, i) => (
        <ChartCategoryContent
          key={i}
          placeDcid={placeDcid}
          chartConfigCategory={chartConfigCategory}
        />
      ))}
    </>
  );
};

const ChartCategoryContent: React.FC<{
  chartConfigCategory: ChartConfigCategory;
  placeDcid: string;
}> = ({ chartConfigCategory, placeDcid }) => {
  const rootTopics = useStoreState((s) => s.rootTopics);

  const matches = chartConfigCategory.dcid.match(/dc\/topic\/sdg_(\d\d?)/);

  const rootTopicIndex =
    matches && matches.length > 1 ? Number(matches[1]) - 1 : -1;

  const sdgTopic = rootTopicIndex !== -1 ? rootTopics[rootTopicIndex] : null;
  if (!sdgTopic) {
    return (
      <ContentCard>
        <ChartContentBody>
          Root topic not found for {chartConfigCategory.dcid}
        </ChartContentBody>
      </ContentCard>
    );
  }

  chartConfigCategory.dcid;
  const tiles: ChartConfigTile[] = [];
  chartConfigCategory.blocks.forEach((block) => {
    block.columns.forEach((column) => {
      column.tiles.forEach((tile) => {
        tiles.push(tile);
      });
    });
  });
  return (
    <ContentCard>
      <ChartContentHeader>
        <img src={sdgTopic.iconUrl} />
        <div>
          <h3>{sdgTopic.name}</h3>
          <div>{sdgTopic.description}</div>
        </div>
      </ChartContentHeader>
      <ChartContentBody></ChartContentBody>
      {tiles.map((tile, i) => (
        <ChartTile key={i} placeDcid={placeDcid} tile={tile} />
      ))}
    </ContentCard>
  );
};

const ChartTile: React.FC<{ placeDcid: string; tile: ChartConfigTile }> = ({
  placeDcid,
  tile,
}) => {
  if (tile.type === "BAR") {
    return (
      <div>
        {/** @ts-ignore */}
        <datacommons-bar
          title={tile.title}
          variables={tile.statVarKey.join(" ")}
          places={placeDcid}
          sort="descending"
        />
      </div>
    );
  } else if (tile.type === "HIGHLIGHT") {
    return (
      <div>
        {/** @ts-ignore */}
        <datacommons-highlight
          description={tile.title}
          variable={tile.statVarKey.join(" ")}
          place={placeDcid}
        />
      </div>
    );
  } else if (tile.type === "LINE") {
    return (
      <div>
        {/** @ts-ignore */}
        <datacommons-line
          title={tile.title}
          variables={tile.statVarKey.join(" ")}
          places={placeDcid}
        />
      </div>
    );
  } else if (tile.type === "MAP") {
    return (
      <div>
        {/** @ts-ignore */}
        <datacommons-map
          title={tile.title}
          variable={tile.statVarKey.join(" ")}
          parentPlace="Earth"
          childPlaceType="Country"
        />
      </div>
    );
  }
  return (
    <div>
      Unknown chart type {tile.type} for chart {'"'}
      {tile.title}
      {'"'}
    </div>
  );
};

export default CountriesContent;
