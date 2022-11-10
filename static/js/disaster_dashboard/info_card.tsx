/**
 * Copyright 2022 Google LLC
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
 * Component for the content of the info card.
 */
import React from "react";

import { DisasterEventPoint } from "./types";

interface InfoCardPropType {
  eventData: DisasterEventPoint;
  onClose: () => void;
}

export function InfoCard(props: InfoCardPropType): JSX.Element {
  return (
    <div className="disaster-dashboard-info-card-content">
      <div className="disaster-dashboard-info-card-header">
        <div className="disaster-dashboard-info-card-title">{props.eventData.placeName}</div>
        <i className="material-icons-outlined" onClick={props.onClose}>
          close
        </i>
      </div>
      <div className="disaster-dashboard-info-card-info">
        <span>Start Date: {props.eventData.startDate}</span>
        {props.eventData.endDate && (
          <span>End Date: {props.eventData.endDate}</span>
        )}
        {props.eventData.intensity &&
          Object.keys(props.eventData.intensity).map((prop) => {
            return (
              <span key={prop}>
                {prop}: {props.eventData.intensity[prop]}
              </span>
            );
          })}
      </div>
    </div>
  );
}
