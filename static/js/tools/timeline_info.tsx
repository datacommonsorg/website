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
                        <a href="#&place=geoId/0606000,geoId/2511000,geoId/2603000,geoId/1777005,geoId/1225175,geoId/4815976&statsvar=Count_Person_18To24Years,Demographics,Age,18%20-%2024%20Years__Count_Person_35To44Years,Demographics,Age,35%20-%2044%20Years"> age </a>, 
                        <a href="#&place=geoId/0606000,geoId/2511000,geoId/2603000,geoId/1777005,geoId/1225175,geoId/4815976&statsvar=Count_Person_IncomeOfUpto9999USDollar,Demographics,Income,Less%20than%209,999%20$__Count_Person_IncomeOf50000To64999USDollar,Demographics,Income,50,000%20-%2064,999%20$">  income </a>, 
                        <a href="#&place=geoId/0606000,geoId/2511000,geoId/2603000,geoId/1777005,geoId/1225175,geoId/4815976&statsvar=Count_CriminalActivities_Burglary,Crime,Crime%20Type,Burglary__Count_CriminalActivities_LarcenyTheft,Crime,Crime%20Type,Larceny%20Theft">crime</a>
                    </li>
                    <li>
                        <b>Close by very different</b>
                        <br/>
                        <span> Berkeley &amp; Piedmont:
                            <a href="#&&place=geoId/0606000,geoId/0656938&statsvar=BelowPovertyLine,Demographics,Poverty%20Status,Below%20Poverty%20Level%20In%20The%20Past12%20Months">poverty</a>,
                            <a href="#&&place=geoId/0606000,geoId/0656938&statsvar=Count_Person_18To24Years,Demographics,Age,18%20-%2024%20Years__Count_Person_25To34Years,Demographics,Age,25%20-%2034%20Years__Count_Person_35To44Years,Demographics,Age,35%20-%2044%20Years">age distribution</a>, <a href="#&&place=geoId/0606000,geoId/0656938&pc=1&statsvar=Count_Person_EducationalAttainmentBachelorsDegree,Education,Educational%20Attainment,Bachelors%20Degree__Count_Person_EducationalAttainmentMastersDegree,Education,Educational%20Attainment,Masters%20Degree__Count_Person_EducationalAttainmentDoctorateDegree,Education,Educational%20Attainment,Doctorate%20Degree">education</a>
                        </span>
                        <br/>
                        <span>Palo Alto &amp; East Palo Alto:
                            <a href="#&&place=geoId/0655282,geoId/0620956&statsvar=Count_Person_EducationalAttainmentBachelorsDegree,Education,Educational%20Attainment,Bachelors%20Degree__Count_Person_EducationalAttainmentMastersDegree,Education,Educational%20Attainment,Masters%20Degree__Count_Person_EducationalAttainmentDoctorateDegree,Education,Educational%20Attainment,Doctorate%20Degree__Count_Person_AsianAlone,Demographics,Race,Asian%20Alone__Count_Person_BlackOrAfricanAmericanAlone,Demographics,Race,Black%20Or%20African%20American%20Alone__Count_Person_HispanicOrLatino,Demographics,Race,Hispanic%20Or%20Latino__Count_Person_WhiteAlone,Demographics,Race,White%20Alone">race</a>,
                            <a href="#&&place=geoId/0655282,geoId/0620956&pc=0&ptpv=Person,income,age,Years15Onwards,incomeStatus,WithIncome">income</a>,
                            <a href="#&&place=geoId/0655282,geoId/0620956&pc=1&ptpv=Person,income,age,Years15Onwards,incomeStatus,WithIncome__Person,count,employment,BLS_Employed">employment</a>,
                            <a href="#&&place=geoId/0655282,geoId/0620956&pc=1&ptpv=__Person,count,maritalStatus,MarriedAndNotSeparated,age,Years15Onwards__Person,count,maritalStatus,Divorced,age,Years15Onwards__Person,count,maritalStatus,NeverMarried,age,Years15Onwards">marital status</a>
                        </span>
                    </li>
                        <li> <b>Extremes</b> <br/>
                            <span>Santa Clara County vs Imperial County:
                                <a href="#&&place=geoId/06085,geoId/06025&ptpv=__Person,income,age,Years15Onwards,incomeStatus,WithIncome&pc=0">Richest vs Poorest CA counties</a>,
                                <a href="#&&place=geoId/06085,geoId/06025&ptpv=MortalityEvent,count,causeOfDeath,ICD10/V01-Y89__MortalityEvent,count,causeOfDeath,ICD10/I00-I99&pc=1">Cause of Death</a>
                            </span><br/>
                            <span>Atlanta vs West Jordan: 
                                <a href="#&&place=geoId/1304000,geoId/4982950&ptpv=Person,income,age,Years15Onwards,incomeStatus,WithIncome__Person,count,povertyStatus,BelowPovertyLevelInThePast12Months&pc=0">Highest vs Lowest Income Disparity</a>,
                                <a href="#&&place=geoId/1304000,geoId/4982950&pc=1&ptpv=Person,count,gender,Female__Person,count,gender,Male">gender balance</a>
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