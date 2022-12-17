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
 * Constants used across components in Disaster Dashboard
 */

// id of the spinner screen for the content sections of the disaster dashboard
export const CONTENT_SPINNER_ID = "content-spinner-screen";

// enum of possible disaster types user can select
export enum DisasterType {
  ALL = "All",
  EARTHQUAKE = "Earthquake",
  FIRE = "Fire",
  STORM = "Storm",
  FLOOD = "Flood",
  DROUGHT = "Drought",
}

// Map of Disaster type to event types encompassed by the disaster type
export const DISASTER_EVENT_TYPES = {
  [DisasterType.EARTHQUAKE]: ["EarthquakeEvent"],
  [DisasterType.FIRE]: ["WildlandFireEvent", "WildfireEvent"],
  [DisasterType.STORM]: [
    "CycloneEvent",
    "HurricaneTyphoonEvent",
    "HurricaneEvent",
    "TornadoEvent",
  ],
  [DisasterType.FLOOD]: ["FloodEvent"],
  [DisasterType.DROUGHT]: ["DroughtEvent"],
};

// Map of Disaster type to intensity props used for each disaster type
export const DISASTER_EVENT_INTENSITIES = {
  [DisasterType.EARTHQUAKE]: ["magnitude"],
  [DisasterType.DROUGHT]: ["directDeaths", "directInjuries"],
};
