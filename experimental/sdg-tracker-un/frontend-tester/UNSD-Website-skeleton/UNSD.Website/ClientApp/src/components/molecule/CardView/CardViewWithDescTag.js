import React, { Component } from "react";
import { Row, Col, Card } from "antd";
import { Image } from '../../atom/Image';
import parse from 'html-react-parser';
import { ReadMoreAndLess } from '../ReadMoreAndLess/ReadMoreAndLess'
import { Link } from 'react-router-dom';
import { CustomIcon } from '../../atom/Icon'
import { commonConstants } from "../../../helper/Common/CommonConstants";
import { withSortSearchPagination } from '../../organism/withSortSearchPagination'

class CardViewWithDescTag extends Component {

    onTitleClick = (event, url, id) => {
        event.preventDefault();
        this.props.onTitleClick({ url: url, id: id });
    };

    onTagClick = (tagObj, type) => {
        this.props.tagClick(tagObj, type);
    };


    render() {
        return (
            <React.Fragment>
                {
                    this.props.data.map(function (item, index) {
                        return (
                            <Card className='ant-card-shadow p-0 mb-3' key={index}>
                                <Row gutter={32}>
                                    <Col className='gutter-row card-image' xs={{ span: 24 }} md={{ span: 6 }} lg={{ span: 6 }}>
                                        <Image image={item.image} className='img-responsive' />
                                    </Col>
                                    <Col className='gutter-row card-details' xs={{ span: 24 }} md={{ span: 18 }} lg={{ span: 18 }}>
                                        <h4 className='mt-3 mb-1'>
                                            {

                                                item.url ? <a href={this.props.createURL({ url: item.url, id: item.id })} target={item.url == "#" ? "" : "_blank"} rel="noreferrer"> {parse(item.title)}</a> :
                                                    <Link style={{ cursor: 'default' }} onClick={(event) => event.preventDefault()}>{parse(item.title)}</Link>
                                            }
                                        </h4>
                                        <div className="card-date-and-type">
                                            {

                                                item.dataList &&
                                                <React.Fragment>
                                                    {item.dataList.map((dataItem, index) => {
                                                        return (
                                                            dataItem.value != "" ?
                                                                (
                                                                    <span className="date" key={index}
                                                                        onClick={
                                                                              dataItem.isTitleClickable ?
                                                                                (event) => this.onTitleClick(event, dataItem.value, item.id) :
                                                                            (dataItem.isTagClickable ?
                                                                                () => this.onTagClick(dataItem.value, dataItem.tagName) : null)
                                                                                }
                                                                >
                                                                    <span>
                                                                     <CustomIcon icon={dataItem.icon} /></span>
                                                                    {dataItem.isTitleClickable || dataItem.isTagClickable ?
                                                                        <a>
                                                                        {dataItem.icon == "file-pdf" ? commonConstants.PDF :
                                                                            (dataItem.icon == "file-video" ? commonConstants.VIDEO : dataItem.value)

                                                                            }</a> : dataItem.value
                                                                       }
                                                                    </span>
                                                              
                                                                           ) : ("")
                                                        )
                                                    })}
                                                </React.Fragment>
                                            }
                                        </div>

                                        {
                                            item.contact != null && item.contact.map((contact) => {

                                                return <React.Fragment>  <p>{contact.name ? <React.Fragment>Contact: {contact.name},</React.Fragment> : ""}{contact.phone ? <React.Fragment>Tel: {contact.phone},</React.Fragment> : ""} {contact.email ? <React.Fragment>Email: <a href={"mailto:" + contact.email}>{contact.email}</a></React.Fragment> : ""}</p></React.Fragment>
                                            })
                                        }

                                    </Col>
                                </Row>
                                {
                                    item.description || item.topics ?
                                        <Row gutter={32}>
                                            <Col className='gutter-row' xs={{ span: 24 }} md={{ span: 24 }} lg={{ span: 24 }}>
                                                <div className='p-3'>
                                                    {
                                                        item.description ? <p> {parse(item.description)}</p> : ""
                                                    }
                                                    {
                                                        item.topics ?
                                                            < ReadMoreAndLess
                                                                tags={item.topics}
                                                                onTagCallback={this.onTagClick}
                                                            /> : ""
                                                    }

                                                </div>
                                            </Col>
                                        </Row> : ""
                                }
                            </Card>
                        )
                    }, this)
                }
            </React.Fragment>
        );
    }
}
export default withSortSearchPagination(CardViewWithDescTag)