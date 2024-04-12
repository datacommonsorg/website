/**
 * Copyright 2024 Google LLC
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
import { GoogleMapsOverlay } from "@deck.gl/google-maps/typed";

import {
  AmbientLight,
  LightingEffect,
  _SunLight as SunLight,
} from "@deck.gl/core/typed";
import { GeoJsonLayer, PolygonLayer } from "@deck.gl/layers/typed";
import { Wrapper } from "@googlemaps/react-wrapper";
import { scaleThreshold } from "d3-scale";
import { GeoJsonProperties } from "geojson";
import React, { useEffect, useMemo, useRef, useState } from "react";
import SyntaxHighlighter from "react-syntax-highlighter";
import { docco } from "react-syntax-highlighter/dist/esm/styles/hljs";
import vegaEmbed from "vega-embed";
import { Config, TopLevelSpec, compile } from "vega-lite";

import { DataCommonsClient } from "../data_commons_client";

import "./style.css";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const GOOGLE_MAPS_MAP_ID = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID;
const client = new DataCommonsClient({
  apiRoot: "https://datacommons.org",
});

const App = () => {
  return (
    <div className="app">
      <h1>Data Commons JS Client Demo</h1>
      <ExampleSetup />
      <ExampleCsv />
      <ExampleCsvPerCapita />
      <ExampleCsvSeries />
      <ExampleJson />
      <ExampleGeoJson />
      <ExampleGoogleMaps />
      <ExampleGoogleMaps3D />
    </div>
  );
};

const Code = (props: { children: string | string[]; language?: string }) => {
  const { children, language } = props;
  return (
    <SyntaxHighlighter
      language={language || "javascript"}
      style={{
        ...docco,
        hljs: { ...docco.hljs, maxHeight: 400, overflow: "auto" },
      }}
    >
      {children}
    </SyntaxHighlighter>
  );
};

const ExampleSetup = () => {
  return (
    <div>
      <h2>Install @datacommonsorg/client</h2>
      <Code>{`npm install @datacommonsorg/client`}</Code>
      <h2>Import @datacommonsorg/client</h2>
      <Code>{`import {DataCommonsWebClient} from "../DataCommonsClient";`}</Code>
    </div>
  );
};

const ExampleCsv = () => {
  const code = `const response = await client.getCsv({
  variables: ["Count_Person_BelowPovertyLevelInThePast12Months"],
  parentEntity: "country/USA",
  childType: "State"
});
`;
  const [response, setResponse] = useState("");
  useEffect(() => {
    (async () => {
      const response = await client.getCsv({
        childType: "State",
        parentEntity: "country/USA",
        variables: ["Count_Person_BelowPovertyLevelInThePast12Months"],
      });
      setResponse(response);
    })();
  });
  return (
    <div>
      <h2>Fetch CSV Data</h2>
      <Code>{code}</Code>
      <h3>Fetch CSV Data Result</h3>
      <Code>{response}</Code>
    </div>
  );
};

const ExampleCsvPerCapita = () => {
  const code = `const response = await client.getCsv({
  variables: ["Count_Person_BelowPovertyLevelInThePast12Months"],
  parentEntity: "country/USA",
  childType: "State",
  perCapitaVariables: ["Count_Person_BelowPovertyLevelInThePast12Months"]
});`;
  const [response, setResponse] = useState("");
  useEffect(() => {
    (async () => {
      const response = await client.getCsv({
        variables: ["Count_Person_BelowPovertyLevelInThePast12Months"],
        parentEntity: "country/USA",
        childType: "State",
        perCapitaVariables: ["Count_Person_BelowPovertyLevelInThePast12Months"],
      });
      setResponse(response);
    })();
  });
  return (
    <div>
      <h2>Fetch CSV Data (per-capita)</h2>
      <Code>{code}</Code>
      <h3>Fetch CSV Data Result</h3>
      <Code>{response}</Code>
    </div>
  );
};

const ExampleCsvSeries = () => {
  const code = `const response = await client.getCsvSeries({
    entities: [
      "geoId/0644000",
      "geoId/0667000",
      "geoId/0664000",
      "geoId/0666000",
      "geoId/0627000",
      "geoId/0668000",
      "geoId/0653000",
    ],
    perCapitaVariables: ["Count_CriminalActivities_CombinedCrime"],
    variables: ["Count_CriminalActivities_CombinedCrime"],
    // Vega lite doesn't allow dots in CSV header items, so use a different
    // delimiter instead
    fieldDelimiter: "__",
  });
  setResponse(response);
  const vegaLiteSpec: TopLevelSpec = {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    data: {
      format: {
        type: "csv",
      },
      values: response,
    },
    encoding: {
      x: {
        field: "variable__observation__date",
        timeUnit: "year",
        title: "Date",
        type: "temporal",
      },
    },
    layer: [
      {
        encoding: {
          color: {
            field: "entity__properties__name",
            type: "nominal",
            title: "City",
          },
          y: {
            field: "variable__perCapita__perCapitaValue",
            title: "Criminal Activity Per Capita",
            type: "quantitative",
          },
        },
        layer: [
          { mark: "line" },
          {
            mark: "point",
            transform: [{ filter: { empty: false, param: "hover" } }],
          },
        ],
      },
      {
        transform: [
          {
            groupby: ["variable__observation__date"],
            pivot: "entity__properties__name",
            value: "variable__perCapita__perCapitaValue",
          },
        ],
        mark: "rule",
        encoding: {
          opacity: {
            condition: { empty: false, param: "hover", value: 0.3 },
            value: 0,
          },
          tooltip: [
            {
              field: "variable__observation__date",
              type: "temporal",
              timeUnit: "year",
              title: "Date",
            },
            { field: "Fresno", type: "quantitative", format: ".3f" },
            { field: "Los Angeles", type: "quantitative", format: ".3f" },
            { field: "Oakland", type: "quantitative", format: ".3f" },
            { field: "Sacramento", type: "quantitative", format: ".3f" },
            { field: "San Diego", type: "quantitative", format: ".3f" },
            { field: "San Francisco", type: "quantitative", format: ".3f" },
            { field: "San Jose", type: "quantitative", format: ".3f" },
          ],
        },
        params: [
          {
            name: "hover",
            select: {
              type: "point",
              fields: ["variable__observation__date"],
              nearest: true,
              on: "pointerover",
              clear: "pointerout",
            },
          },
        ],
      },
    ],
    title: "Criminal Activity Per Capita in California Cities",
    width: "container",
  };
  const config: Config = {};
  const vegaSpec = compile(vegaLiteSpec, { config }).spec;
  vegaEmbed("#mychart", vegaSpec);`;

  const [response, setResponse] = useState("");
  useEffect(() => {
    (async () => {
      const response = await client.getCsvSeries({
        entities: [
          "geoId/0644000",
          "geoId/0667000",
          "geoId/0664000",
          "geoId/0666000",
          "geoId/0627000",
          "geoId/0668000",
          "geoId/0653000",
        ],
        // Vega lite doesn't allow dots in CSV header items, so use a different
        // delimiter instead
        fieldDelimiter: "__",
        perCapitaVariables: ["Count_CriminalActivities_CombinedCrime"],
        variables: ["Count_CriminalActivities_CombinedCrime"],
      });
      setResponse(response);
      const vegaLiteSpec: TopLevelSpec = {
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        data: {
          format: {
            type: "csv",
          },
          values: response,
        },
        encoding: {
          x: {
            field: "variable__observation__date",
            timeUnit: "year",
            title: "Date",
            type: "temporal",
          },
        },
        layer: [
          {
            encoding: {
              color: {
                field: "entity__properties__name",
                title: "City",
                type: "nominal",
              },
              y: {
                field: "variable__perCapita__perCapitaValue",
                title: "Criminal Activity Per Capita",
                type: "quantitative",
              },
            },
            layer: [
              { mark: "line" },
              {
                mark: "point",
                transform: [{ filter: { empty: false, param: "hover" } }],
              },
            ],
          },
          {
            transform: [
              {
                groupby: ["variable__observation__date"],
                pivot: "entity__properties__name",
                value: "variable__perCapita__perCapitaValue",
              },
            ],
            mark: "rule",
            encoding: {
              opacity: {
                condition: { empty: false, param: "hover", value: 0.3 },
                value: 0,
              },
              tooltip: [
                {
                  field: "variable__observation__date",
                  type: "temporal",
                  timeUnit: "year",
                  title: "Date",
                },
                { field: "Fresno", type: "quantitative", format: ".3f" },
                { field: "Los Angeles", type: "quantitative", format: ".3f" },
                { field: "Oakland", type: "quantitative", format: ".3f" },
                { field: "Sacramento", type: "quantitative", format: ".3f" },
                { field: "San Diego", type: "quantitative", format: ".3f" },
                { field: "San Francisco", type: "quantitative", format: ".3f" },
                { field: "San Jose", type: "quantitative", format: ".3f" },
              ],
            },
            params: [
              {
                name: "hover",
                select: {
                  clear: "pointerout",
                  fields: ["variable__observation__date"],
                  nearest: true,
                  on: "pointerover",
                  type: "point",
                },
              },
            ],
          },
        ],
        title: "Criminal Activity Per Capita in California Cities",
        width: "container",
      };
      const config: Config = {};
      const vegaSpec = compile(vegaLiteSpec, { config }).spec;
      vegaEmbed("#mychart", vegaSpec);
    })();
  });
  return (
    <div>
      <h2>Fetch CSV Data (series, per-capita)</h2>
      <Code>{code}</Code>
      <h3>Fetch CSV (series, per-capita) Data Result</h3>
      <Code>{response}</Code>
      <h3>Render CSV series on vega-lite line chart</h3>
      <div style={{ width: "100%" }} id="mychart"></div>
    </div>
  );
};

const ExampleJson = () => {
  const code = `const response = await client.getDataRows({
  variables: ["Count_Person_BelowPovertyLevelInThePast12Months"],
  parentEntity: "country/USA",
  childType: "State"
});
`;
  const [response, setResponse] = useState("");
  useEffect(() => {
    (async () => {
      const response = await client.getDataRows({
        variables: ["Count_Person_BelowPovertyLevelInThePast12Months"],
        parentEntity: "country/USA",
        childType: "State",
      });
      setResponse(JSON.stringify(response, null, 2));
    })();
  });
  return (
    <div>
      <h2>Fetch Data Rows</h2>
      <Code>{code}</Code>
      <Code>{response}</Code>
    </div>
  );
};

const ExampleGeoJson = () => {
  const code = `const response = await client.getGeoJSON({
  variables: ["Count_Person"],
  parentEntity: "country/USA",
  childType: "State"
});
`;
  const [response, setResponse] = useState("");
  useEffect(() => {
    (async () => {
      const response = await client.getGeoJSON({
        variables: ["Count_Person"],
        parentEntity: "country/USA",
        childType: "State",
      });
      setResponse(JSON.stringify(response, null, 2));
    })();
  });
  return (
    <div>
      <h2>Fetch GeoJSON</h2>
      <Code>{code}</Code>
      <pre style={{ maxHeight: 400, overflow: "auto" }}>{response}</pre>
    </div>
  );
};

function MapComponent({
  center,
  zoom,
}: {
  center: google.maps.LatLngLiteral;
  zoom: number;
}): React.ReactNode {
  const ref = useRef<HTMLDivElement>(null);
  const [selectedFeature, setSelectedFeature] =
    useState<google.maps.Data.Feature>();
  const [selectedFeatureLocation, setSelectedFeatureLocation] =
    useState<google.maps.LatLng>();

  const [map, setMap] = useState<google.maps.Map>();
  useEffect(() => {
    if (!ref.current) {
      return;
    }
    const map = new window.google.maps.Map(ref.current, {
      center,
      disableDefaultUI: true,
      heading: 0,
      mapId: GOOGLE_MAPS_MAP_ID,
      tilt: 0,
      zoom,
    });

    map.data.addListener(
      "click",
      function (event: google.maps.Data.MouseEvent): void {
        const feature = event.feature;
        setSelectedFeature(feature);
        setSelectedFeatureLocation(event.latLng || undefined);
      }
    );

    map.data.setStyle({
      strokeWeight: 0.5,
    });

    setMap(map);
    (async () => {
      const response = await client.getGeoJSON({
        variables: ["Count_Person_BelowPovertyLevelInThePast12Months"],
        parentEntity: "country/USA",
        childType: "State",
        perCapitaVariables: ["Count_Person_BelowPovertyLevelInThePast12Months"],
      });
      map.data.addGeoJson(response);
    })();
  }, []);

  useEffect(() => {}, [map]);

  return (
    <>
      <div ref={ref} className="map" />
      <MapPopup
        map={map}
        location={selectedFeatureLocation}
        onClose={() => {
          setSelectedFeature(undefined);
        }}
        feature={selectedFeature}
      />
    </>
  );
}

const MapPopup = (props: {
  feature?: google.maps.Data.Feature;
  location?: google.maps.LatLng;
  map?: google.maps.Map;
  onClose: () => void;
}) => {
  const mapPopupRef = useRef<HTMLDivElement>(null);
  const { feature, location, map, onClose } = props;

  const infowindow = useMemo(() => new google.maps.InfoWindow(), []);

  const featureProperties: GeoJsonProperties = useMemo(() => {
    const properties: GeoJsonProperties = {};
    if (!feature) {
      return properties;
    }

    feature.forEachProperty((value, key) => {
      if (typeof key !== "string") {
        return;
      }
      properties[key] = value;
    });
    return properties;
  }, [feature]);

  useEffect(() => {
    infowindow.addListener("closeclick", () => {
      onClose();
    });
  }, [infowindow]);
  useEffect(() => {
    if (!feature || !location || !map) {
      return;
    }

    infowindow.setContent(mapPopupRef.current?.innerHTML);
    infowindow.setPosition(location);
    infowindow.setOptions({ pixelOffset: new google.maps.Size(0, 0) });
    infowindow.open(map);
  }, [feature, location]);

  return (
    <div style={{ display: "none" }}>
      <div ref={mapPopupRef}>
        {Object.keys(featureProperties).map((key) => (
          <div key={key}>
            <strong>{key}</strong>: {featureProperties[key]}
          </div>
        ))}
      </div>
    </div>
  );
};

const ExampleGoogleMaps = () => {
  const code = `const map = new window.google.maps.Map(ref.current, {
  tilt: 0,
  heading: 0,
  center,
  zoom,
  mapId: GOOGLE_MAPS_MAP_ID,
  disableDefaultUI: true,
});

map.data.setStyle({
  strokeWeight: 0.5,
});

setMap(map);
(async () => {
  const response = await client.getGeoJSON({
    variables: ["Count_Person_BelowPovertyLevelInThePast12Months"],
    parentEntity: "country/USA",
    childType: "State",
    perCapitaVariables: ["Count_Person_BelowPovertyLevelInThePast12Months"],
  });
  map.data.addGeoJson(response);
})();`;
  return (
    <div>
      <h2>Data Commons on Google Maps</h2>
      <Code>{code}</Code>
      <div className="map-container">
        <Wrapper apiKey={GOOGLE_MAPS_API_KEY}>
          <MapComponent center={{ lat: 39.82, lng: -98.58 }} zoom={3} />
        </Wrapper>
      </div>
    </div>
  );
};

const COLOR_SCALE = scaleThreshold()
  .domain([0, 50000, 100000, 500000, 1000000, 10000000, 100000000])
  // @ts-ignore
  .range([
    [65, 182, 196],
    [127, 205, 187],
    [199, 233, 180],
    [237, 248, 177],
    // zero
    [255, 255, 204],
    [255, 237, 160],
    [254, 217, 118],
    [254, 178, 76],
    [253, 141, 60],
    [252, 78, 42],
    [227, 26, 28],
    [189, 0, 38],
    [128, 0, 38],
  ]);

const INITIAL_VIEW_STATE = {
  bearing: 0,
  latitude: 49.254,
  longitude: -123.13,
  maxZoom: 16,
  pitch: 45,
  zoom: 11,
};

const ambientLight = new AmbientLight({
  color: [255, 255, 255],
  intensity: 1.0,
});

const dirLight = new SunLight({
  color: [255, 255, 255],
  intensity: 1.0,
  timestamp: Date.UTC(2019, 7, 1, 22),
  _shadow: true,
});

const landCover = [
  [
    [-123.0, 49.196],
    [-123.0, 49.324],
    [-123.306, 49.324],
    [-123.306, 49.196],
  ],
];

// @ts-ignore
function getTooltipNyc({ object }): string {
  return (
    object && {
      html: `
      <div><b>Census Tract:</b>: ${object.properties["entity.properties.name"]}</div>
      <div><b>Population</b>: ${object.properties["variables.Count_Person_BelowPovertyLevelInThePast12Months.perCapita.observation.value"]}</div>
      <div><b>Number of people below the poverty line in the last 12 months</b>: ${object.properties["variables.Count_Person_BelowPovertyLevelInThePast12Months.observation.value"]}</div>
      <div><b>People below the poverty line per capita</b>: ${object.properties["variables.Count_Person_BelowPovertyLevelInThePast12Months.perCapita.perCapitaValue"]}</div>
  `,
    }
  );
}

const ExampleGoogleMaps3D = () => {
  const code = `const map = new window.google.maps.Map(mapEl, {
  tilt: 0,
  heading: 0,
  center,
  zoom,
  mapId: GOOGLE_MAPS_MAP_ID,
  disableDefaultUI: true,
});

map.data.setStyle({
  strokeWeight: 0.5,
});
const lightingEffect = new LightingEffect({ ambientLight, dirLight });
lightingEffect.shadowColor = [0, 0, 0, 0.5];
setMap(map);
(async () => {
  const response = await client.getGeoJSON({
    variables: ["Count_Person_BelowPovertyLevelInThePast12Months"],
    parentEntity: "geoId/36061",
    childType: "CensusTract",
    geoJsonProperty: "geoJsonCoordinates",
    perCapitaVariables: ["Count_Person_BelowPovertyLevelInThePast12Months"],
  });
  const deckOverlay = new GoogleMapsOverlay({
    initialViewState: INITIAL_VIEW_STATE,
    controller: true,
    getTooltip: getTooltipNyc,
    effects: [lightingEffect],
    layers: [
      new PolygonLayer({
        id: "ground",
        data: landCover,
        stroked: false,
        getPolygon: (f) => f,
        getFillColor: [0, 0, 0, 0],
      }),
      new GeoJsonLayer({
        id: "geojson",
        data: response,
        opacity: 0.8,
        stroked: false,
        filled: true,
        extruded: true,
        wireframe: true,
        getElevation: (f) =>
          (f.properties || {})[
            "Count_Person_BelowPovertyLevelInThePast12Months.perCapita.value"
          ] * 10000,
        getFillColor: (f) =>
          COLOR_SCALE(
            (f.properties || {})[
              "Count_Person_BelowPovertyLevelInThePast12Months.perCapita.value"
            ]
          ),
        getLineColor: [255, 255, 255],
        pickable: true,
      }),
    ],
  });

  deckOverlay.setMap(map);
  `;
  return (
    <div>
      <h2>Google Maps + deck.gl example</h2>
      <Code>{code}</Code>
      <div className="map-container">
        <Wrapper apiKey={GOOGLE_MAPS_API_KEY}>
          <MapComponent3dNyc center={{ lat: 40.7128, lng: -74.006 }} zoom={9} />
        </Wrapper>
      </div>
    </div>
  );
};

function MapComponent3dNyc({
  center,
  zoom,
}: {
  center: google.maps.LatLngLiteral;
  zoom: number;
}): React.ReactNode {
  const ref = useRef<HTMLDivElement>(null);
  const [selectedFeature, setSelectedFeature] =
    useState<google.maps.Data.Feature>();
  const [selectedFeatureLocation, setSelectedFeatureLocation] =
    useState<google.maps.LatLng>();

  const [map, setMap] = useState<google.maps.Map>();
  useEffect(() => {
    if (!ref.current) {
      return;
    }
    const mapEl = ref.current;

    const map = new window.google.maps.Map(mapEl, {
      tilt: 0,
      heading: 0,
      center,
      zoom,
      mapId: GOOGLE_MAPS_MAP_ID,
      disableDefaultUI: true,
    });

    map.data.addListener(
      "click",
      function (event: google.maps.Data.MouseEvent) {
        var feature = event.feature;
        setSelectedFeature(feature);
        setSelectedFeatureLocation(event.latLng || undefined);
      }
    );

    map.data.setStyle({
      strokeWeight: 0.5,
    });
    const lightingEffect = new LightingEffect({ ambientLight, dirLight });
    lightingEffect.shadowColor = [0, 0, 0, 0.5];
    setMap(map);
    (async () => {
      const response = await client.getGeoJSON({
        childType: "CensusTract",
        geoJsonProperty: "geoJsonCoordinates",
        parentEntity: "geoId/36061",
        perCapitaVariables: ["Count_Person_BelowPovertyLevelInThePast12Months"],
        variables: ["Count_Person_BelowPovertyLevelInThePast12Months"],
      });
      const deckOverlay = new GoogleMapsOverlay({
        controller: true,
        effects: [lightingEffect],
        //@ts-ignore
        getTooltip: getTooltipNyc,
        layers: [
          new PolygonLayer({
            data: landCover,
            getFillColor: [0, 0, 0, 0],
            getPolygon: (f) => f,
            id: "ground",
            stroked: false,
          }),
          new GeoJsonLayer({
            data: response,
            extruded: true,
            filled: true,
            getElevation: (f) =>
              (f.properties || {})[
                "variables.Count_Person_BelowPovertyLevelInThePast12Months.perCapita.perCapitaValue"
              ] * 10000,
            // @ts-ignore
            getFillColor: (f) =>
              COLOR_SCALE(
                (f.properties || {})[
                  "variables.Count_Person_BelowPovertyLevelInThePast12Months.perCapita.perCapitaValue"
                ]
              ),
            getLineColor: [255, 255, 255],
            id: "geojson",
            opacity: 0.8,
            pickable: true,
            stroked: false,
            wireframe: true,
          }),
        ],
        initialViewState: INITIAL_VIEW_STATE,
      });

      deckOverlay.setMap(map);
    })();
  }, []);

  useEffect(() => {}, [map]);

  return (
    <>
      <div ref={ref} className="map" />
      <MapPopup
        map={map}
        location={selectedFeatureLocation}
        onClose={() => {
          setSelectedFeature(undefined);
        }}
        feature={selectedFeature}
      />
    </>
  );
}

export { App };
