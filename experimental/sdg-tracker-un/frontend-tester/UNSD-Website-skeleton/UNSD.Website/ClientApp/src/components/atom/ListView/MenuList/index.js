import React, { useState, useEffect } from "react";
import { Menu } from "antd";
import { routeCapacityDevelopmentConstants, routeDataforNowPathConstants } from "../../../../helper/Common/RoutePathConstants";

export const ListView = ({ isFor, data }) => {

    const [current, setCurrent] = useState(null);
    const [currentOpenKeys, setCurrentOpenKeys] = useState([]);

    useEffect(() => {

        var path = (window.location.pathname.slice(-1) === "/" ? window.location.pathname.slice(0, -1) : window.location.pathname).toLowerCase();
        var currentRoute = path.split('/').pop();

        if (isFor === "capacityDevelopment") {
            var findPath = `${routeCapacityDevelopmentConstants.HOME_PATH}${currentRoute}`;
            if (routeCapacityDevelopmentConstants.INITIATIVE.includes(findPath) || routeCapacityDevelopmentConstants.BIG_DATA_TRAINING.includes(findPath) || routeCapacityDevelopmentConstants.ALL_INITIATIVES.includes(findPath)) {
                setCurrentOpenKeys(['initiatives']);
            }
            else if (routeCapacityDevelopmentConstants.PROJECTS.includes(findPath) || routeCapacityDevelopmentConstants.DA14.includes(findPath) || routeCapacityDevelopmentConstants.ALL_PROJECTS.includes(findPath)) {
                setCurrentOpenKeys(['projects']);
            }
            else if (routeCapacityDevelopmentConstants.STATISTICAL_TRAINING.includes(findPath)) {
                setCurrentOpenKeys(['statistical-training']);
            }
        }
        setCurrent(currentRoute);

    }, [current]);

    return (
        <React.Fragment>
            {
                <Menu
                    items={data}
                    className="capacity-development-sidenav-list"

                    onOpenChange={(openKeys) => {
                        setCurrentOpenKeys(openKeys);
                    }}
                    selectedKeys={[current]}
                    openKeys={currentOpenKeys}
                    mode="inline"
                />
            }

        </React.Fragment>
    );
};
