import React, { Component } from "react";

class Info extends Component {
    shouldComponentUpdate = () => false
    render() {
        return (
            <div id="placeholder-container">
                <p> Welcome to Data Commons. This tool is to help you
                find data about places (zip codes, cities, counties, states) from a variety of
                    sources, including the Census, FBI, Bureau of Labor Statistics, CDC and others. </p>
                <p> Enter a place in the search box above and then pick one or more of the variables in
                the pane to the left. There are thousands of variables to choose from, arranged in a
                    topical hierarchy. </p>
                <p> Or you can start your exploration from these interesting points ...</p>
                <ul>
                    <li>
                        <b>University towns</b> by
                        <a href={"#&place=geoId/0606000,geoId/2511000,geoId/2603000,geoId/1777005,geoId/1225175,geoId/4815976&statsVar=Median_Age_Person"}> age</a>,
                        <a href={"#&place=geoId/0606000,geoId/2511000,geoId/2603000,geoId/1777005,geoId/1225175,geoId/4815976&statsVar=Median_Income_Person"}>  income</a>,
                        <a href={"#&place=geoId/0606000,geoId/2511000,geoId/2603000,geoId/1777005,geoId/1225175,geoId/4815976&statsVar=Count_CriminalActivities_ViolentCrime"}> crime</a>
                    </li>
                    <li>
                        <b>Close by very different</b>
                        <br />
                        <span> Berkeley &amp; Piedmont:
                            <a href={"#&&place=geoId/0606000,geoId/0656938&statsVar=Count_Person__BelowPovertyLine"}> poverty</a>,
                            <a href={"#&&place=geoId/0606000,geoId/0656938&statsVar=Count_Person_18To24Years__Count_Person_35To44Years__Count_Person_45To54Years__Count_Person_65To74Years"}> age distribution</a>,
                            <a href={"#&&place=geoId/0606000,geoId/0656938&pc=1&statsVar=Count_Person_EducationalAttainmentBachelorsDegree__Count_Person_EducationalAttainmentMastersDegree__Count_Person_EducationalAttainmentDoctorateDegree"}> education</a>
                        </span>
                        <br />
                        <span>Palo Alto &amp; East Palo Alto:
                            <a href={"#&&place=geoId/0655282,geoId/0620956&statsVar=Count_Person_AsianAlone__Count_Person_BlackOrAfricanAmericanAlone__Count_Person_NativeHawaiianAndOtherPacificIslanderAlone__Count_Person_WhiteAlone"}> race</a>,
                            <a href={"#&&place=geoId/0655282,geoId/0620956&pc=0&statsVar=Median_Income_Person"}> income</a>,
                            <a href={"#&&place=geoId/0655282,geoId/0620956&pc=1&statsVar=Count_Person_Employed"}> employment</a>,
                            <a href={"#&&place=geoId/0655282,geoId/0620956&pc=1&statsVar=Count_Person_Divorced__Count_Person_MarriedAndNotSeparated__Count_Person_NeverMarried"}> marital status</a>
                        </span>
                    </li>
                    <li> <b>Extremes</b> <br />
                        <span>Santa Clara County vs Imperial County:
                                <a href={"#&&place=geoId/06085,geoId/06025&statsVar=Median_Income_Person"}> Richest vs. Poorest CA counties</a>,
                                <a href={"#&&place=geoId/06085,geoId/06025&statsVar=Count_Death_DiseasesOfTheCirculatorySystem__Count_Death_ExternalCauses"}> Cause of Death</a>
                        </span><br />
                        <span>Atlanta vs West Jordan:
                                <a href={"#&&place=geoId/1304000,geoId/4982950&statsVar=Median_Income_Person"}> Highest vs Lowest Income Disparity</a>,
                                <a href={"#&&place=geoId/1304000,geoId/4982950&pc=1&statsVar=Count_Person_Female__Count_Person_Male"}> gender balance</a>
                        </span>
                    </li>
                </ul>
                <p>Take the data and use it on your site!</p>
                <p><a href="mailto:collaborations@datacommons.org">Send</a> us your discoveries!</p>
            </div>
        );
    }
}

export { Info }