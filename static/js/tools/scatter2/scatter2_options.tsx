import React, { useContext, useEffect, useState } from "react";
import _ from "lodash";
import { ScatterContext } from "./scatter2_app";
import places from "../../../data/placeObject.json";
import { getPlacesIn } from "./scatter2_util";

function Options(): JSX.Element {
  const context = useContext(ScatterContext);
  // E.g., "Twin Falls County geoId/16083"
  const [enclosingPlaces, setEnclosingPlaces] = useState(
    {} as { [key: string]: string }
  );

  function checkPerCapita(event: React.ChangeEvent<HTMLInputElement>) {
    context.perCapita.set(event.target.checked);
  }

  function checkSwap() {
    const [x, y] = [context.x.value, context.y.value];
    context.x.set(y);
    context.y.set(x);
  }

  function checkLogX(event: React.ChangeEvent<HTMLInputElement>) {
    context.x.set({ ...context.x.value, log: event.target.checked });
  }

  function checkLogY(event: React.ChangeEvent<HTMLInputElement>) {
    context.y.set({ ...context.y.value, log: event.target.checked });
  }

  function selectCountry(event: React.ChangeEvent<HTMLSelectElement>) {
    context.place.set({
      ...context.place.value,
      country: event.target.selectedOptions[0].value,
    });
  }

  // TODO: Also clear x and y.

  function selectEnclosedPlaceType(
    event: React.ChangeEvent<HTMLSelectElement>
  ) {
    const type = event.target.selectedOptions[0].value;
    context.place.set({
      ...context.place.value,
      enclosedPlaceType: type,
      enclosedPlaces: [],
      enclosingPlace: { dcid: "", name: "" },
    });
  }

  function selectEnclosingPlace(event: React.ChangeEvent<HTMLSelectElement>) {
    const place = event.target.selectedOptions[0].value;
    context.place.set({
      ...context.place.value,
      enclosedPlaces: [],
      enclosingPlace: place
        ? { dcid: place, name: enclosingPlaces[place] }
        : { dcid: "", name: "" },
    });
  }

  function splitPlace(place: string) {
    const lastSpace = place.lastIndexOf(" ");
    return {
      name: place.substring(0, lastSpace),
      dcid: place.substring(lastSpace + 1),
    };
  }

  const enclosedTypeToEnclosingType = {
    CensusCoreBasedStatisticalArea: ["Country"],
    CensusCountyDivision: ["County", "State"],
    CensusTract: ["County", "State"],
    City: ["County", "State"],
    CongressionalDistrict: ["State"],
    County: ["State"],
    HighSchoolDistrict: ["State"],
    SchoolDistrict: ["County", "State"],
    State: ["Country"],
    StateComponent: ["State"],
  };

  useEffect(() => {
    const place = context.place;
    if (!place.value.country) {
      return;
    }
    if (!place.value.enclosedPlaceType) {
      setEnclosingPlaces({});
      place.set({ ...place.value, enclosedPlaces: [] });
      return;
    }

    if (
      _.indexOf(
        enclosedTypeToEnclosingType[place.value.enclosedPlaceType],
        "State"
      ) !== -1
    ) {
      setEnclosingPlaces(
        _.keys(places[place.value.country])
          .map((state) => {
            const place = splitPlace(state);
            return [place.dcid, place.name];
          })
          .reduce((places, dcidAndName) => {
            places[dcidAndName[0]] = dcidAndName[1];
            return places;
          }, {})
      );
    }

    // TODO: County.
  }, [context.place.value.enclosedPlaceType]);

  useEffect(() => {
    const place = context.place;
    if (place.value.country) {
      return;
    }
    place.set({
      enclosingPlace: { name: "", dcid: "" },
      enclosedPlaceType: "",
      enclosedPlaces: [],
      country: "",
    });
  }, [context.place.value.country]);

  useEffect(() => {
    const shouldGetPlaces =
      context.place.value.country &&
      context.place.value.enclosedPlaceType &&
      context.place.value.enclosingPlace.dcid &&
      _.isEmpty(context.place.value.enclosedPlaces);
    if (!shouldGetPlaces) {
      return;
    }
    getPlacesIn(
      context.place.value.enclosingPlace.dcid,
      context.place.value.enclosedPlaceType
    ).then((places) => {
      if (_.isEmpty(context.place.value.enclosedPlaces)) {
        context.place.set({ ...context.place.value, enclosedPlaces: places });
      }
    });
  }, [
    context.place.value.country,
    context.place.value.enclosedPlaceType,
    context.place.value.enclosingPlace,
  ]);

  return (
    <div className="container">
      <div className="row">
        <div className="col">Country</div>
        <div className="col">
          <select className="custom-select" onChange={selectCountry}>
            <option value="">Select a country</option>
            {_.keys(places).map((country) => (
              <option value={country} key={country}>
                {country}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="row">
        <div className="col">Plot places of type</div>
        <div className="col">
          <select
            className="custom-select"
            value={context.place.value.enclosedPlaceType}
            onChange={selectEnclosedPlaceType}
          >
            <option value="">Select a place type</option>
            {_.keys(enclosedTypeToEnclosingType).map((type) => (
              <option value={type} key={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        {context.place.value.enclosedPlaceType &&
          _.indexOf(
            enclosedTypeToEnclosingType[context.place.value.enclosedPlaceType],
            "State"
          ) !== -1 && (
            <div className="col">
              in
              <select
                className="custom-select"
                value={context.place.value.enclosingPlace.dcid}
                onChange={selectEnclosingPlace}
              >
                <option value="">Select a state</option>
                {_.keys(enclosingPlaces).map((dcid) => (
                  <option value={dcid} key={dcid}>
                    {enclosingPlaces[dcid]}
                  </option>
                ))}
              </select>
            </div>
          )}
        {/* TODO: County. */}
      </div>
      <div className="row">
        <div className="col">Only add places of this size</div>
        <div className="col"></div>
      </div>
      <div className="row">
        <div className="col">Plot Options</div>
        <div className="col">
          <div className="form-check">
            <input
              type="checkbox"
              id="per-capita"
              className="form-check-input"
              onChange={checkPerCapita}
            />
            <label htmlFor="per-capita" className="form-check-label">
              Per capita
            </label>
          </div>
          <div className="form-check">
            <input
              type="checkbox"
              id="swap"
              className="form-check-input"
              onChange={checkSwap}
            />
            <label htmlFor="swap" className="form-check-label">
              Swap X and Y axes
            </label>
          </div>
          <div className="form-check">
            <input
              type="checkbox"
              id="log-x"
              className="form-check-input"
              onChange={checkLogX}
            />
            <label htmlFor="log-x" className="form-check-label">
              Plot X-axis on log scale
            </label>
          </div>
          <div className="form-check">
            <input
              type="checkbox"
              id="log-y"
              className="form-check-input"
              onChange={checkLogY}
            />
            <label htmlFor="log-y" className="form-check-label">
              Plot Y-axis on log scale
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

export { Options };
