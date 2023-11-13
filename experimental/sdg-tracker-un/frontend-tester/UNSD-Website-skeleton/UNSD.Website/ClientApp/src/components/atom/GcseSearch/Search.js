import React, { Component } from 'react';
import { Helmet } from "react-helmet"
import { routeDataforNowBasepath, routeCapacityDevelopmentBasepath } from "../../../helper/Common/RoutePathConstants";
import { commonConstants } from "../../../helper/Common/CommonConstants";

class Search extends Component {
    async componentDidMount() {
        setTimeout(() => {
            let element = document.getElementById("gsc-i-id1")            
            if (element) element.placeholder = " Search";
            //this.setTabTitle();
        }, 1000);
    }
    /*setTabTitle() {
        let title = commonConstants.PAGE_TITLE;
        let urlPath = window.location.pathname.toLowerCase();
        if (urlPath.indexOf(routeDataforNowBasepath) != -1) {
            title = commonConstants.PAGE_TITLE_DATA_FOR_NOW;
        }
        else if (urlPath.indexOf(routeCapacityDevelopmentBasepath) != -1) {
            title = commonConstants.PAGE_TITLE_CAPACITY_DEVELOPMENT;
        }
        
        document.title = title;
    };*/
    render() {
        return (
            <div>
                <Helmet>
                    <script
                        async
                        src="https://cse.google.com/cse.js?cx=9a194b3881d17fe94"
                    ></script>

                </Helmet>

                <div className="gcse-search"></div>
            </div>
        );
    }
}

export default Search;
