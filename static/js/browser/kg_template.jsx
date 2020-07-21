/**
 * Copyright 2020 Google LLC
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

import React, { Component } from "react";

class GeneralNode extends Component {
  render() {
    return (
      <React.Fragment>
        <div className="node-about initial-hide" style={{display:'none'}}>
          <span>About: <span id="bg-node-name"></span></span>
        </div>
        <form id="toggle-form" className=" initial-hide" style={{display:'none'}} action="">
          <input id="toogle-text"
                type="radio"
                className="toggle-view"
                name="view"
                value="text" />
          Raw Graph View
          <br />
          <input id="toogle-chart"
                type="radio"
                className="toggle-view"
                name="view"
                value="chart" />
          Chart View
          <br />
        </form>
        <div id="out-arcs"></div>
        <div id="in-arcs-groups"></div>
        <div id="subpop-hint"></div>
        <div id="population"></div>
        <div id="observation"></div>
      </React.Fragment>
    );
  }
}

class ArcGroupTitle extends Component {
  constructor(props) {
    super(props);
  }
  render() {
    return (
      <div id={this.props.extraPText} className='arc-group-title'>
        <strong>
          <span><span className="mp">{this.props.arcType}</span> of{' '}{this.props.subject}</span>
          {!!this.props.pvContent &&
          <span>
            <span>&#44;</span>
            <span className="title-pv">{this.props.pvContent}</span>
          </span>
          }
          {!!this.props.extraPText &&
            (this.props.extraPText != 'gender'
              || (this.props.arcType == 'count'
              || this.props.arcType == 'age')) &&
              <span>
                <span>{' '}by{' '}</span>
                <span className="title-p">{this.props.extraPText}</span>
              </span>
          }
          <div className="v-select-parent">
            <span>{' '}</span>
            <div className="v-select" style={{display:'none'}}></div>
          </div>
        </strong>
      </div>
    );
  }
}

class ArcGroupComparativeTitle extends Component {
  constructor(props) {
    super(props)
  }
  render() {
    return(
      <div id={this.props.extraPText} className='arc-group-title'>
        <strong>
          <span>{this.props.arcType} </span>
          <span>{' '} measuring{' '}{' '}</span>
          <a href={"/browser/"+this.props.compOperator}>{compOperator}</a>
          <span>{' '}of{' '}{this.props.subject}{' '}</span>
          {!!this.props.extraPText && this.props.extraPText != 'Unknown' &&
            <div>
              <span>{' '}by{' '}</span>
              <span className="title-p">{this.props.extraPText}</span>
            </div>
          }
          <span>{' '} between {' '}</span>
          <a href={"/browser/"+this.props.obsNode}>{this.props.obsPvContent}</a>
          <span>{' '}and{' '}</span>
          <a href={"/browser/"+this.props.compNode}>{this.props.compPvContent}</a>
          <div className="v-select-parent">
            <span>{' '}</span>
            <div className="v-select" style={{display:'none'}}></div>
          </div>
        </strong>
      </div>
    );
  }
}

class ArcGroupTextContent extends Component {
  constructor(props) {
    super(props);
  }
  render() {
    let tableClass = "node-table";
    if (this.props.textView) {
      tableClass += " text-view";
    }
    return (
      <table className={tableClass}>
        <tbody>
        {this.props.arcs.map((arc, index) => {
          return (
          <tr key={index}>
            <td width="25%">
              <a href={"/browser/"+this.props.propName}>{this.props.propName}</a>{' '}of
            </td>
            <td witdh="50%">
              {!!arc['dcid'] ?
                <a href={"/browser/"+arc['dcid']}>{arc['text']}</a>
              :
                <span>{arc['text']}</span>
              }
            </td>
            <td width="25%">
              {!!arc['prov'] &&
                <a href={"/browser/"+arc['prov']}>{arc['src']}</a>
              }
            </td>
          </tr>
          )
        })}
        </tbody>
      </table>
    );
  }
}

class OutArcsTable extends Component {
  constructor(props) {
    super(props);
  }
  render() {
    return (
      <table className="node-table">
        <tbody>
          <tr key="header">
            <td className="property-column" width="25%"><strong>Property</strong></td>
            <td width="50%"><strong>Value</strong></td>
            <td width="25%"><strong>Provenance</strong></td>
          </tr>
          {this.props.arcs.map((arc, index) => {
            return (
              <tr key={arc['predicate'] + index}>
                <td className="property-column" width="25%">
                  <a href={"/browser/" + arc['predicate']}>{arc['predicate']}</a>
                </td>
                <td witdh="50%">
                  {!!arc['objectValue'] ?
                    <span className="out-arc-text">{arc['objectValue']}</span>
                    :
                    <a href={"/browser/"+arc['objectId']}>{arc['objectName']}</a>
                  }
                </td>
                <td width="25%">
                  <a href={"/browser/"+arc['provenanceId']}>{arc['src']}</a>
                </td>
              </tr>
            );
          })}
          <tr key="dcid">
            <td className="property-column" width="25%">
              <a href="/browser/dcid">dcid</a>
            </td>
            <td witdh="50%">
              <span className="out-arc-text">{this.props.dcid}</span>
            </td>
            <td width="25%">
            </td>
          </tr>
        </tbody>
      </table>
    );
  }
}


class ObsCount extends Component {
  constructor(props) {
    super(props);
  }
  render() {
    return (
      <div className="count-obs chart-view">
        {this.props.count} observations
      </div>
    );
  }
}


class SubPopulation extends Component {
  constructor(props) {
    super(props);
  }
  render() {
    return (
      <h4>
        <hr />
        Sub-populations of {this.props.locName}{' '}--{' '}
        {Object.entries(this.props.pvs).map(([p, v]) => {
          return (
            <span key={p}>
              {p}: {v}{' '}{' '}
            </span>
          );
        })}
        <br />
      </h4>
    );
  }
}


class VSelect extends Component {
  constructor(props) {
    super(props);
  }
  render() {
    return (
      <React.Fragment>
        {this.props.vList.map((v, index) => {
          return (
            <div className="input-w" key={index}>
              {index < this.props.maxV
              ?
                <input type="checkbox" className="v-select-input" value={v} defaultChecked />
              :
                <input type="checkbox" className="v-select-input" value={v} />
              }
              <label htmlFor={v}>{v}</label>
            </div>
            )
        })}
      </React.Fragment>
    );
  }
}

export {
  GeneralNode,
  ArcGroupTitle,
  ArcGroupComparativeTitle,
  ArcGroupTextContent,
  OutArcsTable,
  ObsCount,
  SubPopulation,
  VSelect,
}