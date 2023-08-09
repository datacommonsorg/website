import { Layout } from "antd";
import React, { useMemo } from "react";
import styled from "styled-components";
import { useStoreState } from "../../state";

const InnerContent = styled.div`
  margin: 0;
  padding: 24px;
  background: white;
  border-radius: 1rem;
`;

interface ChartConfig {
  title: string;
  type: "BAR"; // TODO: Add support for additional charts
  variables: string[];
}

const DataCommonsChart: React.FC<{
  config: ChartConfig;
}> = (props) => {
  const { config } = props;
  return (
    <div>
      {/**@ts-ignore */}
      <datacommons-bar
        childPlaceType="Country"
        sort="descending"
        maxPlaces={10}
        parentPlace="Earth"
        title={`${config.title} (DESCENDING)`}
        variables={config.variables.join(" ")}
        yAxisMargin={150}
      />
    </div>
  );
};

const GoalContent: React.FC<{
  selectedVariableGroupDcid?: string;
}> = (props) => {
  const { selectedVariableGroupDcid } = props;
  const variableGroupsByDcid = useStoreState((s) => s.variableGroups.byDcid);
  const selectedVariableGroup = useStoreState((s) =>
    selectedVariableGroupDcid
      ? s.variableGroups.byDcid[selectedVariableGroupDcid]
      : null
  );
  const chartConfigs = useMemo(() => {
    if (!selectedVariableGroupDcid) {
      return;
    }
    const chartConfigsTraverse = (variableGroupDcid: string): ChartConfig[] => {
      const vg = variableGroupsByDcid[variableGroupDcid];
      const configs: ChartConfig[] = [];
      if (vg.childVariableDcids.length > 0) {
        configs.push({
          title: vg.name,
          type: "BAR",
          variables: vg.childVariableDcids,
        });
      }
      vg.childGroupDcids.forEach((vgDcid) => {
        configs.push(...chartConfigsTraverse(vgDcid));
      });
      return configs;
    };

    return chartConfigsTraverse(selectedVariableGroupDcid);
  }, [selectedVariableGroupDcid]);

  if (!selectedVariableGroup) {
    return (
      <Layout.Content>
        <InnerContent>
          <h2>SDG Goals</h2>
          <p>
            Data Commons has indexed more than 3,000 statistical variables that
            are indicators for SDG progress. Select a goal on the left to view
            the data holdings.
          </p>
        </InnerContent>
      </Layout.Content>
    );
  }
  return (
    <Layout.Content>
      <InnerContent>
        <h2>{selectedVariableGroup.name}</h2>
        {chartConfigs &&
          chartConfigs.map((config, i) => (
            <DataCommonsChart config={config} key={i} />
          ))}
      </InnerContent>
    </Layout.Content>
  );
};

export default GoalContent;
