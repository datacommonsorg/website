import React, { Component } from "react";
import {SEP} from "./statsvar_menu";

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
                        <a href={["#&place=geoId/0606000,geoId/2511000,geoId/2603000,geoId/1777005,geoId/1225175,geoId/4815976&statsVar=MedianAge","Demographics","Median%20age"].join(SEP)}> age</a>,
                        <a href={["#&place=geoId/0606000,geoId/2511000,geoId/2603000,geoId/1777005,geoId/1225175,geoId/4815976&statsVar=MedianIncome","Demographics","Median%20income"].join(SEP)}>  income</a>,
                        <a href={["#&place=geoId/0606000,geoId/2511000,geoId/2603000,geoId/1777005,geoId/1225175,geoId/4815976&statsVar=Count_CriminalActivities_ViolentCrime","Crime","Crime%20Type","Violent"].join(SEP)}> crime</a>
                    </li>
                    <li>
                        <b>Close by very different</b>
                        <br/>
                        <span> Berkeley &amp; Piedmont:
                            <a href={["#&&place=geoId/0606000,geoId/0656938&statsVar=BelowPovertyLine","Demographics","Poverty%20Status","Below%20Poverty%20Level%20In%20The%20Past12%20Months"].join(SEP)}> poverty</a>,
                            <a href={["#&&place=geoId/0606000,geoId/0656938&statsVar=Count_Person_18To24Years","Demographics","Age","18%20-%2024%20Years__Count_Person_35To44Years","Demographics","Age","35%20-%2044%20Years__Count_Person_45To54Years","Demographics","Age","45%20-%2054%20Years__Count_Person_65To74Years","Demographics","Age","65%20-%2074%20Years"].join(SEP)}> age distribution</a>,
                            <a href={["#&&place=geoId/0606000,geoId/0656938&pc=1&statsVar=Count_Person_EducationalAttainmentBachelorsDegree","Education","Educational%20Attainment","Bachelors%20Degree__Count_Person_EducationalAttainmentMastersDegree","Education","Educational%20Attainment'Masters%20Degree__Count_Person_EducationalAttainmentDoctorateDegree","Education","Educational%20Attainment","Doctorate%20Degree"].join(SEP)}> education</a>
                        </span>
                        <br/>
                        <span>Palo Alto &amp; East Palo Alto:
                            <a href={["#&&place=geoId/0655282,geoId/0620956&statsVar=Count_Person_AsianAlone","Demographics","Race","Asian%20Alone__Count_Person_BlackOrAfricanAmericanAlone","Demographics","Race","Black%20Or%20African%20American%20Alone__Count_Person_NativeHawaiianAndOtherPacificIslanderAlone","Demographics","Race","Native%20Hawaiian%20And%20Other%20Pacific%20Islander%20Alone__Count_Person_WhiteAlone","Demographics","Race","White%20Alone"].join(SEP)}> race</a>,
                            <a href={["#&&place=geoId/0655282,geoId/0620956&pc=0&statsVar=MedianIncome","Demographics","Median%20income"].join(SEP)}> income</a>,
                            <a href={["#&&place=geoId/0655282,geoId/0620956&pc=1&statsVar=Count_Person_Employed","Employment","Employed"].join(SEP)}> employment</a>,
                            <a href={["#&&place=geoId/0655282,geoId/0620956&pc=1&statsVar=DivorcedPopulation","Demographics","Marital%20Status","Divorced__MarriedPopulation","Demographics","Marital%20Status","Married%20And%20Not%20Separated__NeverMarriedPopulation","Demographics","Marital%20Status","Never%20Married"].join(SEP)}> marital status</a>
                        </span>
                    </li>
                        <li> <b>Extremes</b> <br/>
                            <span>Santa Clara County vs Imperial County:
                                <a href={["#&&place=geoId/06085,geoId/06025&statsVar=MedianIncome","Demographics","Median%20income"
                                ].join(SEP)}> Richest vs. Poorest CA counties</a>,
                                <a href={["#&&place=geoId/06085,geoId/06025&statsVar=Count_Death_DiseasesOfTheCirculatorySystem","Health","Mortality","Cause%20Of%20Death","(I00-I99)%20Diseases%20of%20the%20circulatory%20system__Count_Death_ExternalCauses","Health","Mortality","Cause%20Of%20Death","(V01-Y89)%20External%20causes"].join(SEP)}> Cause of Death</a>
                            </span><br/>
                            <span>Atlanta vs West Jordan:
                                <a href={["#&&place=geoId/1304000,geoId/4982950&statsVar=MedianIncome","Demographics","Median%20income"].join(SEP)}> Highest vs Lowest Income Disparity</a>,
                                <a href={["#&&place=geoId/1304000,geoId/4982950&pc=1&statsVar=FemalePopulation","Demographics","Gender","Female__MalePopulation","Demographics","Gender","Male"].join(SEP)}> gender balance</a>
                            </span>
                        </li>
                </ul>
                <p>Take the data and use it on your site!</p>
                <p><a href="mailto:collaborations@datacommons.org">Send</a> us your discoveries!</p>
      </div>
        );
    }
}

export{Info}