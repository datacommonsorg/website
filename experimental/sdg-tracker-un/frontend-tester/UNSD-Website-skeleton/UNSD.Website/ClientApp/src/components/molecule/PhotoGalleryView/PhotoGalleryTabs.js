import React, { Component } from 'react';
import { Row, Col, Tabs } from 'antd';
import { commonConstants } from '../../../helper/Common/CommonConstants';
import 'react-image-lightbox/style.css';
import PhotoGalleryLightbox from './PhotoGalleryLightbox';
import PhotoGalleryContainer from './PhotoGalleryContainer';

const { TabPane } = Tabs;

class PhotoGalleryTabs extends Component {
    constructor(props) {
        super(props);

        this.state = {
            photoLinkData: {},
            activeKey: '0'
        }
    }
 

    componentDidUpdate(prevProps, prevState) {
        if (JSON.stringify(prevProps.galleryTypes) !== JSON.stringify(this.props.galleryTypes)) {
            this.setState({ activeKey: '0' })
        }
    }

    callback=(key)=> {
        this.setState({ activeKey:key})
    }

    render() {
        return (

            <React.Fragment>
                <Tabs defaultActiveKey={this.state.activeKey} onChange={this.callback} activeKey={this.state.activeKey} >

                    {
                        this.props.galleryTypes.length > 0 && this.props.galleryTypes.map(function (response, index) {
                            let type = "Photo Gallery"
                            if (response.type) {
                                type = response.type
                            }
                            return (

                                <TabPane tab={response.type} key={index}>
                                    <PhotoGalleryContainer response={response}/>

                                </TabPane>

                            );
                        }, this)
                    }
                </Tabs>





            </React.Fragment >
        )

    }
}
export default PhotoGalleryTabs



