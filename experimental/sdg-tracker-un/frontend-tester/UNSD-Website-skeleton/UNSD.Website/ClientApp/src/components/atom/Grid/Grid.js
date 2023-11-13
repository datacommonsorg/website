import React, { Fragment } from 'react';
import { Row, Col, Collapse, Select, Input, Space } from 'antd';
import { MinusOutlined, PlusOutlined } from '@ant-design/icons';
const _ = require('lodash');
const { Panel } = Collapse;
const { Option } = Select;


let QuestionaireData = [];
let ElementsData = [];
let SummaryData = [];
let UniqueSummaryDataForMobile = [];
let fcCount = 0;
let pcCount = 0;
let ncCount = 0;
let naCount = 0;
let mcCount = 0;
let val = 0;
function GetUniquePrincipleId(principleName) {

    var res = principleName.substring(0, 2);
    var n = res.endsWith(".");

    if (n === true) {
        return principleName.substring(0, 1);
    }
    else {
        return principleName.substring(0, 2);

    }
}
function GetUniqueLevelNames(Data) {
    var UniqueNames = [];
    Data.forEach(function (value) {
        if (UniqueNames.indexOf(value.levelName) === -1) {
            UniqueNames.push(value.levelName);
        }
    });

    return UniqueNames;
}

function GetUniquePrincipleNames(Data) {
    var UniqueNames = [];
    Data.forEach(function (value) {
        if (UniqueNames.indexOf(value.principle) === -1) {
            UniqueNames.push(value.principle);
        }
    });

    return UniqueNames;
}

