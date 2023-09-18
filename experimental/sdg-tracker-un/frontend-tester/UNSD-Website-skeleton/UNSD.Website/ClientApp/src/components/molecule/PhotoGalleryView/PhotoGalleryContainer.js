import React, { Component } from 'react';
import { Row, Col, Tabs } from 'antd';
import { commonConstants } from '../../../helper/Common/CommonConstants';
import 'react-image-lightbox/style.css';
import PhotoGalleryLightbox from './PhotoGalleryLightbox';

class PhotoGalleryContainer extends Component {
    constructor(props) {
        super(props);

        this.state = {
            isOpen: false,
            photoLinkData: {},
          
        }
    }
    onCloseClick = (tagObj) => {
        this.setState({
            isOpen: false

        })

    };


    render() {
        return (

            <React.Fragment>
                {
                    <Row gutter={32}>
                        {

                            this.props.response.photoLinks.map(function (res, i) {

                                let tooltip = ""
                                if (res.tooltip) {
                                    tooltip = res.tooltip
                                }
                                return (
                                    <Col className='gutter-row mb-3' xs={{ span: 24 }} md={{ span: 8 }} lg={{ span: 8 }}>

                                        <img src={commonConstants.IMAGE_PATH_Statcom + res.image} title={tooltip} className='img-responsive photo-gallery' onClick={() => this.setState({ isOpen: true, photoLinkData: this.props.response.photoLinks, index: i })} />
                                        {
                                            this.state.isOpen == true ? <PhotoGalleryLightbox images={this.state.photoLinkData} photoIndex={this.state.index} closeClick={this.onCloseClick} /> : ""
                                        }

                                    </Col>
                                )
                            }.bind(this))
                        }
                    </Row>

                }

            </React.Fragment >
        )

    }
}
export default PhotoGalleryContainer



