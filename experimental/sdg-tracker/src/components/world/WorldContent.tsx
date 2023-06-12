import * as d3 from "d3";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import Select from "react-select";
import { Col, Container, Row } from "reactstrap";
import styled from "styled-components";
import { DatacommonsClientContext } from "utils/context";
import datacommons from "utils/datacommons";

const WorldMapContainer = styled.div`
  margin-top: 2rem;

  h2 {
    font-weight: 200;
    text-align: center;
  }
  svg {
    path.region-highlighted {
      cursor: pointer;
      filter: brightness(90%);
    }
  }
`;

const MapOptionsContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  h5 {
    font-weight: 300;
    margin: 1.5rem 0 2rem;
  }
  .select {
    min-width: 350px;
    margin-bottom: 1.5rem;
  }
`;

const Option = styled.div`
  display: flex;
  flex-direction: column;
`;

type SelectOption = {
  label: string;
  value: string;
  minValue: number;
  maxValue: number;
};

const WorldMap = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const datacommonsClient = useContext(DatacommonsClientContext);
  const [dataValues, setDataValues] = useState<{ [dcid: string]: number }>({});
  const [selectedOption, setSelectedOption] = useState<SelectOption | null>(null);

  const renderMap = useCallback(async () => {
    if (!mapRef.current) {
      return;
    }
    const worldGeojson = await datacommonsClient.geojson({
      placeDcid: "Earth",
      placeType: "Country",
    });
    datacommons.drawD3Map(
      mapRef.current,
      worldGeojson,
      500,
      960,
      dataValues,
      selectedOption
        ? d3
            .scaleLinear()
            .domain([selectedOption.minValue, selectedOption.maxValue])
            .range(
              [
                "#f94144",
                "#f3722c",
                "#f8961e",
                "#f9844a",
                "#f9c74f",
                "#90be6d",
                "#43aa8b",
                "#4d908e",
                "#577590",
                "#277da1",
              ].reverse() as any[],
            )
        : d3.scaleLinear(),
      () => {},
      () => {
        return "";
      },
      () => true,
      true,
      d3.geoEqualEarth().rotate([-10, 0]),
      undefined,
      undefined,
      {
        graticule: {
          fill: "none",
          stroke: "#eaeaea",
          strokeOpacity: 0.2,
        },
        region: {
          fill: "#f0f2f6",
          stroke: "#a8b4c8",
          strokeWidth: 0.75,
        },
        sphere: {
          fill: "#293241",
          strokeWidth: 2,
          stroke: "#eaeaea",
        },
      },
    );
  }, [mapRef, datacommonsClient, dataValues, selectedOption]);

  useEffect(() => {
    renderMap();
  }, [renderMap]);
  return (
    <WorldMapContainer>
      <h2>Global Development Indicators</h2>
      <div ref={mapRef}></div>
      <MapOptions
        onChange={(values: { [dcid: string]: number }, option: SelectOption) => {
          setDataValues(values);
          setSelectedOption(option);
        }}
      />
    </WorldMapContainer>
  );
};
const WorldMapSidebar = () => {
  return <div></div>;
};

const formatOption = (props: SelectOption) => (
  <Option>
    <div>{props.label}</div>
    <div className="option-subheader" style={{ marginLeft: "10px", color: "#ccc" }}>
      {props.value}
    </div>
  </Option>
);

const MapOptions = (props: {
  onChange: (options: { [dcid: string]: number }, option: SelectOption) => void;
}) => {
  const { onChange } = props;
  const [options, setOptions] = useState<SelectOption[]>([]);
  const datacommonsClient = useContext(DatacommonsClientContext);

  const fetchOptions = useCallback(async () => {
    const result = await datacommonsClient.variableGroupInfo({ dcid: "dc/g/SDG_15.1.1" });
    if (!result.childStatVars) {
      return;
    }

    // Fetch stat var info
    const statVarDcids = result.childStatVars.map((statVar) => statVar.id);
    const infoResult = await datacommonsClient.variableInfo({ dcids: statVarDcids });

    setOptions(
      result.childStatVars.map((statVar) => {
        const summary = infoResult[statVar.id].placeTypeSummary["Country"];
        return {
          label: statVar.displayName,
          value: statVar.id,
          minValue: summary.minValue,
          maxValue: summary.maxValue,
        };
      }),
    );
  }, [datacommonsClient]);
  const selectOnChange = useCallback(async (option: SelectOption | null) => {
    if (!option) {
      return;
    }
    const observationsResponse = await datacommonsClient.observationPointWithin({
      parentEntity: "Earth",
      childType: "Country",
      variables: [option.value],
    });
    const dataValues: { [key: string]: number } = {};
    Object.keys(observationsResponse.data[option.value]).forEach((placeDcid) => {
      dataValues[placeDcid] = observationsResponse.data[option.value][placeDcid].value;
    });
    onChange(dataValues, option);
  }, []);
  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);
  return (
    <MapOptionsContainer>
      <h5>Explore sustainable development goal progress</h5>
      <Select
        className="select"
        options={options}
        placeholder="Select statistical variable..."
        onChange={selectOnChange}
        formatOptionLabel={formatOption}
      />
    </MapOptionsContainer>
  );
};

const WorldContent = () => {
  return (
    <Container>
      <Row>
        <Col xxl={12}>
          <WorldMap />
        </Col>
        <Col xxl={4}>
          <WorldMapSidebar />
        </Col>
      </Row>
    </Container>
  );
};
export default WorldContent;