function GetUniqueRequirementNames(Data) {
    var UniqueNames = [];
    Data.forEach(function (value) {
        if (UniqueNames.indexOf(value.requirement) === -1) {
            UniqueNames.push(value.requirement);
        }
    });

    return UniqueNames;
}
function getinitialQuestionaireDataForMobile(checkListData) {

    let UniqueLevelNames = GetUniqueLevelNames(checkListData)
    let principledata;
    let chartPrincipleName = []
    var QuestionaireData = []
    UniqueLevelNames.map((levelmapvalue, index) => {

        var leveldetailsobj = {}
        leveldetailsobj.levelName = levelmapvalue

        let leveldetails = checkListData.filter(item => item.levelName === levelmapvalue)
        let uniquePrincipleName = GetUniquePrincipleNames(leveldetails);
        let uniqueRequirementName = GetUniqueRequirementNames(leveldetails);

        var principleDataArray = []
        var removeDupPrinci = '';
        uniquePrincipleName.map((unqPrinciple, index) => {
            let principledata = leveldetails.filter(item => item.levelName === levelmapvalue && item.principle == unqPrinciple)
            let principleId = GetUniquePrincipleId(unqPrinciple);
            var requirementArray = []
            var prinicipleNameObj = {}
            prinicipleNameObj.prinicipleName = unqPrinciple
            prinicipleNameObj.prinicipleId = principleId

            let Requirementdetails = checkListData.filter(item => item.principle === unqPrinciple)

            Requirementdetails.map((unqRequirement, index) => {

                var requirementNameObj = {}
                requirementNameObj.requirement = unqRequirement.requirement
                requirementNameObj.fullComplianceQ = unqRequirement.fullComplianceQ
                requirementNameObj.partialComplianceQ = unqRequirement.partialComplianceQ
                requirementNameObj.noComplianceQ = unqRequirement.noComplianceQ
                requirementNameObj.notAssessesQ = unqRequirement.notAssessesQ
                requirementNameObj.otherComments = unqRequirement.otherComments
                requirementNameObj.compliance = unqRequirement.compliance


                requirementArray.push(requirementNameObj)

            });
            prinicipleNameObj.requirement = requirementArray
            principleDataArray.push(prinicipleNameObj)

            leveldetailsobj.principleDetails = principleDataArray

        });

        QuestionaireData.push(leveldetailsobj)

    });
    return QuestionaireData;

}
function getinitialElementsDataForMobile(checkListData) {

    let UniqueLevelNames = GetUniqueLevelNames(checkListData)
    let uniquePrincipleName = GetUniquePrincipleNames(checkListData);

    var ElementsData = []
    uniquePrincipleName.map((principlemapvalue, index) => {
        let principleId = GetUniquePrincipleId(principlemapvalue);
        var principledetailsobj = {}
        principledetailsobj.principle = principlemapvalue
        principledetailsobj.principleId = principleId

        let principleDetails = checkListData.filter(item => item.principle === principlemapvalue)

        let uniqueRequirementName = GetUniqueRequirementNames(principleDetails);


        var principleDataArray = []
        uniqueRequirementName.map((unqRequirement, index) => {
            let requirementData = principleDetails.filter(item => item.principle === principlemapvalue && item.requirement == unqRequirement)

            var requirementArray = []
            var principleNameObj = {}

            principleNameObj.requirement = unqRequirement

            let Requirementdetails = checkListData.filter(item => item.requirement === unqRequirement)

            Requirementdetails.map((Requirement, index) => {

                var requirementNameObj = {}

                requirementNameObj.elementsName = Requirement.elementsName
                requirementNameObj.fullCompliance = Requirement.fullCompliance
                requirementNameObj.partialCompliance = Requirement.partialCompliance
                requirementNameObj.noCompliance = Requirement.noCompliance
                requirementNameObj.notAssesses = Requirement.notAssesses
                requirementNameObj.principleComments = Requirement.principleComments
                requirementNameObj.elementsCompliance = Requirement.elementsCompliance


                requirementArray.push(requirementNameObj)

            });
            principleNameObj.elements = requirementArray
            principleDataArray.push(principleNameObj)
            principledetailsobj.requirementDetails = principleDataArray;

        });

        ElementsData.push(principledetailsobj)

    });
    return ElementsData;

}
function getinitialSummaryDataForMobile(checkListData) {

    let UniqueLevelNames = GetUniqueLevelNames(checkListData)
    let principledata;
    let chartPrincipleName = []
    var SummaryData = []
    UniqueLevelNames.map((levelmapvalue, index) => {

        var leveldetailsobj = {}
        leveldetailsobj.levelName = levelmapvalue

        let leveldetails = checkListData.filter(item => item.levelName === levelmapvalue)
        let uniquePrincipleName = GetUniquePrincipleNames(leveldetails);
        let uniqueRequirementName = GetUniqueRequirementNames(leveldetails);

        var principleDataArray = []
        var removeDupPrinci = '';
        uniquePrincipleName.map((unqPrinciple, index) => {
            let principledata = leveldetails.filter(item => item.levelName === levelmapvalue && item.principle == unqPrinciple)
            let principleId = GetUniquePrincipleId(unqPrinciple);
            var requirementArray = []
            var prinicipleNameObj = {}
            prinicipleNameObj.prinicipleName = unqPrinciple
            prinicipleNameObj.prinicipleId = principleId

            let RequirementdetailsForSummary = checkListData.filter(item => item.principle === unqPrinciple)

            RequirementdetailsForSummary.map((unqRequirement, index) => {

                var requirementNameObj = {}
                requirementNameObj.requirement = unqRequirement.requirement
                requirementNameObj.fullComplianceQ = unqRequirement.fullComplianceQ
                requirementNameObj.partialComplianceQ = unqRequirement.partialComplianceQ
                requirementNameObj.noComplianceQ = unqRequirement.noComplianceQ
                requirementNameObj.notAssessesQ = unqRequirement.notAssessesQ
                requirementNameObj.otherComments = unqRequirement.otherComments
                requirementNameObj.compliance = unqRequirement.compliance


                requirementArray.push(requirementNameObj)

            });
            prinicipleNameObj.requirement = requirementArray
            principleDataArray.push(prinicipleNameObj)

            leveldetailsobj.principleDetails = principleDataArray

        });

        SummaryData.push(leveldetailsobj)

    });
    return SummaryData;

}
function decorateFullComplianceCount(levelName, principleName, requirement) {

    requirement.map((item, index) => {
        let data1 = UniqueSummaryDataForMobile.filter(item => item.principle === principleName && item.levelName === levelName);
        fcCount = data1.reduce((a, b) => a + (parseInt(b['fullComplianceQ']) === 0 ? 0 : 1), 0);
    })

    return <span className="full-compliance">{fcCount}</span>

}
function decoratePartialComplianceCount(levelName, principleName, requirement) {

    requirement.map((item, index) => {
        let data2 = UniqueSummaryDataForMobile.filter(item => item.principle === principleName && item.levelName === levelName);

        pcCount = data2.reduce((a, b) => a + (parseInt(b['partialComplianceQ']) == 0 ? 0 : 1), 0);

    })
    return <span className="partial-compliance">{pcCount}</span>
}
function decorateNoComplianceCount(levelName, principleName, requirement) {

    requirement.map((item, index) => {
        let data2 = UniqueSummaryDataForMobile.filter(item => item.principle === principleName && item.levelName === levelName);

        ncCount = data2.reduce((a, b) => a + (parseInt(b['noComplianceQ']) == 0 ? 0 : 1), 0);
    })
    return <span className="no-compliance">{ncCount}</span>
}
function decorateNoAccessedComplianceCount(levelName, principleName, requirement) {

    requirement.map((item, index) => {
        let data2 = UniqueSummaryDataForMobile.filter(item => item.principle === principleName && item.levelName === levelName);

        naCount = data2.reduce((a, b) => a + (parseInt(b['notAssessesQ']) == 0 ? 0 : 1), 0);

    })
    return <span className="not-accessed">{naCount}</span>
}
function decorateMissingCount(principleName, requirement) {

    requirement.map((item, index) => {
        let count = UniqueSummaryDataForMobile.filter(item => item.principle === principleName).length;

        mcCount = count - (fcCount + ncCount + pcCount + naCount);
        mcCount = isNaN(mcCount) ? count : mcCount;

    })
    return < span className="missing" > {mcCount}</span >
}
function getScoreClass(score) {
    if (score <= 25)
        return 'leveld-score'
    else if (score > 25 && score <= 50)
        return 'levelc-score'
    else if (score > 50 && score <= 75)
        return 'levelb-score'
    else if (score > 75 && score <= 100)
        return 'levela-score'
    else
        return 'missing-score'

}
function decorateScoreCount() {

    mcCount > 0 ? val = '#N/A' : val = Math.floor((fcCount + (pcCount * 0.5)) / (fcCount + pcCount + ncCount) * 100).toString();
    let scoreClassName = ""
    scoreClassName = getScoreClass(val)

    return <span className={scoreClassName}>{val}</span>;
}

