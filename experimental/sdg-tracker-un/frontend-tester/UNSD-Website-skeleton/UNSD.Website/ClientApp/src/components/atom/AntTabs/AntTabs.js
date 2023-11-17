import React, { Fragment } from 'react';
import Icon, { MinusOutlined, PlusOutlined, RightOutlined } from '@ant-design/icons';
import { Button, Col, Collapse, Image, Input, Layout, Modal, notification, Row, Select, Table, Tabs } from 'antd';
import 'antd/dist/antd.css';
import domtoimage from 'dom-to-image';
import jsPDF from 'jspdf';
import _ from 'lodash';
import { GetDraft, SaveDraft } from '../../../services/NQAF/ChecklistService';
import CommonUtilities from '../../NQAF/CommonUtilities';
import Summary from '../../molecule/NQAF/Summary.js';
import ElementstobeassuredInfo from '../../NQAF/ElementstobeassuredInfo';
import Introduction from '../../NQAF/Introduction';
import QuestionnaireInfo from '../../NQAF/QuestionnaireInfo';
import GridTabs from '../Grid/Grid';

//import { isMobile } from 'react-device-detect';

const { Header, Content } = Layout;
const CloseIconDarkSvg = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="59.689" height="19" viewBox="0 0 59.689 19">
        <g id="Group_14385" data-name="Group 14385" transform="translate(-1000.311 -153)">
            <g id="Icon_ionic-ios-close-circle-outline" data-name="Icon ionic-ios-close-circle-outline" transform="translate(996.936 150.625)">
                <path id="Path_3144" data-name="Path 3144" d="M18.692,17.77l-2.146-2.146,2.146-2.146a.651.651,0,0,0-.92-.92L15.626,14.7,13.48,12.558a.651.651,0,1,0-.92.92l2.146,2.146L12.56,17.77a.629.629,0,0,0,0,.92.646.646,0,0,0,.92,0l2.146-2.146,2.146,2.146a.654.654,0,0,0,.92,0A.646.646,0,0,0,18.692,17.77Z" transform="translate(-3.781 -3.779)" fill="#4d4d4d" />
                <path id="Path_3145" data-name="Path 3145" d="M11.845,4.515A7.327,7.327,0,1,1,6.661,6.661a7.281,7.281,0,0,1,5.184-2.146m0-1.14a8.47,8.47,0,1,0,8.47,8.47,8.468,8.468,0,0,0-8.47-8.47Z" fill="#4d4d4d" />
            </g>

        </g>
    </svg>
);

const CloseIconSvg = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="59.689" height="19" viewBox="0 0 59.689 19">
        <g id="Group_14386" data-name="Group 14386" transform="translate(-889 -165)">
            <g id="Icon_ionic-ios-close-circle-outline" data-name="Icon ionic-ios-close-circle-outline" transform="translate(885.625 162.625)">
                <path id="Path_3144" data-name="Path 3144" d="M18.692,17.77l-2.146-2.146,2.146-2.146a.651.651,0,0,0-.92-.92L15.626,14.7,13.48,12.558a.651.651,0,1,0-.92.92l2.146,2.146L12.56,17.77a.629.629,0,0,0,0,.92.646.646,0,0,0,.92,0l2.146-2.146,2.146,2.146a.654.654,0,0,0,.92,0A.646.646,0,0,0,18.692,17.77Z" transform="translate(-3.781 -3.779)" fill="#fff" />
                <path id="Path_3145" data-name="Path 3145" d="M11.845,4.515A7.327,7.327,0,1,1,6.661,6.661a7.281,7.281,0,0,1,5.184-2.146m0-1.14a8.47,8.47,0,1,0,8.47,8.47,8.468,8.468,0,0,0-8.47-8.47Z" fill="#fff" />
            </g>
            <text id="Close" transform="translate(912.689 180)" fill="#fff" font-size="14" font-family="Roboto-Regular, Roboto"><tspan x="0" y="0">Close</tspan></text>
        </g>
    </svg>
);
const CloseIconDark = props => <Icon component={CloseIconDarkSvg} {...props} />;
const CloseIcon = props => <Icon component={CloseIconSvg} {...props} />;


var width = window.innerWidth;
const isMobile = width <= 500;



const { Panel } = Collapse;
const { Option } = Select;
const { TabPane } = Tabs;
const { TextArea } = Input;
const distinctRequirements = (value, index, self) => {
    return self.indexOf(value) === index;
}


let count = 0;
let culc = 0;

let fillterArray = {};
let fillterQuestionArray = {};

