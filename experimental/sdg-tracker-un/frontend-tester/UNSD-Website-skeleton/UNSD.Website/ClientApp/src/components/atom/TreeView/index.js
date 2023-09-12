import React, { Component } from "react";
import "antd/dist/antd.css";
import { Tree } from "antd";
import { flattenDeep } from "lodash";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilePdf } from "@fortawesome/free-regular-svg-icons";
import { faFileCsv } from "@fortawesome/free-solid-svg-icons";
import { routePathConstants } from "../../../helper/Common/RoutePathConstants";

const { DirectoryTree } = Tree;

const onSelect = (keys, info) => {
  var dataref = info.node.dataRef;
  if (dataref != null) {
    window.open(dataref, "_blank");
  }
};

const fileDataPdf = (files) => {
  if (files != null) {
    var file = files.filter(function (fs) {
      return fs.indexOf(".pdf") !== -1;
    });
    return file;
  } else {
    return [];
  }
};

const fileDataCsv = (files) => {
  if (files != null) {
    var file = files.filter(function (fs) {
      return fs.indexOf(".csv") !== -1;
    });
    return file;
  } else {
    return [];
  }
};

const handleClickPdf = (files) => {
  if (files != null) {
    var file = files.filter(function (fs) {
      return fs.indexOf(".pdf") !== -1;
    });
    // return file;
    window.open(
      `${routePathConstants.PUBLICATIONS_STATISTICAL_YEARBOOK_PATH}${file[0]}`,
      "_blank"
    );
  } else {
    // return [];
  }
};
const handleClickCsv = (files) => {
  if (files != null) {
    var file = files.filter(function (fs) {
      return fs.indexOf(".csv") !== -1;
    });
    window.open(
      `${routePathConstants.PUBLICATIONS_STATISTICAL_YEARBOOK_PATH}${file[0]}`,
      "_blank"
    );
  } else {
    // return [];
  }
};

class TreeView extends Component {
  constructor(props) {
    super(props);

    this.state = {
      parts: [],
      expandedKeys: [],
    };
  }
  async componentDidMount() {
    this.keys = this.getAllKeys(this.props.data);

    this.setState({
      parts: this.props.data,
    });
  }

  getAllKeys = (data) => {
    const nestedKeys = data.map((node) => {
      let childKeys = [];
      if (node.children) {
        childKeys = this.getAllKeys(node.children);
      }
      return [childKeys, node.key];
    });
    return flattenDeep(nestedKeys);
  };

  onExpand = (expandedKeys) => {
    this.setState({
      expandedKeys,
    });
  };

  expandAll = () => {
    this.setState({
      expandedKeys: this.keys,
    });
  };

  collapseAll = () => {
    this.setState({
      expandedKeys: [],
    });
  };

  render() {
    return (
      <React.Fragment>
        <div class="listControl float-right mb-1">
          <a id="expandList" onClick={this.expandAll}>
            <i class="fa-fw fa fa-plus-circle" rel="noopener noreferrer"></i>{" "}
            Expand All
          </a>{" "}
          |
          <a id="collapseList" onClick={this.collapseAll}>
            <i class="fa-fw fa fa-minus-circle" rel="noopener noreferrer"></i>{" "}
            Collapse All
          </a>
        </div>
        <div id="listContainer">
          <ul id="expList" className="treelist">
            {this.props.rootdata.length > 0 &&
              this.props.rootdata.map(function (x, index) {
                return (
                  <li className="leaf">
                    {x.name}
                    <>
                      {" "}
                      <a
                        onClick={() => handleClickPdf(x.file)}
                        style={{
                          display: fileDataPdf(x.file).length > 0 ? "" : "none",
                        }}
                      >
                        <FontAwesomeIcon icon={faFilePdf} />
                      </a>
                      <a
                        onClick={() => handleClickCsv(x.file)}
                        style={{
                          display: fileDataCsv(x.file).length > 0 ? "" : "none",
                        }}
                      >
                        <FontAwesomeIcon icon={faFileCsv} />
                      </a>
                    </>
                  </li>
                );
              }, this)}
          </ul>
        </div>
        <div className="clearfix"></div>
        {this.state.parts.length > 0 ? (
          <DirectoryTree
            onSelect={onSelect}
            treeData={this.state.parts}
            onExpand={this.onExpand}
            expandedKeys={this.state.expandedKeys}
          />
        ) : (
          "no data"
        )}
      </React.Fragment>
    );
  }
}
export default TreeView;