const GridTabs = (props) => {

    const map = {};
    let QuestionaireTabArray = [];
    let ElementsTabArray = [];
    let SummaryTabArray = [];
    let UniqueQuestionaireDataForMobile = [];
    let UniqueElementsDataForMobile = []


    if (props.id === "Question") {
        {/*Creating array for Questionaire Tab Devices*/ }
        QuestionaireTabArray = props.CheckListSummary?.map(({ elementsName, elementsCompliance, fullCompliance, noCompliance, partialCompliance, notAssesses, ...remainingAttrs }) => remainingAttrs);
        if (QuestionaireTabArray != null) {
            QuestionaireTabArray.forEach(el => {
                if (!map[JSON.stringify(el)]) {
                    map[JSON.stringify(el)] = true;
                    UniqueQuestionaireDataForMobile.push(el);
                }
            });
            QuestionaireData = getinitialQuestionaireDataForMobile(UniqueQuestionaireDataForMobile);

        }
    }
    if (props.id === "Elements") {
        {/*Creating array for Elements Tab Devices*/ }
        ElementsTabArray = props.CheckListSummary?.map(({ levelId, levelCode, levelName, fullComplianceQ, noComplianceQ, partialComplianceQ, notAssessesQ, otherComments, ...remainingAttrs }) => remainingAttrs);
        if (ElementsTabArray != null) {
            ElementsTabArray.forEach(el => {
                if (!map[JSON.stringify(el)]) {
                    map[JSON.stringify(el)] = true;
                    UniqueElementsDataForMobile.push(el);
                }
            });
            ElementsData = getinitialElementsDataForMobile(UniqueElementsDataForMobile);

        }
    }

    if (props.id === "Summary") {
        {/*Creating array for Questionaire Tab Devices*/ }

        if (UniqueSummaryDataForMobile.length > 0) { UniqueSummaryDataForMobile = [] }
        SummaryTabArray = props.CheckListSummary?.map(({ elementsName, elementsCompliance, fullCompliance, noCompliance, partialCompliance, notAssesses, ...remainingAttrs }) => remainingAttrs);
        if (SummaryTabArray != null) {
            SummaryTabArray.forEach(el => {
                if (!map[JSON.stringify(el)]) {
                    map[JSON.stringify(el)] = true;
                    UniqueSummaryDataForMobile.push(el);
                }
            });

            SummaryData = getinitialSummaryDataForMobile(UniqueSummaryDataForMobile);

        }
    }
    function ElementsDone(SelectedReq) {
        let doneCheck = props.ForElementsView.filter(item => {
            if (item.requirement === SelectedReq) {
                if (item.fullCompliance == "0") {
                    return item;
                }
            }
        });
        return doneCheck;
    }
    function selectRowForModal(requirement) {

        let uniqueRowforModal = []

        uniqueRowforModal = props.CheckListSummary.filter((item) => item.requirement === requirement)

        props.setModal1Visible(true, uniqueRowforModal[0]);

    }
    function handleDropdownChange(e, requirement) {

        let uniqueRowDropDownChange = props.CheckListSummary.filter((item) => item.requirement === requirement)


        props.handleChange(e, uniqueRowDropDownChange[0])
    }

    function handleElementsDropdownChange(e, elementsName) {
        let uniqueElementsRowDropDownChange = props.CheckListSummary.filter((item) => item.elementsName === elementsName)

        props.handlePriincipledDropdown(e, uniqueElementsRowDropDownChange[0])
    }
    function selectRowForModalForElements(elementsName) {

        let uniqueRowforModal = []

        uniqueRowforModal = props.CheckListSummary.filter((item) => item.elementsName === elementsName)

        props.setModal3Visible(true, uniqueRowforModal[0]);

    }
    return (
        props.id === "Question" ?
            QuestionaireData != null && QuestionaireData.map((x, index) => {

                var counter = x.principleDetails.length;
                var i = 0;
                var Check;
                return (
                    <Collapse accordion key={index}
                        bordered={false}
                        expandIcon={({ isActive }) => isActive ? < MinusOutlined /> : < PlusOutlined />}
                        expandIconPosition={'right'}
                        // activeKey={props.state.elementsActiveKey}
                        onChange={props.handleQuestionaireCollapseChange}
                        forceRender={true}
                        defaultActiveKey={['0']}
                    >
                        <Fragment key={index + 1}><Panel header={<span><span className="fw-600 mr-10">{x.levelName.substring(0, 7)}</span>{x.levelName.substring(8, x.levelName.length)}</span>} id={props.id}>
                            {x.principleDetails.map((item1, index) => {
                                return (
                                    <div>
                                        <Row gutter={8} className="mb-10">
                                            <Col className="gutter-row" xs={8} sm={6}><b>Principle</b></Col>
                                            <Col className="gutter-row" xs={16} sm={18}>{<span><span className="fw-600">{item1.prinicipleName.substring(0, 2)}</span>{item1.prinicipleName.substring(3, item1.prinicipleName.length)}</span>}</Col>
                                        </Row>
                                        {item1.requirement.map((item, index) => {
                                            return (
                                                <>
                                                    <Row gutter={8} className="mb-10">
                                                        <Col className="gutter-row" xs={8} sm={6}><b>Requirement</b></Col>
                                                        <Col className="gutter-row" xs={16} sm={18}>{<span><span className="fw-600">{item.requirement.substring(0, 3)}</span>{item.requirement.substring(4, item.requirement.length)}</span>}</Col>
                                                    </Row>

                                                    <Row gutter={8} className="mb-10">
                                                        <Col className="gutter-row" xs={8} sm={6}><b>Elements</b></Col>
                                                        <Col className="gutter-row" xs={16} sm={18}><React.Fragment><Space>{Check = ElementsDone(item.requirement)?.length <= 0 ? <label>Done</label> : 'Pending'}<a onClick={() => props.onElementView(item1.prinicipleId, item.requirement)}> View</ a></Space></React.Fragment></Col>
                                                    </Row>
                                                    <Row gutter={8} className="mb-10">
                                                        <Col className="gutter-row" xs={8} sm={6}><b>Compliance</b></Col>
                                                        <Col className="gutter-row" xs={16} sm={18}>
                                                            <div><Select dropdownClassName="questionnaire-compliance-dropdown" value={item.compliance == "0" ? '' : item.compliance}
                                                                onChange={(e) => handleDropdownChange(e, item.requirement)} style={{ width: '180px', height: '32px' }} key="QuestionaireTabSelect"
                                                                className={item.compliance === 1 ? `fullCompliance` : item.compliance === 2 ? 'partialComplicance' : item.compliance === 3 ? 'noComplicance' : item.compliance === 4 ? 'notassessed' : 'null'}>
                                                                {props.ComplianceData != null && props.ComplianceData?.map((item, index) => {

                                                                    if (item.id !== 5) {
                                                                        return < Option key={index} value={item.id}  ><span className={item.id == 1 ? 'ant-badge-status-dot ant-badge-status-success' : item.id === 2 ? 'ant-badge-status-dot ant-badge-status-warning' : item.id === 3 ? 'ant-badge-status-dot ant-badge-status-error' : item.id === 4 ? 'ant-badge-status-dot ant-badge-status-default' : null}></span> {item.complianceName}</Option>
                                                                    }
                                                                })}</Select></div>
                                                        </Col>
                                                    </Row>
                                                    <Row gutter={8} className="mb-10">
                                                        <Col className="gutter-row" xs={8} sm={6}><b>strengths, weaknesses, comments</b></Col>
                                                        <Col className="gutter-row" xs={16} sm={18}><Input placeholder="Type here" value={item.otherComments} onClick={() => selectRowForModal(item.requirement)} /></Col>
                                                    </Row>
                                                    <hr />
                                                </>
                                            );
                                        })
                                        }

                                    </div>
                                );
                            })
                            }

                        </Panel></Fragment></Collapse>);
            })
            :
            props.id === "Elements" ?
                ElementsData != null && ElementsData.map((x, index) => {

                    var i = 0;

                    var Check;
                    return (
                        <Collapse accordion key={index}
                            bordered={false}
                            expandIcon={({ isActive }) => isActive ? < MinusOutlined /> : < PlusOutlined />}
                            expandIconPosition={'right'}
                            //activeKey={props.getElementActiveKeyForMobile}
                            onChange={props.handleCollapseChange}
                            forceRender={true}
                            defaultActiveKey={['0']}
                        >
                            <Fragment key={index + 1}><Panel header={<span><span className="fw-600">{x.principle.substring(0, 2)}</span>{x.principle.substring(3, x.principle.length)}</span>} id={props.id}>
                                {x.requirementDetails.map((Reqitem, index) => {
                                    return (
                                        <div>
                                            <Row gutter={8} className="mb-10">
                                                <Col className="gutter-row" xs={8} sm={6}><b>Requirement</b></Col>
                                                <Col className="gutter-row" xs={16} sm={18}>{<span><span className="fw-600">{Reqitem.requirement.substring(0, 3)}</span>{Reqitem.requirement.substring(4, Reqitem.requirement.length)}</span>}</Col>
                                            </Row>

                                            {Reqitem.elements.map((elementItem, index) => {
                                                return (
                                                    <>
                                                        <Row gutter={8} className="mb-10">
                                                            <Col className="gutter-row" xs={8} sm={6}><b>Elements</b></Col>
                                                            <Col className="gutter-row" xs={16} sm={18}>{elementItem.elementsName}</Col>
                                                        </Row>
                                                        <Row gutter={8} className="mb-10">
                                                            <Col className="gutter-row" xs={8} sm={6}><b>Compliance</b></Col>
                                                            <Col className="gutter-row" xs={16} sm={18}>
                                                                <div>
                                                                    <Select dropdownClassName="questionnaire-compliance-dropdown" onChange={(e) => handleElementsDropdownChange(e, elementItem.elementsName)} style={{ width: '180px', height: '32px' }} key="EleTabComSelect"
                                                                        className={elementItem.fullCompliance === 1 ? `fullCompliance` : elementItem.partialCompliance === 2 ? 'partialComplicance' : elementItem.noCompliance === 3 ? 'noComplicance' : elementItem.notAssesses === 5 ? 'notassessed' : 'null'}
                                                                        value={elementItem.fullCompliance === 1 ? 1 : elementItem.partialCompliance === 2 ? 2 : elementItem.noCompliance === 3 ? 3 : elementItem.notAssesses === 5 ? 5 : ''}>
                                                                        {props.ComplianceData != null && props.ComplianceData?.map((item, index) => {
                                                                            if (item.id !== 4) {
                                                                                return < Option key={index} value={item.id} > <span className={item.id == 1 ? 'ant-badge-status-dot ant-badge-status-success' : item.id === 2 ? 'ant-badge-status-dot ant-badge-status-warning' : item.id === 3 ? 'ant-badge-status-dot ant-badge-status-error' : item.id === 5 ? 'ant-badge-status-dot ant-badge-status-default' : null}></span> {item.complianceName}</Option>
                                                                            }
                                                                        })}</Select></div>
                                                            </Col>
                                                        </Row>
                                                        <Row gutter={8} className="mb-10">
                                                            <Col className="gutter-row" xs={8} sm={6}><b>Add Comments</b></Col>
                                                            <Col className="gutter-row" xs={16} sm={18}><Input placeholder="Add Comments" value={elementItem.principleComments} onClick={() => selectRowForModalForElements(elementItem.elementsName)} /></Col>
                                                        </Row>
                                                        <hr />
                                                    </>
                                                )
                                            })
                                            }                                           
                                        </div>
                                    );
                                })
                                }
                            </Panel></Fragment></Collapse>);
                    i++;
                })
                :
                SummaryData != null && SummaryData.map((x, index) => {
                    var counter = x.principleDetails.length;
                    var i = 0;
                    var Check;
                    return (
                        <Collapse key={'col2'}
                            bordered={false}

                            forceRender={true}
                            defaultActiveKey={['0']}
                        >
                            <Fragment key={i}><Panel header={x.levelName}  id={props.id} showArrow={false}>
                                {x.principleDetails.map((item1, index) => {
                                    return (
                                        <div>
                                            <Row gutter={8} className="mb-10">
                                                <Col className="gutter-row" xs={8} sm={6}><b>Principle</b></Col>
                                                <Col className="gutter-row" xs={16} sm={18}>{item1.prinicipleName}</Col>
                                            </Row>
                                            <>
                                                <Row gutter={8} className="mb-10">
                                                    <Col className="gutter-row" xs={8} sm={6}><b><span className="full-compliance">Full</span></b></Col>
                                                    <Col className="gutter-row" xs={16} sm={18}>{decorateFullComplianceCount(x.levelName, item1.prinicipleName, item1.requirement)}</Col>
                                                </Row>
                                                <Row gutter={8} className="mb-10">
                                                    <Col className="gutter-row" xs={8} sm={6}><b><span className="partial-compliance">Partial</span></b></Col>
                                                    <Col className="gutter-row" xs={16} sm={18}>{decoratePartialComplianceCount(x.levelName, item1.prinicipleName, item1.requirement)}</Col>
                                                </Row>
                                                <Row gutter={8} className="mb-10">
                                                    <Col className="gutter-row" xs={8} sm={6}><b><span className="no-compliance">No</span></b></Col>
                                                    <Col className="gutter-row" xs={16} sm={18}>{decorateNoComplianceCount(x.levelName, item1.prinicipleName, item1.requirement)}</Col>
                                                </Row>
                                                <Row gutter={8} className="mb-10">
                                                    <Col className="gutter-row" xs={8} sm={6}><b><span className="not-accessed">Not Assessed</span></b></Col>
                                                    <Col className="gutter-row" xs={16} sm={18}>{decorateNoAccessedComplianceCount(x.levelName, item1.prinicipleName, item1.requirement)}</Col>
                                                </Row>
                                                <Row gutter={8} className="mb-10">
                                                    <Col className="gutter-row" xs={8} sm={6}><b><span className="missing">Missing</span></b></Col>
                                                    <Col className="gutter-row" xs={16} sm={18}>{decorateMissingCount(item1.prinicipleName, item1.requirement)}</Col>
                                                </Row>
                                                <Row gutter={8} className="mb-10">
                                                    <Col className="gutter-row" xs={8} sm={6}><b>Score</b></Col>
                                                    <Col className="gutter-row" xs={16} sm={18}>{decorateScoreCount()}</Col>
                                                </Row>
                                                <hr />
                                            </>                                           
                                        </div>
                                    );
                                })
                                }

                            </Panel></Fragment></Collapse>);

                })
    );
}

export default GridTabs;
