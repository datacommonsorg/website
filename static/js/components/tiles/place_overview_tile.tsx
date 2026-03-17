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

/**
 * Component for rendering a place overview tile.
 */

import { PlaceOverviewTableApiResponse } from "@datacommonsorg/client/dist/data_commons_web_client_types";
import React, { useEffect, useState } from "react";

import { PlaceOverview } from "../../place/place_overview";
import { WEBSITE_SURFACE } from "../../shared/constants";
import { NamedTypedPlace } from "../../shared/types";
import { getDataCommonsClient } from "../../utils/data_commons_client";
import { Loading } from "../elements/loading";

interface PlaceOverviewTilePropType {
  place: NamedTypedPlace;
}

const NO_PLACE_EXPLORER_TYPES = new Set([
  "UNGeoRegion",
  "Continent",
  "GeoRegion",
  "ContinentalUnion",
]);

export function PlaceOverviewTile(
  props: PlaceOverviewTilePropType
): JSX.Element {
  const [tableData, setTableData] = useState<PlaceOverviewTableApiResponse>();
  const [parentPlaces, setParentPlaces] = useState<NamedTypedPlace[]>([]);
  const [loading, setLoading] = useState(true);

  const skipLink =
    props.place.types?.filter((type) => NO_PLACE_EXPLORER_TYPES.has(type))
      .length > 0;

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      const dataCommonsClient = getDataCommonsClient(null, WEBSITE_SURFACE);
      try {
        const [relatedPlacesApiResponse, placeOverviewTableApiResponse] =
          await Promise.all([
            dataCommonsClient.webClient.getRelatedPLaces({
              placeDcid: props.place.dcid,
            }),
            dataCommonsClient.webClient.getPlaceOverviewTable({
              placeDcid: props.place.dcid,
            }),
          ]);

        setTableData(placeOverviewTableApiResponse);
        setParentPlaces(relatedPlacesApiResponse.parentPlaces || []);
      } catch (error) {
        console.error("Error fetching place overview tile data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [props.place.dcid]);

  if (loading) {
    return <Loading />;
  }

  return (
    <>
      <div className="chart-container place-overview-tile">
        {tableData && (
          <PlaceOverview
            place={props.place}
            parentPlaces={parentPlaces}
            placeOverviewTableApiResponse={tableData}
          />
        )}
        {!skipLink && (
          <div className="row">
            <a href={`/place/${props.place.dcid}`}>
              See {props.place.name} in Place Explorer
            </a>
          </div>
        )}
      </div>
    </>
  );
}
