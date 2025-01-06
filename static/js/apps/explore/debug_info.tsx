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
 * Debug info for a single query for the NL interface
 */

import _ from "lodash";
import queryString from "query-string";
import React, { ReactElement, useState } from "react";

import {
  MultiSVCandidate,
  QueryResult,
  SentenceScore,
  SVScores,
} from "../../types/app/explore_types";

const DEBUG_PARAM = "dbg";

const svToSentences = (
  variables: string[],
  varSentences: Map<string, Array<SentenceScore>>
): ReactElement => {
  return (
    <div id="sv-sentences-list">
      <table>
        <thead>
          <tr>
            <th>Variable DCID</th>
            <th>Sentences</th>
          </tr>
        </thead>
        <tbody>
          {variables.length === Object.keys(varSentences).length &&
            variables.map((variable) => {
              return (
                <tr key={variable}>
                  <td>{variable}</td>
                  <td>
                    <ul>
                      {varSentences[variable].map((sentence: SentenceScore) => {
                        return (
                          <li key={sentence.score + sentence.sentence}>
                            {sentence.sentence} (cosine:
                            {sentence.score.toFixed(4)}
                            {sentence.rerankScore
                              ? " - rerank:" + sentence.rerankScore.toFixed(4)
                              : ""}
                            )
                          </li>
                        );
                      })}
                    </ul>
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
};

const monoVarScoresElement = (
  variables: string[],
  scores: string[]
): ReactElement => {
  return (
    <div id="sv-scores-list">
      <table>
        <thead>
          <tr>
            <th>Variable</th>
            <th>Cosine Score (Best/Max) [0, 1]</th>
          </tr>
        </thead>
        <tbody>
          {variables.length === scores.length &&
            variables.map((variable, i) => {
              return (
                <tr key={i}>
                  <td>{variable}</td>
                  <td>{scores[i]}</td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
};

const multiVarPartsElement = (c: MultiSVCandidate): ReactElement => {
  return (
    <ul>
      {c.Parts.map((p) => {
        return (
          <li key={p.QueryPart}>
            [{p.QueryPart}]
            <ul>
              {p.SV.length === p.CosineScore.length &&
                p.SV.map((sv, i) => {
                  return (
                    <li key={i}>
                      {sv} ({p.CosineScore[i]})
                    </li>
                  );
                })}
            </ul>
          </li>
        );
      })}
    </ul>
  );
};

const multiVarScoresElement = (svScores: SVScores): ReactElement => {
  const monovarScores = Object.values(svScores.CosineScore);
  const maxMonovarScore = monovarScores.length > 0 ? monovarScores[0] : 0;
  const candidates = svScores.MultiSV.Candidates;
  return (
    <div id="multi-sv-scores-list">
      <table>
        <thead>
          <tr>
            <th>Number of Vars</th>
            <th>Avg Cosine Score</th>
            <th>Vars for query parts</th>
          </tr>
        </thead>
        <tbody>
          {candidates &&
            candidates.length > 0 &&
            candidates.map((c, i) => {
              return (
                <tr key={i}>
                  <td>
                    {c.Parts.length} {c.DelimBased ? " (delim)" : ""}
                  </td>
                  <td>
                    {c.AggCosineScore}
                    {c.AggCosineScore > maxMonovarScore
                      ? " (> best single var)"
                      : ""}
                  </td>
                  <td>{multiVarPartsElement(c)}</td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
};

export interface DebugInfoProps {
  debugData: any; // from the server response
  queryResult: QueryResult;
}

export function DebugInfo(props: DebugInfoProps): ReactElement {
  const debugParam = queryString.parse(window.location.hash)[DEBUG_PARAM];
  const hideDebug =
    !document.getElementById("metadata") ||
    !document.getElementById("metadata").dataset ||
    (document.getElementById("metadata").dataset.hideDebug !== "False" &&
      !debugParam);

  const [isCollapsed, setIsCollapsed] = useState(true);
  const [showDebug, setShowDebug] = useState(false);

  if (_.isEmpty(props.debugData) || hideDebug) {
    return <></>;
  }

  const debugInfo = {
    status: props.debugData["status"],
    blocked: props.debugData["blocked"] || false,
    originalQuery: props.debugData["original_query"],
    detectionType: props.debugData["detection_type"],
    placeDetectionType: props.debugData["place_detection_type"],
    placesDetected: props.debugData["places_detected"],
    placesResolved: props.debugData["places_resolved"],
    entitiesDetected: props.debugData["entities_detected"] || [],
    entitiesResolved: props.debugData["entities_resolved"] || [],
    mainPlaceDCID: props.debugData["main_place_dcid"],
    mainPlaceName: props.debugData["main_place_name"],
    queryIndexTypes: props.debugData["query_index_types"],
    queryWithoutPlaces: props.debugData["query_with_places_removed"],
    queryWithoutStopWords: props.debugData["query_with_stop_words_removal"],
    queryDetectionDebugLogs: props.debugData["query_detection_debug_logs"],
    svScores: props.debugData["sv_matching"] || {},
    svSentences: props.debugData["svs_to_sentences"],
    propScores: props.debugData["props_matching"] || {},
    propSentences: props.debugData["props_to_sentences"],
    rankingClassification: props.debugData["ranking_classification"],
    generalClassification: props.debugData["general_classification"],
    superlativeClassification: props.debugData["superlative_classification"],
    timeDeltaClassification: props.debugData["time_delta_classification"],
    comparisonClassification: props.debugData["comparison_classification"],
    containedInClassification: props.debugData["contained_in_classification"],
    correlationClassification: props.debugData["correlation_classification"],
    eventClassification: props.debugData["event_classification"],
    quantityClassification: props.debugData["quantity_classification"],
    dateClassification: props.debugData["date_classification"],
    counters: props.debugData["counters"],
  };

  const toggleShowDebug = (): void => {
    setShowDebug(!showDebug);
  };

  return (
    <>
      <a
        className={`debug-info-open ${showDebug && "active"}`}
        onClick={toggleShowDebug}
      >
        <span className="material-icons">bug_report</span>
      </a>
      {showDebug && (
        <>
          <div className="debug-overlay"></div>
          <div className="nl-query-result-debug-info">
            <header>
              <h3>
                <span className="material-icons">bug_report</span> Debugging:
                options & information
              </h3>
              <a className="debug-info-close" onClick={toggleShowDebug}>
                <span className="material-icons">close</span>
              </a>
            </header>

            <section>
              <div className="block">
                <strong>Execution Status: </strong>
                <span className="highlight">
                  {debugInfo.status || "--" || "--"}
                </span>
              </div>

              <div className="block">
                <strong>Detection Type: </strong>
                <span className="highlight">
                  {debugInfo.detectionType || "--"}
                </span>
              </div>

              <div className="block">
                <strong>Place Detection Type: </strong>
                <span className="highlight">
                  {debugInfo.placeDetectionType.toUpperCase()}
                </span>
              </div>

              <div className="block">
                <strong>Original Query: </strong>
                <span className="highlight">
                  {debugInfo.originalQuery || "--"}
                </span>
              </div>

              <div className="block">
                <strong>Blocked:</strong>
                <span className="highlight">
                  {debugInfo.blocked.toString() || "--"}
                </span>
              </div>

              <div className="block">
                <strong>Query index types: </strong>
                <span className="highlight">
                  {debugInfo.queryIndexTypes.join(", ")}
                </span>
              </div>

              <div className="block">
                <strong>Query without places: </strong>
                <span className="highlight">
                  {debugInfo.queryWithoutPlaces || "--"}
                </span>
              </div>

              <div className="block">
                <strong>Query without stop words: </strong>
                <span className="highlight">
                  {debugInfo.queryWithoutStopWords || "--"}
                </span>
              </div>

              <div className="block">
                <p>
                  <strong>Place Detection:</strong>
                </p>
                <ul>
                  <li>
                    <strong>Places Detected:</strong>
                    <span className="highlight">
                      {debugInfo?.placesDetected.length
                        ? debugInfo.placesDetected.join(", ")
                        : "--"}
                    </span>
                  </li>
                  <li>
                    <strong>Places Resolved:</strong>
                    <span className="highlight">
                      {debugInfo.placesResolved || "--"}
                    </span>
                  </li>
                  <li>
                    <strong>Main Place:</strong>
                    <span className="highlight">
                      {debugInfo.mainPlaceName || "--"} (dcid:{" "}
                      {debugInfo.mainPlaceDCID})
                    </span>
                  </li>
                </ul>
              </div>

              <div className="block">
                <p>
                  <strong>Entity Detection:</strong>
                </p>
                <ul>
                  <li>
                    <strong>Entities Detected: </strong>
                    <span className="highlight">
                      {debugInfo?.entitiesDetected.length
                        ? debugInfo.entitiesDetected.join(", ")
                        : "--"}
                    </span>
                  </li>
                  <li>
                    <strong>Entities Resolved:</strong>
                    <span className="highlight">
                      {debugInfo?.entitiesResolved.length
                        ? debugInfo.entitiesResolved.join(", ")
                        : "--"}
                    </span>
                  </li>
                </ul>
              </div>

              <div className="block">
                <p>
                  <strong>Query Type Detection:</strong>
                </p>
                <ul>
                  <li>
                    <strong>Ranking classification:</strong>
                    {debugInfo.rankingClassification || "--"}
                  </li>
                  <li>
                    <strong>Superlative type classification:</strong>
                    {debugInfo.superlativeClassification || "--"}
                  </li>
                  <li>
                    <strong>TimeDelta classification:</strong>
                    {debugInfo.timeDeltaClassification || "--"}
                  </li>
                  <li>
                    <strong>Comparison classification: </strong>
                    {debugInfo.comparisonClassification || "--"}
                  </li>
                  <li>
                    <strong>ContainedIn classification: </strong>
                    {debugInfo.containedInClassification || "--"}
                  </li>
                  <li>
                    <strong>Correlation classification: </strong>
                    {debugInfo.correlationClassification || "--"}
                  </li>
                  <li>
                    <strong>Event classification: </strong>
                    {debugInfo.eventClassification || "--"}
                  </li>
                  <li>
                    <strong>General classification: </strong>
                    {debugInfo.generalClassification || "--"}
                  </li>
                  <li>
                    <strong>Quantity classification: </strong>
                    {debugInfo.quantityClassification || "--"}
                  </li>
                  <li>
                    <strong>Date classification: </strong>
                    {debugInfo.dateClassification || "--"}
                  </li>
                </ul>
              </div>

              <div className="block">
                <p>
                  <strong>Single Variables Matches:</strong>
                </p>
                <small>
                  Note: Variables with scores less than model threshold are not
                  used.
                </small>

                {monoVarScoresElement(
                  Object.values(debugInfo.svScores.SV || {}),
                  Object.values(debugInfo.svScores.CosineScore || {})
                )}
              </div>

              <div className="block">
                <strong>Multi-Variable Matches:</strong>
                {multiVarScoresElement(debugInfo.svScores)}
              </div>

              <div className="block">
                <strong>Variable Sentences Matched:</strong>
                {svToSentences(
                  Object.values(debugInfo.svScores.SV || {}),
                  debugInfo.svSentences
                )}
              </div>

              <div className="block">
                <p>
                  <strong>Property Matches:</strong>
                </p>
                <small className="note">
                  Note: Properties with scores less than 0.5 are not used.
                </small>
                {monoVarScoresElement(
                  Object.values(debugInfo.propScores.PROP || {}),
                  Object.values(debugInfo.propScores.CosineScore || {})
                )}
              </div>

              <div className="block">
                <strong>Property Sentences Matched:</strong>
                {svToSentences(
                  Object.values(debugInfo.propScores.PROP || {}),
                  debugInfo.propSentences
                )}
              </div>

              <div className="block">
                <strong>Query Detection:</strong>
                <pre>
                  {JSON.stringify(debugInfo.queryDetectionDebugLogs, null, 2)}
                </pre>
              </div>

              <div className="show-more">
                <a onClick={(): void => setIsCollapsed(!isCollapsed)}>
                  {isCollapsed ? "Show More" : "Show Less"}
                </a>
              </div>

              {!isCollapsed && (
                <>
                  <div className="block">
                    <p>
                      <strong>Query Fulfillment:</strong>
                    </p>
                    <ul>
                      {props.queryResult && (
                        <li>
                          <strong>Place Query Source:</strong>
                          {props.queryResult.placeSource}
                          {props.queryResult.pastSourceContext
                            ? "(" + props.queryResult.pastSourceContext + ")"
                            : ""}
                        </li>
                      )}
                      {props.queryResult && (
                        <li>
                          <strong>Variable Query Source:</strong>
                          {props.queryResult.svSource}
                        </li>
                      )}
                      {props.queryResult && props.queryResult.placeFallback && (
                        <li>
                          <strong>Place Fallback:</strong>
                          &quot;
                          {props.queryResult.placeFallback.origStr}
                          &quot; to &quot;
                          {props.queryResult.placeFallback.newStr}
                          &quot;
                        </li>
                      )}
                    </ul>
                  </div>

                  <div className="block">
                    <p>
                      <strong>Counters:</strong>
                    </p>
                    <pre>{JSON.stringify(debugInfo.counters, null, 2)}</pre>
                  </div>

                  <div className="block">
                    <p>
                      <strong>Page Config:</strong>
                    </p>
                    <pre>
                      {JSON.stringify(
                        props.queryResult ? props.queryResult.config : null,
                        null,
                        2
                      )}
                    </pre>
                  </div>
                </>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}
