import React, { useState, Component } from "react";
import { Row, Col, Breadcrumb, Radio, Tabs } from "antd";
import { Link } from "react-router-dom";
import { routePathConstants } from "../../helper/Common/RoutePathConstants";
import { Text } from "../../containers/Language";
import { CustomIcon } from "../../components/atom/Icon";
import { DataCommonsSdgBody } from "../../components/molecule/DataCommons/DataCommonsSdgBody";
import TabIcon from "../../components/atom/DataCommons/TabIcon";

const DataCommonsDynamicTemplate = () => {
  const [mode, setMode] = useState("left");

  const handleModeChange = (e) => {
    setMode(e.target.value);
  };

  return (
    <React.Fragment>
      <div className="container">
        <Row gutter={32}>
          <Col className="gutter-row" span={24}>
            <Breadcrumb
              separator={<CustomIcon icon="angle-right" />}
            >
              <Breadcrumb.Item>
                <Link
                  to={`${routePathConstants.HOME_PATH}`}
                >
                  <Text tid="NavHome" />
                </Link>
              </Breadcrumb.Item>
              <Breadcrumb.Item>
                Data Commons Test
              </Breadcrumb.Item>
            </Breadcrumb>
          </Col>

          <Col className="gutter-row" span={24}>
            <h1 className="mb-4">Data Commmons Test</h1>
          </Col>
        </Row>
        <Row>
          <Col>
            <Radio.Group
              onChange={handleModeChange}
              value={mode}
              style={{
                marginBottom: 8,
              }}
            >
              <Radio.Button value="left">left</Radio.Button>
              <Radio.Button value="top">top</Radio.Button>
              <Radio.Button value="bottom">
                bottom
              </Radio.Button>
              <Radio.Button value="right">
                right
              </Radio.Button>
            </Radio.Group>
          </Col>
        </Row>
        <Row>
          <Col>
            <Tabs
              defaultActiveKey="1"
              tabPosition={mode}
              className="event-detail-tab"
            >
              <Tabs.TabPane
                tab={
                    <TabIcon
                    iconSrc="https://sdgs.un.org/sites/default/files/goals/E_SDG_Icons-01.jpg"
                    alttext="SDG 1"
                    text="No Poverty"
                  />
                }
                key="1"
              >
                <DataCommonsSdgBody Id={"1"} />
              </Tabs.TabPane>
              <Tabs.TabPane
                tab={
                    <TabIcon
                    iconSrc="https://sdgs.un.org/sites/default/files/goals/E_SDG_Icons-02.jpg"
                    alttext="SDG 2"
                    text="Zero Hunger"
                  />
                }
                key="2"
              >
                <DataCommonsSdgBody Id={"2"} />
              </Tabs.TabPane>
              <Tabs.TabPane
                tab={
                    <TabIcon
                    iconSrc="https://sdgs.un.org/sites/default/files/goals/E_SDG_Icons-03.jpg"
                    alttext="SDG 3"
                    text="Good Health and Well-being"
                  />
                }
                key="3"
              >
                <DataCommonsSdgBody Id={"3"} />
              </Tabs.TabPane>
              <Tabs.TabPane
                tab={
                    <TabIcon
                    iconSrc="https://sdgs.un.org/sites/default/files/goals/E_SDG_Icons-04.jpg"
                    alttext="SDG 4"
                    text="Quality Education"
                  />
                }
                key="4"
              >
              <DataCommonsSdgBody Id={"4"} />
              </Tabs.TabPane>
              <Tabs.TabPane
                tab={
                    <TabIcon
                    iconSrc="https://sdgs.un.org/sites/default/files/goals/E_SDG_Icons-05.jpg"
                    alttext="SDG 5"
                    text="Gender Equality"
                  />
                }
                key="5"
              >
              <DataCommonsSdgBody Id={"5"} />
              </Tabs.TabPane>
              <Tabs.TabPane
                tab={
                    <TabIcon
                    iconSrc="https://sdgs.un.org/sites/default/files/goals/E_SDG_Icons-06.jpg"
                    alttext="SDG 6"
                    text="Clean Water and Sanitation"
                  />
                }
                key="6"
              >
              <DataCommonsSdgBody Id={"6"} />
              </Tabs.TabPane>
              <Tabs.TabPane
                tab={
                    <TabIcon
                    iconSrc="https://sdgs.un.org/sites/default/files/goals/E_SDG_Icons-07.jpg"
                    alttext="SDG 7"
                    text="Affordable and Clean Energy"
                  />
                }
                key="7"
              >
              <DataCommonsSdgBody Id={"7"} />
              </Tabs.TabPane>
              <Tabs.TabPane
                tab={
                    <TabIcon
                    iconSrc="https://sdgs.un.org/sites/default/files/goals/E_SDG_Icons-08.jpg"
                    alttext="SDG 8"
                    text="Decent Work and Economic Growth"
                  />
                }
                key="8"
              >
              <DataCommonsSdgBody Id={"8"} />
              </Tabs.TabPane>
              <Tabs.TabPane
                tab={
                    <TabIcon
                    iconSrc="https://sdgs.un.org/sites/default/files/goals/E_SDG_Icons-09.jpg"
                    alttext="SDG 9"
                    text="ndustry, Innovation and Infrastructure"
                  />
                }
                key="9"
              >
              <DataCommonsSdgBody Id={"9"} />
              </Tabs.TabPane>
              <Tabs.TabPane
                tab={
                    <TabIcon
                    iconSrc="https://sdgs.un.org/sites/default/files/goals/E_SDG_Icons-10.jpg"
                    alttext="SDG 10"
                    text="Reduced Inequality"
                  />
                }
                key="10"
              >
              <DataCommonsSdgBody Id={"10"} />
              </Tabs.TabPane>
              <Tabs.TabPane
                tab={
                    <TabIcon
                    iconSrc="https://sdgs.un.org/sites/default/files/goals/E_SDG_Icons-11.jpg"
                    alttext="SDG 11"
                    text="Sustainable Cities and Communities"
                  />
                }
                key="11"
              >
              <DataCommonsSdgBody Id={"11"} />
              </Tabs.TabPane>
              <Tabs.TabPane
                tab={
                    <TabIcon
                    iconSrc="https://sdgs.un.org/sites/default/files/goals/E_SDG_Icons-11.jpg"
                    alttext="SDG 11"
                    text="Responsible Consumption and Production"
                  />
                }
                key="12"
              >
              <DataCommonsSdgBody Id={"12"} />
              </Tabs.TabPane>
              <Tabs.TabPane
                tab={
                    <TabIcon
                    iconSrc="https://sdgs.un.org/sites/default/files/goals/E_SDG_Icons-13.jpg"
                    alttext="SDG 13"
                    text="Clean Water and Sanitation"
                  />
                }
                key="13"
              >
              <DataCommonsSdgBody Id={"13"} />
              </Tabs.TabPane>
              <Tabs.TabPane
                tab={
                    <TabIcon
                    iconSrc="https://sdgs.un.org/sites/default/files/goals/E_SDG_Icons-14.jpg"
                    alttext="SDG 14"
                    text="Life Below Water"
                  />
                }
                key="14"
              >
              <DataCommonsSdgBody Id={"14"} />
              </Tabs.TabPane>
              <Tabs.TabPane
                tab={
                    <TabIcon
                    iconSrc="https://sdgs.un.org/sites/default/files/goals/E_SDG_Icons-15.jpg"
                    alttext="SDG 15"
                    text="Life on Land"
                  />
                }
                key="15"
              >
              <DataCommonsSdgBody Id={"15"} />
              </Tabs.TabPane>
              <Tabs.TabPane
                tab={
                    <TabIcon
                    iconSrc="https://sdgs.un.org/sites/default/files/goals/E_SDG_Icons-16.jpg"
                    alttext="SDG 16"
                    text="Peace, Justice and Strong Institutions"
                  />
                }
                key="16"
              >
              <DataCommonsSdgBody Id={"16"} />
              </Tabs.TabPane>
              <Tabs.TabPane
                tab={
                    <TabIcon
                    iconSrc="https://sdgs.un.org/sites/default/files/goals/E_SDG_Icons-17.jpg"
                    alttext="SDG 17"
                    text="Partnerships for the Goal"
                  />
                }
                key="17"
              >
              <DataCommonsSdgBody Id={"17"} />
              </Tabs.TabPane>
            </Tabs>
          </Col>
        </Row>
      </div>
    </React.Fragment>
  );
};
export default DataCommonsDynamicTemplate;
