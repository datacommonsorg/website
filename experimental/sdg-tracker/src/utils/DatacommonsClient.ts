import {
  ObservationPointWithinResponse,
  VariableGroupInfoResponse,
  VariableInfoResponse,
} from "./types";

interface DatacommonsClientParams {
  apiRoot?: string;
}

class DatacommonsClient {
  apiRoot: string;

  constructor(params: DatacommonsClientParams) {
    this.apiRoot = params.apiRoot || "https://datacommons.org";
  }

  async geojson(params: { placeDcid: string; placeType: string }) {
    const { placeDcid, placeType } = params;
    const urlSearchParams = new URLSearchParams({
      placeDcid,
      placeType,
    });
    const response = await fetch(`${this.apiRoot}/api/choropleth/geojson?${urlSearchParams}`);
    const geojson = await response.json();
    return geojson;
  }

  async observationPointWithin(params: {
    childType: string;
    date?: string;
    parentEntity: string;
    variables: string[];
  }): Promise<ObservationPointWithinResponse> {
    const { childType, date, parentEntity, variables } = params;
    const urlSearchParams = new URLSearchParams({
      childType,
      date: date || "",
      parentEntity,
    });
    variables.forEach((variable) => {
      urlSearchParams.append("variables", variable);
    });

    const response = await fetch(
      `${this.apiRoot}/api/observations/point/within?${urlSearchParams}`,
    );
    const geojson = await response.json();
    return geojson;
  }

  async variableGroupInfo(params: { dcid: string }): Promise<VariableGroupInfoResponse> {
    const response = await fetch(`${this.apiRoot}/api/variable-group/info`, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dcid: params.dcid,
      }),
    });
    return (await response.json()) as VariableGroupInfoResponse;
  }

  async variableInfo(params: { dcids: string[] }): Promise<VariableInfoResponse> {
    const { dcids } = params;
    const urlSearchParams = new URLSearchParams();
    dcids.forEach((dcid) => {
      urlSearchParams.append("dcids", dcid);
    });

    const response = await fetch(`${this.apiRoot}/api/variable/info?${urlSearchParams}`);
    return (await response.json()) as VariableInfoResponse;
  }
}

export default DatacommonsClient;
