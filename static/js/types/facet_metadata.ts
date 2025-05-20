/**
 * Copyright 2025 Google LLC
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
 * Represents metadata for a facet, providing details about its properties and characteristics.
 */
export interface FacetMetadata {
  /**
   * The name of the import source associated with the facet.
   */
  importName?: string;

  /**
   * The method used to measure the data represented by the facet.
   */
  measurementMethod?: string;

  /**
   * The observation period for the data, typically represented as a string (e.g., "P1Y" for one year).
   */
  observationPeriod?: string;

  /**
   * A factor used to scale the data values for the facet.
   */
  scalingFactor?: number;

  /**
   * The unit of measurement for the data represented by the facet.
   */
  unit?: string;
}