export default class AntTabs extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            filteredInfo: null,
            sortedInfo: null,
            activeTab: "Introduction",
            rowData: [],
            visible: false,
            activePanel: "0",
            rowData: [],
            modal1Visible: false,
            modal2Visible: false,
            modal3Visible: false,
            ddlValue: 0,
            CheckList: null,
            modifyCheckList: null,
            currentRow: null,
            textAreaValue: null,
            principleCheckList: null,
            principleLength: 0,
            principleProgress: 0,
            requirementList: [],
            samarryList: [],
            percentage: 0,
            requirementLength: 0,
            persentageReq: 0,

            requirementLength: 0,
            requirementProgress: 0,
            saveStatus: false,
            email: null,
            Reterival: false,
            saveProgress: false,
            loading: false,
            elementsActiveKey: 1,
            elementsActiveKey_1: 1,
            selrequirementName: '',
            QuestionpanelSelected: 0,
            ElementpanelSelected: 0,


            showEmailModel: false,
            email: null,
            error: null,
            save: true,
            lastDraft: null,
            createdDate: null,
            savedDraft: null,
            modalVisible: false,
            status: false,
        };
        this.modalInpuField1 = React.createRef();
        this.modalInpuField2 = React.createRef();
    }
    setModal2Visible = (modal2Visible) => {

        this.setState({ modal2Visible: modal2Visible });
    }
    componentDidUpdate(prevProps, prevState) {

        let tdelement = document.querySelectorAll("#rc-tabs-0-panel-ChecklistQuestionaire  div.ant-collapse-content-active table td.ant-table-cell");
        if (tdelement.length > 0) {
            tdelement.forEach((v, i) => {
                if (v.outerHTML.includes('ant-badge-status-dotant-badge-status-dot')) {
                    v.outerHTML.replace('ant-badge-status-dotant-badge-status-dot', '')
                }
            })
        }


        if (this.props.actualData?.length > 0 && this.state.CheckList == null) {

            var obj = {};
            let modifyReq = []

            var principleObj = {};
            let modifyPrincipleObj = []

            for (var i = 0, len = this.props.actualData.length; i < len; i++)
                obj[this.props.actualData[i]['requirement']] = this.props.actualData[i];

            for (var i = 0, len = this.props.actualData.length; i < len; i++)
                principleObj[this.props.actualData[i]['principle']] = this.props.actualData[i];

            for (var key in obj)
                modifyReq.push(obj[key]);

            for (var key in principleObj)
                modifyPrincipleObj.push(principleObj[key]);

            this.setState({
                CheckList: this.props.actualData,
                modifyCheckList: this.props.ChecklistData, principleCheckList: _.groupBy(this.props.actualData,
                    'principle'), principleLength: modifyReq?.length,
                requirementList: modifyReq,
                requirementLength: modifyPrincipleObj?.length,
                QuestionaireUpdate: this.props.actualData,
                ElementsUpdate: this.props.actualData

            })


        }

        if ((prevState.selrequirementName != this.state.selrequirementName)) {


            let tdelement = document.querySelectorAll("#rc-tabs-0-panel-ElementsToBeAssured div.ant-collapse-content-active table td.ant-table-cell");

            tdelement.forEach((v, i) => {

                if (String(v.innerText).substring(0, String(v.innerText).indexOf(" ")).trim() == this.state.selrequirementName.substring(0, this.state.selrequirementName.indexOf(" ")).trim()) {

                    var position = v.getBoundingClientRect();
                    var x = position.left;
                    var y = position.top;
                    window.scrollBy(x, y, 'smooth');
                }

            })

            this.selectInactive();

        }
    }

    selectInactive = () => {

        window.requestAnimationFrame(function () {

            let a = document.querySelectorAll("#rc-tabs-0-panel-ElementsToBeAssured div.ant-collapse-content ant-collapse-content-inactive");

            a.forEach((v, i) => {

                if (String(v.innerText).substring(0, String(v.innerText).indexOf(" ")).trim() == this.state.selrequirementName.substring(0, this.state.selrequirementName.indexOf(" ")).trim()) {

                    var position = v.getBoundingClientRect();
                    var x = position.left;
                    var y = position.top;

                    window.scrollBy(x, y, 'smooth');

                }

            })
        });
    }

    handleProgressbar = (data) => {

        var obj = {};
        let modifyReq = []

        for (var i = 0, len = data.length; i < len; i++)
            obj[data[i]['requirement']] = data[i];


        for (var key in obj)
            modifyReq.push(obj[key]);


        let updateSubmited = modifyReq.filter(item => {
            if (item.compliance !== "0")
                return item;
        })

        let percentage = Math.round(100 / modifyReq.length * updateSubmited.length)
        this.setState({ principleProgress: updateSubmited?.length, percentage: percentage })

    }

    showEmailModel = (type) => {

        if (type === 'ret') {
            this.setState({ saveStatus: true, Reterival: true, saveProgress: false, email: '', save: false, status: false, createdDate: null })

        } else {
            this.setState({ saveStatus: true, Reterival: false, save: true, status: false, createdDate: null, email: null })

        }
    }
    toggleEmailModel = () => {


        this.setState({ saveStatus: false })

    }
    handleDraftSaveChange = (e) => {

        this.setState({ email: e.target.value })

    }
    saveDraft = async (type) => {

        let saveDatafor = this.state.activeTab == "ElementsToBeAssured" ? "Elements" : "Questionaire";
        this.setState({ loading: true })
        if (this.state.email !== null)


            if (type === 'ret') {

                await GetDraft(this.state.email, saveDatafor).then((item) => {

                    let modifydata = JSON.parse(item?.data?.userData)

                    if (saveDatafor == "Elements") {
                        this.handlePriincipleProgress(modifydata)
                        this.setState({
                            saveStatus: false,
                            saveProgress: false, loading: false, CheckList: modifydata,
                            principleCheckList: _.groupBy(modifydata, 'principle'),
                            ElementsUpdate: modifydata,
                            status: false, createdDate: null, email: null
                        })
                    }
                    else {
                        this.handleProgressbar(modifydata)
                        this.setState({
                            saveStatus: false,
                            saveProgress: false, loading: false, CheckList: modifydata,
                            modifyCheckList: _.groupBy(modifydata, 'levelName'),
                            QuestionaireUpdate: modifydata,
                            status: false, createdDate: null, email: null

                        })

                    }


                });

            } else {
                let formdata = {
                    "emailId": this.state.email,
                    "userData": saveDatafor == "Questionaire" ? JSON.stringify(this.state.QuestionaireUpdate) : JSON.stringify(this.state.ElementsUpdate),
                    "type": saveDatafor
                }

                let result = await SaveDraft(formdata);

                if (result) {
                    this.setState({ saveProgress: true, loading: false, saveStatus: false })

                    this.openNotificationWithIcon('success', 'Draft saved successfully!')
                }
                this.setState({ saveProgress: false })
            }

    }

    setModal3Visible(modal3Visible, row) {
        if (row != void 0) {
            this.setState({ textElementsComments: row.principleComments })
        }

        this.setState({ modal3Visible, currentRow: row });
    }
    setModal1Visible(modal1Visible, row) {
        if (row != void 0) {
            this.setState({ textAreaValue: row.otherComments })
        }
        this.setState({ modal1Visible, currentRow: row });
    }

    setModal1VisibleForMobile = (modal1Visible, row) => {

        this.setState({ textAreaValue: row.otherComments })
        this.setState({ modal1Visible })
        this.setState({ currentRow: row });
    }
    setModal3VisibleForMobile = (modal3Visible, row) => {

        this.setState({ textElementsComments: row.principleComments })
        this.setState({ modal3Visible })
        this.setState({ currentRow: row });
    }
    handleChange = (e, row) => {

        let commonElementsCheklist = this.state.CheckList.map(x => {
            if (x.requirement == row.requirement) {
                if (e === 1) {
                    return { ...x, fullComplianceQ: e, partialComplianceQ: 0, noComplianceQ: 0, notAssessesQ: 0, compliance: e }
                } else if (e === 2) {
                    return { ...x, partialComplianceQ: e, fullComplianceQ: 0, noComplianceQ: 0, notAssessesQ: 0, compliance: e }

                } else if (e === 3) {
                    return { ...x, noComplianceQ: e, partialComplianceQ: 0, fullComplianceQ: 0, notAssessesQ: 0, compliance: e }

                } else if (e === 4) {
                    return { ...x, notAssessesQ: e, noComplianceQ: 0, partialComplianceQ: 0, fullComplianceQ: 0, compliance: e }

                }

            }
            return x;
        })


        let questionaireElements = this.state.QuestionaireUpdate.map(x => {
            if (x.requirement == row.requirement) {
                if (e === 1) {
                    return { ...x, fullComplianceQ: e, partialComplianceQ: 0, noComplianceQ: 0, notAssessesQ: 0, compliance: e }
                } else if (e === 2) {
                    return { ...x, partialComplianceQ: e, fullComplianceQ: 0, noComplianceQ: 0, notAssessesQ: 0, compliance: e }

                } else if (e === 3) {
                    return { ...x, noComplianceQ: e, partialComplianceQ: 0, fullComplianceQ: 0, notAssessesQ: 0, compliance: e }

                } else if (e === 4) {
                    return { ...x, notAssessesQ: e, noComplianceQ: 0, partialComplianceQ: 0, fullComplianceQ: 0, compliance: e }

                }

            }
            return x;
        });



        this.handleProgressbar(questionaireElements)


        this.setState({ CheckList: commonElementsCheklist, QuestionaireUpdate: questionaireElements, modifyCheckList: _.groupBy(questionaireElements, 'levelName') })
    };

    handlePriincipledDropdown = (e, row) => {

        let commonElementsCheklist = this.state.CheckList.map(x => {
            if (x.elementsName == row.elementsName) {
                if (e === 1) {
                    return { ...x, fullCompliance: e, partialCompliance: "0", noCompliance: "0", notAssesses: "0", elementsCompliance: e }
                } else if (e === 2) {
                    return { ...x, partialCompliance: e, fullCompliance: "0", noCompliance: "0", notAssesses: "0", elementsCompliance: e }

                } else if (e === 3) {
                    return { ...x, noCompliance: e, fullCompliance: "0", partialCompliance: "0", notAssesses: "0", elementsCompliance: e }

                } else if (e === 5) {
                    return { ...x, notAssesses: e, fullCompliance: "0", partialCompliance: "0", noCompliance: "0", elementsCompliance: e }

                }
            }

            return x;
        })

        let commonElements = this.state.ElementsUpdate.map(x => {
            if (x.elementsName == row.elementsName) {
                if (e === 1) {
                    return { ...x, fullCompliance: e, partialCompliance: "0", noCompliance: "0", notAssesses: "0", elementsCompliance: e }
                } else if (e === 2) {
                    return { ...x, partialCompliance: e, fullCompliance: "0", noCompliance: "0", notAssesses: "0", elementsCompliance: e }

                } else if (e === 3) {
                    return { ...x, noCompliance: e, fullCompliance: "0", partialCompliance: "0", notAssesses: "0", elementsCompliance: e }

                } else if (e === 5) {
                    return { ...x, notAssesses: e, fullCompliance: "0", partialCompliance: "0", noCompliance: "0", elementsCompliance: e }

                }
            }

            return x;
        })




        var obj = {};
        let modifyReq = []




        this.setState({ CheckList: commonElementsCheklist, ElementsUpdate: commonElements, principleCheckList: _.groupBy(commonElements, 'principle') })

        this.handlePriincipleProgress(commonElements);

    }

    handlePriincipleProgress(commonElements) {
        let updateSubmited = commonElements?.filter(item => {
            if (item.fullCompliance !== "0" || item.partialCompliance !== "0" || item.noCompliance !== "0" || item.notAssesses !== "0") {
                return item;

            }
        })

        let persentage = Math.round(100 / this.state.ElementsUpdate?.length * updateSubmited?.length)
        this.setState({ requirementProgress: updateSubmited?.length, persentageReq: persentage })

    }
    onHandleTextAreaChange = () => {

        let commonElements = this.state.QuestionaireUpdate.map(x => {
            if (x.requirement == this.state.currentRow.requirement) {
                return { ...x, otherComments: this.getmodal1TextAreaValue() }
            }
            return x;
        })



        let commonElementsCheklist = this.state.CheckList.map(x => {
            if (x.requirement == this.state.currentRow.requirement) {
                return { ...x, otherComments: this.getmodal1TextAreaValue() }
            }
            return x;
        })
        this.setState({ CheckList: commonElementsCheklist, QuestionaireUpdate: commonElements, modifyCheckList: _.groupBy(commonElements, 'levelName'), textAreaValue: this.getmodal1TextAreaValue() }, () => { this.setModal1Visible(false); });
    }
    onHandlePrincipleTextAreaChange = () => {

        let commonElementsCheklist = this.state.CheckList.map(x => {
            if (x.elementsName == this.state.currentRow.elementsName) {
                return { ...x, principleComments: this.getmodal2TextAreaValue() }
            }
            return x;
        })
        let commonElements = this.state.ElementsUpdate.map(x => {
            if (x.elementsName == this.state.currentRow.elementsName) {
                return { ...x, principleComments: this.getmodal2TextAreaValue() }
            }
            return x;
        })

        this.setState({ CheckList: commonElementsCheklist, ElementsUpdate: commonElements, principleCheckList: _.groupBy(commonElements, 'principle'), textElementsComments: this.getmodal2TextAreaValue() }, () => { this.setModal3Visible(false) });

    }

    OnClickViewForMobile = () => {

        let tdelement = document.querySelectorAll("#rc-tabs-0-panel-ElementsToBeAssured div.ant-collapse-content-active table td.ant-table-cell");

        tdelement.forEach((v, i) => {

            if (String(v.innerText).substring(0, String(v.innerText).indexOf(" ")).trim() == this.state.selrequirementName.substring(0, this.state.selrequirementName.indexOf(" ")).trim()) {

                var position = v.getBoundingClientRect();
                var x = position.left;

                var y = position.top;

                window.scrollBy(x, y, 'smooth');

            }

        })

        this.selectInactive();


    }

    onElementView = (selprincipleId, selrequirementName) => {

        this.setState({ selrequirementName: selrequirementName })
        this.changeTab("ElementsToBeAssured");

        this.setState({ elementsActiveKey: selprincipleId })

        this.setElements();

        if (isMobile) {
            this.OnClickViewForMobile()
        }
    }
    handleCollapseChange = (val) => {
        this.setState({ elementsActiveKey: val })

        let tdelement = document.querySelectorAll("#rc-tabs-0-panel-ElementsToBeAssured div.ant-collapse-content-active ");

        if (tdelement.length != 0 && this.state.ElementpanelSelected < 0) {
            var position = tdelement[0].getBoundingClientRect();
            var x = position.left;
            var y = position.top;

            window.scrollBy(x, y, 'smooth');
        }
        if (this.state.ElementpanelSelected > parseInt(val) || (this.state.ElementpanelSelected < 10 && parseInt(val) >= 10)) {
            let tbleClickElement = document.querySelectorAll("#rc-tabs-0-panel-ElementsToBeAssured div.ant-collapse-content ant-collapse-content-inactive");
            if (tbleClickElement.length != 0) {
                var position = tbleClickElement[0].getBoundingClientRect();
                var x = position.left;
                var y = position.top;

                window.scrollBy(x, y, 'smooth');
            }

        }

        else {
            if (tdelement.length != 0) {
                var position = tdelement[0].getBoundingClientRect();
                var x = position.left;
                var y = position.top;

                window.scrollBy(x, y, 'smooth');
            }

        }
        this.setState({ ElementpanelSelected: val });


    }
    handleQuestionaireCollapseChange = (val) => {

        let tbleQuestion = document.querySelectorAll("#rc-tabs-0-panel-ChecklistQuestionaire div.ant-collapse-content-active ");

        if (tbleQuestion.length != 0 && this.state.QuestionpanelSelected < 0) {
            var position = tbleQuestion[0].getBoundingClientRect();
            var x = position.left;
            var y = position.top;

            window.scrollBy(x, y, 'smooth');
        }
        if (this.state.QuestionpanelSelected > val) {
            let tbleClickQuestion = document.querySelectorAll("#rc-tabs-0-panel-ChecklistQuestionaire div.ant-collapse-content-inactive");
            var position = tbleClickQuestion[0].getBoundingClientRect();
            var x = position.left;
            var y = position.top;

            window.scrollBy(x, y, 'smooth');
        }
        else {
            if (tbleQuestion.length != 0) {
                var position = tbleQuestion[0].getBoundingClientRect();
                var x = position.left;
                var y = position.top;

                window.scrollBy(x, y, 'smooth');

            }
        }
        this.setState({ QuestionpanelSelected: val });
        this.setQuestionnaire();
    }
    onQuestionaireTab = () => {
        this.changeTab("ChecklistQuestionaire");
        window.scrollTo(0, 0);
        this.setQuestionnaire();
    }

    changeTab = activeKey => {
        this.setState({
            activeTab: activeKey,

        });

    }
    showModal = () => {
        this.setState({
            visible: true,
        });
    }
    handleOk = (e) => {
        this.setState({
            visible: false,
        });
    }

    printDocument = (exportOn) => {

        let inputpdf;

        if (exportOn === 'exportQuestionire') {
            inputpdf = document.getElementById('Question');
        }
        if (exportOn === 'exportElement') {
            inputpdf = document.getElementById('Elements');
        }

        const pdf = new jsPDF('p', 'mm', 'a3');

        if (pdf) {
            domtoimage.toPng(inputpdf, { quality: 0.01 })
                .then(imgData => {
                    pdf.addImage(imgData, 'PNG', 0, 0, 300, 400);
                    pdf.save('Checklist.pdf');
                });
        }
    }

    handleQuestionnaireTableChange = (pagination, filters) => {

        if (filters.EleTabComplianceName == null) {
            this.setQuestionnaire();
        }
    }


    validation = (values) => {
        let error = false;
        const emailPattern = /(.+)@(.+){2,}\.(.+){2,}/;
        if (!emailPattern.test(values)) {
            this.setState({ status: false })

            return error = true;
        }

        return error;
    }

    GetStatusCheck = async (btnType, exportType) => {

        let getstatusOn = exportType == "ElementsToBeAssured" ? "Elements" : "Questionaire"
        const emailPattern = /(.+)@(.+){2,}\.(.+){2,}/;
        if (emailPattern.test(this.state.email)) {
            this.setState({ status: true })
            await GetDraft(this.state.email, getstatusOn).then((item) => {

                this.setState({ createdDate: item?.data != "" ? item?.data?.createdDate : null })

                if (item?.data == "" && btnType != "Get") {
                    this.setState({ status: false })
                    this.openNotificationWithIcon('success', 'Data not found.');
                }
            })
        }
        else {
            this.setState({ status: false })
        }



    }

    openNotificationWithIcon = (type, message) => {
        notification[type]({
            message: '',
            description:
                message,
        });
    };

    handleDoneButton = () => {


        if (!this.validation(this.state.email))
            if (this.state.Reterival) {

                return this.saveDraft('ret')

            } else {
                return this.saveDraft('')
            }
    }


    handleModalChange = (e) => {
        this.setState({ email: e.target.value, error: false })
        if (!this.validation(e.target.value)) {
            this.setState({ error: false })

            this.handleDraftSaveChange(e)
        } else {
            this.setState({ error: true })
        }
    }

    handleTableChange = (pagination, filters) => {
        if (filters.EleTabComplianceName == null) {
            this.setElements();
        }
    }

    setQuestionnaire = (data) => {
        fillterQuestionArray = {};
    }

    setElements = () => {
        fillterArray = {};
    }
    getmodal1TextAreaValue = () => {
        return this.modalInpuField1.current.resizableTextArea.textArea.value;
    }
    getmodal2TextAreaValue = () => {
        return this.modalInpuField2.current.resizableTextArea.textArea.value;
    }
    getQuestionaireRowRendering = (value, row, index, key) => {
        const obj = { children: value, props: {} };
        const levelId = row.levelId;
        let questionaireUpdate = this.state.QuestionaireUpdate?.filter(item => item.levelId === levelId);

        if (fillterQuestionArray && fillterQuestionArray[levelId] && fillterQuestionArray[levelId].length > 0) {
            questionaireUpdate = questionaireUpdate.filter(item => fillterQuestionArray[levelId].includes('' + item.compliance));
        }

        if (index >= 1 && questionaireUpdate && value === this.getValueByKey(questionaireUpdate[index - 1], key)) {
            obj.props.rowSpan = 0;
        } else {
            for (let i = 0; index + i !== questionaireUpdate.length && value === this.getValueByKey(questionaireUpdate[index + i], key); i += 1) {
                obj.props.rowSpan = i + 1;
            }
        }

        return obj;

    }

    getValueByKey = (obj, key) => {
        if (obj) {
            return obj[key];
        }
        return null;
    }

    render() {
        let { sortedInfo, filteredInfo, modifyCheckList, CheckList, principleCheckList, QuestionaireUpdate, ElementsUpdate } = this.state;

        sortedInfo = sortedInfo || {};
        filteredInfo = filteredInfo || {};

        let _this = this;
        let CheckListSummary = this.state.QuestionaireUpdate;
        const columns = [
            {
                title: "Principle",
                dataIndex: "principle",
                key: "Principle",
                width: '15%',
                render: (value, row, index) => {
                    return _this.getQuestionaireRowRendering(value, row, index, 'principle');
                }
            },
            {
                title: "Requirement",
                dataIndex: "requirement",
                key: "Requirement",
                ellipsis: false,
                width: '30%',
                render: (value, row, index) => {
                    return _this.getQuestionaireRowRendering(value, row, index, 'requirement');
                }
            },
            {
                title: 'Elements',
                dataIndex: 'requirement',
                key: 'EelementsName',
                width: '5%',
                className: "text-center",
                render: (value, row, index) => {

                    const doneCheck = ElementsUpdate.filter(item => {
                        if (item.requirement === row.requirement) {
                            if (item.fullCompliance == "0") {
                                return item;
                            }
                        }
                    });

                    const obj = _this.getQuestionaireRowRendering(value, row, index, 'requirement');
                    obj.children = <div className="text-center">{doneCheck?.length <= 0 ? <label>Done</label> : 'Pending'}<br /><a onClick={() => this.onElementView(row.principleId, row.requirement)}> View</ a></div>;

                    return obj;
                }
            },
            {
                title: 'Compliance',
                dataIndex: 'requirement',
                key: 'EelementsName',
                width: '5%',
                filters: [
                    { text: 'Blank', value: '0' },
                    { text: 'Full Compliance', value: '1' },
                    { text: 'Partial Compliance', value: '2' },
                    { text: 'No Compliance', value: '3' },
                    { text: 'Not Assessed', value: '4' }
                ],
                onFilter: (value, record) => {

                    let levelId = record.levelId;
                    if (fillterQuestionArray && !fillterQuestionArray[levelId]) {
                        fillterQuestionArray[levelId] = [];
                    }
                    if (!fillterQuestionArray[levelId].includes(value)) {
                        fillterQuestionArray[levelId].push(value);
                    }

                    return record.compliance == value ? true : false;
                },
                render: (value, row, index) => {

                    const obj = _this.getQuestionaireRowRendering(value, row, index, 'requirement');

                    obj.children = <div><Select dropdownClassName="questionnaire-compliance-dropdown" value={row.compliance == "0" ? '' : row.compliance}
                        onChange={(e) => this.handleChange(e, row)} style={{ width: '180px', height: '32px' }} key="QuestionaireTabSelect"
                        className={row.compliance === 1 ? `fullCompliance` : row.compliance === 2 ? 'partialComplicance' : row.compliance === 3 ? 'noComplicance' : row.compliance === 4 ? 'notassessed' : 'null'}>
                        {this.props.ComplianceData != null && this.props.ComplianceData?.map((item, index) => {

                            if (item.id !== 5) {
                                return < Option key={index} value={item.id}  ><span className={item.id == 1 ? 'ant-badge-status-dot ant-badge-status-success' : item.id === 2 ? 'ant-badge-status-dot ant-badge-status-warning' : item.id === 3 ? 'ant-badge-status-dot ant-badge-status-error' : item.id === 4 ? 'ant-badge-status-dot ant-badge-status-default' : null}></span> {item.complianceName}</Option>
                            }
                        })}</Select></div>;


                    return obj;


                }
            },
            {
                title: 'Specify strengths, weaknesses, other comments',
                dataIndex: 'requirement',
                key: 'Additional-Comments',
                width: '45%',
                render: (value, row, index) => {

                    const obj = _this.getQuestionaireRowRendering(value, row, index, 'requirement');
                    obj.children = <Input placeholder="Type here" value={row.otherComments} onClick={() => this.setModal1Visible(true, row)} />;
                    return obj;
                }

            }
        ];

        const ElementsTBAssured = [
            {
                title: 'Requirement',
                dataIndex: 'requirement',
                key: 'EleTabrequirementName',
                width: '20%',
                ellipsis: false,
                render: (value, row, index) => {

                    let obj = { children: value, props: {} };
                    let principleId = row.principleId;
                    let elementsUpdate = this.state.ElementsUpdate?.filter(item => item.principleId === principleId);

                    if (fillterArray && fillterArray[principleId] && fillterArray[principleId].length > 0) {
                        elementsUpdate = elementsUpdate.filter(item => fillterArray[principleId].includes('' + item.elementsCompliance));
                    }

                    if (index >= 1 && elementsUpdate && value === elementsUpdate[index - 1]?.requirement) {
                        obj.props.rowSpan = 0;
                    } else {
                        for (let i = 0; index + i !== elementsUpdate.length && value === elementsUpdate[index + i]?.requirement; i += 1) {
                            obj.props.rowSpan = i + 1;
                        }
                    }
                    return obj;
                }
            },
            {
                title: 'Elements to be Assured',
                dataIndex: 'elementsName',
                key: 'EleTabElementsName',
                width: '30%',
                ellipsis: false
            },
            {
                title: 'Compliance',
                dataIndex: 'complianceName',
                key: 'EleTabComplianceName',
                width: '20%',
                filters: [
                    { text: 'Blank', value: '0' },
                    { text: 'Full Compliance', value: '1' },
                    { text: 'Partial Compliance', value: '2' },
                    { text: 'No Compliance', value: '3' },
                    { text: 'Not Applicable', value: '5' }
                ],
                onFilter: (value, record) => {
                    let principleId = record.principleId;
                    if (fillterArray && !fillterArray[principleId]) {
                        fillterArray[principleId] = [];
                    }
                    if (!fillterArray[principleId].includes(value)) {
                        fillterArray[principleId].push(value);
                    }
                    return record.elementsCompliance == value ? true : false;
                },
                ellipsis: false,
                render: (value, row, index) =>

                    <div><Select dropdownClassName="questionnaire-compliance-dropdown" onChange={(e) => this.handlePriincipledDropdown(e, row)} style={{ width: '180px', height: '32px' }} key="EleTabComSelect"
                        className={row.fullCompliance === 1 ? `fullCompliance` : row.partialCompliance === 2 ? 'partialComplicance' : row.noCompliance === 3 ? 'noComplicance' : row.notAssesses === 5 ? 'notassessed' : 'null'}
                        value={row.fullCompliance === 1 ? 1 : row.partialCompliance === 2 ? 2 : row.noCompliance === 3 ? 3 : row.notAssesses === 5 ? 5 : ''}>
                        {this.props.ComplianceData != null && this.props.ComplianceData?.map((item, index) => {
                            if (item.id !== 4) {
                                return < Option key={index} value={item.id} > <span className={item.id == 1 ? 'ant-badge-status-dot ant-badge-status-success' : item.id === 2 ? 'ant-badge-status-dot ant-badge-status-warning' : item.id === 3 ? 'ant-badge-status-dot ant-badge-status-error' : item.id === 5 ? 'ant-badge-status-dot ant-badge-status-default' : null}></span> {item.complianceName}</Option>
                            }
                        })}</Select></div>
            },
            {
                title: 'Add comments',
                dataIndex: 'principleComments',
                key: 'EleTabAddComments',
                width: '30%',
                render: (value, row, index) => <Input type="text" value={value} placeholder="AddComments" onClick={() => this.setModal3Visible(true, row)} />,
                ellipsis: false
            }
        ];

        const selectionConfig = { selectedRowKeys: "4" }

        return (


            <Fragment>

                <Modal
                    centered
                    visible={this.state.modal2Visible}
                    onOk={() => this.setModal2Visible(false)}
                    onCancel={() => this.setModal2Visible(false)}
                    footer={false}
                    closeIcon={<CloseIconDark />}
                    width={700}
                    className="modal-for-degree-of-compliance"
                >
                    <h2 className="main-title">Degree of compliance</h2>
                    <div className="degree-of-compliance-wrap">
                        <p><strong>“Full compliance”</strong> with a requirement would mean that most applicable elements and all major applicable elements are fully (or in some cases partially) met and that there is only little room for improvement;</p>
                        <p><strong>“Partial compliance”</strong> with a requirement would mean that some but not all major applicable elements are fully or partially met, and that some major improvements are needed;</p>
                        <p><strong>“No compliance”</strong> with a requirement would mean that no major applicable elements are fully or partially met, and that urgent action is necessary.</p>
                        <p>An element can be scored as <strong>“Not applicable”</strong> and a justification might be included in the comment’s column. In such case the element would not be considered in the assessment and it would still be possible to score the requirement as fully compliant.</p>
                    </div>
                </Modal>
                {/* Modal for Questionnaire comments*/}
                <Modal
                    destroyOnClose={true}
                    title="Specify strengths, weaknesses, other comments"
                    centered
                    visible={this.state.modal1Visible}
                    onOk={() => this.setModal1Visible(false)}
                    onCancel={() => this.setModal1Visible(false)}
                    className="comments-modal-wrap nqaf-modalpopup"
                    footer={[
                        <Button type="primary" className="initiative-card_modal_footer_btn outline" shape="round" key="back" onClick={() => { this.onHandleTextAreaChange(); }}>
                            Done
                        </Button>,

                    ]}
                >
                    <TextArea autoFocus={true} defaultValue={this.state.textAreaValue} showCount maxLength={500} ref={this.modalInpuField1} />
                </Modal>


                {/* Modal for Elements to be assured comments*/}
                <Modal
                    title="Add Comments"
                    centered
                    visible={this.state.modal3Visible}
                    onOk={() => this.setModal3Visible(false)}
                    onCancel={() => this.setModal3Visible(false)}
                    destroyOnClose={true}

                    className="comments-modal-wrap nqaf-modalpopup"
                    footer={[
                        <Button type="primary" className="initiative-card_modal_footer_btn outline" shape="round" key="back" onClick={() => this.onHandlePrincipleTextAreaChange()}>
                            Done
                        </Button>,

                    ]}
                >
                    <TextArea showCount autoFocus={true} maxLength={500} defaultValue={this.state.textElementsComments} ref={this.modalInpuField2} />
                </Modal>

                <Tabs type="card" activeKey={this.state.activeTab} onChange={this.changeTab} onTabScroll="top" >
                    <TabPane tab="Introduction" key="Introduction">
                        <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                            <Col className="gutter-row" xs={24} sm={24} md={24} lg={24} xl={24}>
                                <Introduction onQuestionaireTab={this.onQuestionaireTab} />
                            </Col>
                        </Row>
                    </TabPane>
                    <TabPane tab="Questionnaire" key="ChecklistQuestionaire">
                        <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                            <Col className="gutter-row" xs={24} sm={24} md={24} lg={24} xl={24}>
                                <QuestionnaireInfo setModal2Visible={this.setModal2Visible} principleLength={this.state.principleLength} percentage={this.state.persentageReq} principleProgress={this.state.principleProgress} />
                                <CommonUtilities loading={this.state.loading}
                                    saveProgress={this.state.saveProgress}
                                    toggleEmailModel={this.toggleEmailModel}
                                    Reterival={this.state.Reterival}
                                    email={this.state.email}
                                    handleDraftSaveChange={this.handleDraftSaveChange}
                                    showEmailModel={this.showEmailModel}
                                    saveStatus={this.state.saveStatus}
                                    saveDraft={this.saveDraft}
                                    CallbackExportToPdf={this.printDocument}
                                    modifyCheckList={modifyCheckList}
                                    setModal2Visible={this.setModal2Visible}
                                    principleLength={this.state.principleLength}
                                    percentage={this.state.percentage}
                                    principleProgress={this.state.principleProgress}
                                    exportdata={this.state.QuestionaireUpdate} exportType="Questionaire" activeTab={this.state.activeTab} />
                                <Collapse
                                    accordion key={count + 1}
                                    bordered={false}
                                    expandIcon={({ isActive }) => isActive ? < MinusOutlined /> : < PlusOutlined />}
                                    expandIconPosition={'right'}
                                    destroyInactivePanel={true}
                                    onChange={this.handleQuestionaireCollapseChange}
                                    defaultActiveKey={['0']}

                                >
                                    {
                                        isMobile ?

                                            <GridTabs key={count + 3} id="Question" handleQuestionaireCollapseChange={this.handleQuestionaireCollapseChange} ForElementsView={ElementsUpdate} CheckListSummary={QuestionaireUpdate} ComplianceData={this.props.ComplianceData} onElementView={this.onElementView} handleChange={this.handleChange} setModal1Visible={this.setModal1VisibleForMobile} />
                                            :

                                            modifyCheckList != null && Object.keys(modifyCheckList).map((item, index) => {


                                                return (<Fragment key={count + 10}><Panel forceRender={true} header={<span><span className="fw-600 mr-10">{item.substring(0, 7)}</span>{item.substring(8, item.length)}</span>} key={index} id="Question">
                                                    <Table rowkey={index}
                                                        pagination={false}
                                                        columns={columns} onChange={this.handleQuestionnaireTableChange} dataSource={modifyCheckList != null ? modifyCheckList[item].map((d, i) => ({ key: i, ...d })) : null} />
                                                </Panel></Fragment>);
                                            })
                                    }

                                </Collapse>

                            </Col>
                        </Row>

                    </TabPane>
                    <TabPane tab="Elements to be assured" key="ElementsToBeAssured" >
                        <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                            <Col className="gutter-row" xs={24} sm={24} md={24} lg={24} xl={24}>
                                <ElementstobeassuredInfo setModal2Visible={this.setModal2Visible} principleLength={this.props.actualData?.length} percentage={this.state.persentageReq} principleProgress={this.state.requirementProgress} />
                                <CommonUtilities showEmailModel={this.showEmailModel}
                                    saveStatus={this.state.saveStatus}
                                    saveDraft={this.saveDraft}
                                    loading={this.state.loading}
                                    toggleEmailModel={this.toggleEmailModel}
                                    Reterival={this.state.Reterival} email={this.state.email}
                                    handleDraftSaveChange={this.handleDraftSaveChange}
                                    saveProgress={this.state.saveProgress}
                                    CallbackExportToPdfElements={this.printDocument}
                                    principleCheckList={principleCheckList}
                                    setModal2Visible={this.setModal2Visible}
                                    principleLength={this.props.actualData?.length} percentage={this.state.persentageReq} principleProgress={this.state.requirementProgress} exportdata={this.state.ElementsUpdate} exportType="Elements" activeTab={this.state.activeTab} />


                                <Collapse accordion key={culc + 1}
                                    bordered={false}
                                    expandIcon={({ isActive }) => isActive ? < MinusOutlined /> : < PlusOutlined />}
                                    expandIconPosition={'right'}
                                    activeKey={this.state.elementsActiveKey}
                                    onChange={this.handleCollapseChange}
                                    forceRender={true}
                                    //destroyInactivePanel={true}
                                    defaultActiveKey={['0']}
                                >
                                    {

                                        isMobile ?
                                            <GridTabs id={"Elements"} CheckListSummary={ElementsUpdate} ComplianceData={this.props.ComplianceData} handleCollapseChange={this.handleCollapseChange} handlePriincipledDropdown={this.handlePriincipledDropdown} setModal3Visible={this.setModal3VisibleForMobile} />

                                            :

                                            principleCheckList != null && Object.keys(principleCheckList).map((item, index) => {

                                                return (<Fragment key={culc + 2}><Panel header={item} key={principleCheckList[item][0].principleId} id="Elements"  >

                                                    <Table
                                                        pagination={false}
                                                        columns={ElementsTBAssured} onChange={this.handleTableChange} dataSource={principleCheckList != null ? principleCheckList[item].map((d, i) => ({ key: i, ...d })) : null} />
                                                </Panel></Fragment>);

                                            })
                                    }

                                </Collapse>

                            </Col>
                        </Row>

                    </TabPane>
                    <TabPane tab="Summary" key="Summary">
                        <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 32 }}>
                            <Col className="gutter-row" xs={24} sm={24} md={24} lg={24} xl={24}>

                                <Summary CheckListSummary={CheckListSummary} QuestionaireUpdate={QuestionaireUpdate} />

                            </Col>
                        </Row>
                    </TabPane>
                </Tabs>

                <Modal
                    title={false}
                    centered
                    visible={this.state.saveStatus}
                    onOk={this.toggleEmailModel}
                    onCancel={this.toggleEmailModel}
                    closeIcon={<CloseIcon />}
                    footer={this.state.status && [

                        <Button type="primary" loading={this.state.loading} shape="round" key="back" onClick={() => this.handleDoneButton()}>
                            {this.state.Reterival ? 'Retrieve' : 'Done'}
                        </Button>,

                    ]}
                    className="save-draft-modal"
                    destroyOnClose

                >
                    <div className="modal-header-wrap" onClick={() => this.toggleEmailModel}>

                        <h1 className="modal-title">{!this.state.Reterival ? 'Save Draft' : `Retrieve Draft`}</h1>
                        <Image src="./images/nqaf/save_draft.svg" width={270} height={120} preview={false} />

                    </div>
                    <div className="modal-content-wrap">
                        <Input placeholder="Enter email id" defaultValue={this.state.email} onBlur={this.handleModalChange} />
                        {
                            this.state.Reterival ? <Button type="primary" shape="circle" disabled={this.state.createdDate !== null ? true : false} onClick={() => this.GetStatusCheck('', this.state.activeTab)} ><RightOutlined /></Button> : <Button type="primary" disabled={this.state.createdDate !== null ? true : false} shape="circle" key="back" onClick={() => this.GetStatusCheck('Get', this.state.activeTab)}>
                                <RightOutlined />
                            </Button>


                        }
                        {(this.state.error && (this.state.email !== null && this.state.email !== '')) ? <div className="danger-text mt-5 f-12">Invalid email id</div > : null}
                        {this.state.email === null || this.state.email === '' ? <div className="danger-text mt-5 f-12">Please enter your email id</div> : null}

                        {
                            !this.state.Reterival ? <div className="mt-20"><p className="bold">Why do I need to provide an email id?</p>
                                <p>Providing an email id (an email address) is mandatory to use this feature. The draft will be saved against your email id. You can click on 'View Draft' to retrieve your draft using same email id.</p>
                                {this.state.createdDate != null ? <p className="danger-text"><span className="bold">Warning:</span> Previously saved draft will be overwritten.</p> : null}
                            </div> : <div className="danger-text mt-10">Warning: Any data you may have just entered will be replaced by the retrieved data.</div>
                        }
                        {
                            this.state.createdDate != null ? <div
                                className="alert"><div><strong>{this.state.Reterival ? 'You have one draft! Saved on:' : 'Last draft saved!'}</strong></div><div>{this.state.createdDate}</div></div> : null
                        }

                    </div>
                </Modal>


            </Fragment>


        );

    };
}