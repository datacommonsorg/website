import React, { Component } from "react";
import { Row, Col, Card, Form } from "antd";
import { ReadMoreAndLess } from "../../molecule/ReadMoreAndLess/ReadMoreAndLess";
import ReactHtmlParser from "react-html-parser";

export class CardViewWithTag extends Component {
  onTagCallback = (tagObj, type) => {
    this.props.onTagCallback(tagObj, type);
  };

  onTitleClick = (data) => {
    this.props.onTitleClick(data);
  };

  render() {
    const data = this.props.data;
    return (
      <React.Fragment>
        <Card className="ant-card-shadow mb-3" key={this.props.index}>
          <Row gutter={32}>
            <Col className="gutter-row" span={24}>
              <h3 className="mb-3">
                <a onClick={() => this.onTitleClick(this.props.data)}>
                  {ReactHtmlParser(data.title)}
                </a>
              </h3>
              <Form layout="vertical">
                {this.props.children}
                {data.tags && (
                  <Row>
                    <Col className="gutter-row" span={24}>
                      <ReadMoreAndLess
                        tags={data.tags}
                        onTagCallback={this.onTagCallback}
                      />
                    </Col>
                  </Row>
                )}
              </Form>
            </Col>
          </Row>
        </Card>
      </React.Fragment>
    );
  }
}
