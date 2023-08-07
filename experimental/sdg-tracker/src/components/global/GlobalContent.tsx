import { Layout, theme } from "antd";
import React, { useMemo } from "react";
import styled from "styled-components";
import { useStoreState } from "../../state";

const StyledLayoutContent = styled(Layout.Content)`
  margin: 0;
  min-height: 280px;
  overflow: auto;
  padding: 24px;
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
        horizontal
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
        horizontal
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
      <StyledLayoutContent
        style={{
          background: colorBgContainer,
        }}
      >
        <h2>SDG Global Overview</h2>
        <p>Select a topic from the menu on the left to get started.</p>
      </StyledLayoutContent>
    );
  }
  return (
    <StyledLayoutContent
      style={{
        background: colorBgContainer,
      }}
    >
      <h2>{selectedVariableGroup.name}</h2>
      {chartConfigs &&
        chartConfigs.map((config, i) => (
          <DataCommonsChart config={config} key={i} />
        ))}
    </StyledLayoutContent>
  );
};

export default GlobalContent;
