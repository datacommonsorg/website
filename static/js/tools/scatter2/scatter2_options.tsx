import React, { useContext } from "react";
import _ from "lodash";
import { Menu } from "../statsvar_menu";
import { NoopStatsVarFilter } from "../commons";
import { ScatterContext } from "./scatter2_app";
import places from "../../../data/placeObject.json";

function Options(): JSX.Element {
  function checkPerCapita(event: React.ChangeEvent<HTMLInputElement>) {
    context.perCapita.set(event.target.checked);
  }

  function checkSwap() {
    const [x, y] = [context.statVarX.value, context.statVarY.value];
    const [dataX, dataY] = [context.dataX.value, context.dataY.value];
    const [logX, logY] = [context.logX.value, context.logY.value];
    context.statVarX.set(y);
    context.statVarY.set(x);
    context.dataX.set(dataY);
    context.dataY.set(dataX);
    context.logX.set(logY);
    context.logY.set(logX);
  }

  function checkLogX(event: React.ChangeEvent<HTMLInputElement>) {
    context.logX.set(event.target.checked);
  }

  function checkLogY(event: React.ChangeEvent<HTMLInputElement>) {
    context.logY.set(event.target.checked);
  }

  const context = useContext(ScatterContext);
  return (
    <div className="container">
      <div className="row">
        <div className="col">Country</div>
        <div className="col">
          <select className="custom-select">
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
          <select className="custom-select"></select>
        </div>
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
