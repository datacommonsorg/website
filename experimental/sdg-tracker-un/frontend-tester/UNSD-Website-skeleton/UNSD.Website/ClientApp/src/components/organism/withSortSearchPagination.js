import React, { Component } from "react";
import { Pagination, Row, Col, Form, BackTop, Input } from 'antd';

import { commonConstants } from '../../helper/Common/CommonConstants';
import { CalendarEventConstants } from "../../helper/Common/CalendarEventConstants";
import { Select } from "../../components/atom/SingleSelect";

const { Search } = Input;

export const withSortSearchPagination = (WrappedComponent) => {
    return class DataViewComponent extends React.Component {
        constructor(props) {
            super(props);
            this.state = {
                currentPage: commonConstants.CURRENTPAGE,
                selectedTitle: ""
            }
        }


        componentDidUpdate(prevProps, prevStates) {
            if ((prevProps.totalCount > this.props.totalCount)) {
                this.setState({

                    currentPage: commonConstants.CURRENTPAGE
                });
            }

            if ((prevProps.resetPage != this.props.resetPage) && this.props.resetPage == true) {
                this.setState({

                    currentPage: commonConstants.CURRENTPAGE
                });
            }
        }

        handlePageChange = (page, pageSize) => {
            this.setState({
                //pageSize: pageSize,
                currentPage: page
            });
            this.props.handlePageChange(page, pageSize);
        }

        onTagClick = (tagObj, type) => {
            this.props.tagClick(tagObj, type);
        };

        onTitleClick = (data) => {
            this.props.onTitleClick(data);
        };


        itemRender = (current, type, originalElement) => {
            if (type === 'prev') {
                return <a>Prev</a>;
            }
            if (type === 'next') {
                return <a>Next</a>;
            }
            return originalElement;
        }

        handleSortChange = (value) => {
            this.setState({
                currentPage: commonConstants.CURRENTPAGE
            });
            this.props.handleSortChange(value)
        }

        onSearch = (value) => {
            if (this.state.selectedTitle != value) {
                this.setState({
                    selectedTitle: value
                });
                this.props.handleSearchChange(value)
            }
            
        }

        render() {

            return (
                this.props.data.length > 0 ? (
                    <React.Fragment>

                        <Row gutter={32} className='CD-search CD-pagination mb-4'>
                            <Col className='gutter-row mb-2' xs={{ span: 24 }} md={{ span: 6 }} lg={{ span: 6 }}>
                                {
                                    !this.props.hasfilter &&
                                    <Form.Item
                                        name='SearchText'
                                        className='m-0 search'
                                    >
                                        <Search name={"EventTitle"} style={{ float: "left" }} placeholder="Search Title" onSearch={this.onSearch} />
                                    </Form.Item>
                                }
                            </Col>
                            <Col className='gutter-row mb-2 d-flex align-items-center justify-content-center' xs={{ span: 24 }} md={{ span: 12 }} lg={{ span: 12 }}>
                                {
                                    this.props.isPagingRequired &&
                                    
                                        <Pagination
                                            showSizeChanger={commonConstants.SETFALSE}
                                            total={this.props.totalCount}
                                            pageSize={this.props.pageSize}
                                            onChange={this.handlePageChange}
                                            pageSizeOptions={commonConstants.PAGESIZEOPTIONS}
                                            current={this.state.currentPage}
                                            showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} items`}
                                            itemRender={this.itemRender}
                                            showTitle={false}
                                            responsive={true}
                                            showLessItems={true}

                                        />
                                    
                                }
                            </Col>
                            <Col style={{ float: 'right' }} className='gutter-row mb-2' xs={{ span: 24 }} md={{ span: 6 }} lg={{ span: 6 }}>
                                {
                                    this.props.isSortingRequired &&
                                    <Form.Item className='m-0 sortby'>
                                        <Select option={this.props.sortOptions ? this.props.sortOptions : commonConstants.SORTOPTIONS} placeholder={'Select'} onChange={this.handleSortChange} defaultValue={this.props.defaultSortValue ? this.props.defaultSortValue : commonConstants.DEFAULT_SORT_VALUE} />
                                    </Form.Item>
                                }
                            </Col>                            
                        </Row>


                        <WrappedComponent
                            data={this.props.data}
                            tagClick={this.onTagClick}
                            onTitleClick={this.onTitleClick}
                            createURL={this.props.createURL}
                        >
                        </WrappedComponent>

                        {this.props.isPagingRequired &&
                            <Row gutter={32} className='mb-2'>
                                <Col className='gutter-row' span={24}>
                                    <Pagination
                                        className='float-right'
                                        showSizeChanger={commonConstants.SHOWPAGESIZECHANGER}
                                        total={this.props.totalCount}
                                        pageSize={this.props.pageSize}
                                        onChange={this.handlePageChange}
                                        pageSizeOptions={commonConstants.PAGESIZEOPTIONS}
                                        current={this.state.currentPage}
                                        showTotal={(total, range) => `${range[0]}-${range[1]} of ${total} items`}
                                        itemRender={this.itemRender}
                                        showTitle={false}
                                        responsive={true}
                                        showLessItems={true}

                                    />
                                </Col>
                            </Row>
                        }
                    </React.Fragment >
                ) : (
                        <><Row gutter={32} className='CD-search CD-pagination mb-4'>
                            <Col className='gutter-row mb-2' xs={{ span: 24 }} md={{ span: 9 }} lg={{ span: 9 }}>
                                {
                                    !this.props.hasfilter &&
                                    <Form.Item
                                        name='SearchText'
                                        label="Search Title"
                                        className='m-0 search'
                                    >
                                        <Search name={"EventTitle"} style={{ float: "left" }} placeholder="Search" onSearch={this.onSearch} />
                                    </Form.Item>
                                }
                            </Col>
                            <Col style={{ float: 'right' }} className='gutter-row mb-2' xs={{ span: 24 }} md={{ span: 7 }} lg={{ span: 7 }}>
                            </Col>
                            <Col style={{ float: 'right' }} className='gutter-row mb-2' xs={{ span: 24 }} md={{ span: 8 }} lg={{ span: 8 }}>
                                {
                                    this.props.isSortingRequired &&
                                    <Form.Item label={<>{"Sort by"}</>} className='m-0 sortby'>
                                        <Select option={this.props.sortOptions ? this.props.sortOptions : commonConstants.SORTOPTIONS} placeholder={'Select'} onChange={this.handleSortChange} defaultValue={this.props.defaultSortValue ? this.props.defaultSortValue : commonConstants.DEFAULT_SORT_VALUE} />
                                    </Form.Item>
                                }
                            </Col>                            
                        </Row>
                        <Row
                            gutter={{ xs: 32, sm: 32, md: 32, lg: 32 }}
                            hidden={this.props.loader === true ? true : false}
                        >
                            <Col
                                className='gutter-row'
                                xs={{ span: 24 }}
                                md={{ span: 24 }}
                                lg={{ span: 24 }}
                            >                                
                                <h6 className='text-center'>No data found</h6>
                            </Col>
                            </Row>
                        </>
                    )
            )
        }
    }

}