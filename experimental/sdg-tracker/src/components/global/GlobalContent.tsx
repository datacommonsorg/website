import { Layout, theme } from "antd";
import React, { useMemo } from "react";
import styled from "styled-components";
import { useStoreState } from "../../state";

const InnerContent = styled.div`
  margin: 0;
  min-height: 280px;
  padding: 24px;
  background: white;
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

      {/**@ts-ignore */}
      <datacommons-bar
        childPlaceType="Country"
        sort="ascending"
        maxPlaces={10}
        parentPlace="Earth"
        title={`${config.title} (ASCENDING)`}
        variables={config.variables.join(" ")}
        yAxisMargin={150}
      />
    </div>
  );
};

const GlobalContent: React.FC<{
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

  const {
    token: { colorBgContainer },
  } = theme.useToken();

  if (!selectedVariableGroup) {
    return (
      <Layout.Content
        style={{
          background: colorBgContainer,
        }}
      >
        <InnerContent>
          <h2>SDG Global Overview</h2>
          <p>Select a topic from the menu on the left to get started.</p>
        </InnerContent>
      </Layout.Content>
    );
  }
  return (
    <Layout.Content
      style={{
        background: colorBgContainer,
      }}
    >
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

export default GlobalContent;
