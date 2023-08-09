import { CaretDownOutlined } from "@ant-design/icons";
import { Breadcrumb, Input, Layout, theme } from "antd";
import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { VariableGroup, useStoreState } from "../../state";
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

const ExploreContent: React.FC<{
  selectedVariableGroupDcid?: string;
}> = (props) => {
  const placeDcid = "Earth";
  const placeName = "World";

  const regions = useStoreState((s) =>
    s.regions.dcids.map((dcid) => s.regions.byDcid[dcid])
  );

  const { selectedVariableGroupDcid } = props;
  const selectedVariableGroup = useStoreState((s) =>
    selectedVariableGroupDcid
      ? s.variableGroups.byDcid[selectedVariableGroupDcid]
      : null
  );
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  useEffect(() => {
    const test = {
      dc: "",
      entities: ["geoId/06"],
      variables: ["dc/topic/Race"],
      childEntityType: "",
      comparisonEntities: [],
      comparisonVariables: [],
    };
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
            <Link to="/explore">All SDG Goals</Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <Link to="/explore">1: No Poverty</Link>
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
          <ChartContent selectedVariableGroup={selectedVariableGroup} />
        </Layout.Content>
      </Layout.Content>
    </Layout>
  );
};

const ChartContent: React.FC<{
  selectedVariableGroup: VariableGroup | null;
}> = (props) => {
  const { selectedVariableGroup } = props;
  const rootTopics = useStoreState((s) => s.rootTopics);
  if (!selectedVariableGroup) {
    return (
      <ContentCard>
        <h5>Explore SDG progress</h5>
        <p>Select a goal on the left to get started.</p>
      </ContentCard>
    );
  }
  const matches = selectedVariableGroup.dcid.match(/(dc\/g\/SDG_\d\d?)/);
  if (!matches || matches.length < 2) {
    return (
      <ContentCard>
        <ChartContentBody>
          Parent SDG not found for {selectedVariableGroup.dcid}
        </ChartContentBody>
      </ContentCard>
    );
  }
  const rootTopicDcid = matches[1];
  const sdgTopicIndex = rootTopics
    .map((t) => t.groupDcid)
    .indexOf(rootTopicDcid);
  const sdgTopic = rootTopics[sdgTopicIndex];

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
      <h5>{selectedVariableGroup.name}</h5>
    </ContentCard>
  );
};

export default ExploreContent;
