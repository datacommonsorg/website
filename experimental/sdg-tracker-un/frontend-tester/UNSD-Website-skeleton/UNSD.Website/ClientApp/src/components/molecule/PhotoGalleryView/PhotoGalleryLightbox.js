import React, { Component } from 'react';
import Lightbox from 'react-image-lightbox';
import { commonConstants } from '../../../helper/Common/CommonConstants';

import 'react-image-lightbox/style.css'; // This only needs to be imported once in your app
import { TwitterShareButton } from "react-twitter-embed";

class PhotoGalleryLightbox extends Component {
    constructor(props) {
        super(props);

        this.state = {
            isOpen: true,
            photoIndex: 0,
            images: {},
            localURL:'',
        }
    }

    async componentDidMount() {
        
        let baseUrlArray = commonConstants.BASE_URL.split('/'); //splitting base URL in to array
        let indexBaseUrl = baseUrlArray.length - 1; //fetching last element in array
        let index = window.location.href.lastIndexOf(baseUrlArray[indexBaseUrl]); //finding last element index in URL
        let localURL = window.location.href.substr(0, index + baseUrlArray[indexBaseUrl].length);// first step to facting absolute URL

        this.setState({
            photoIndex: this.props.photoIndex,
            images: this.props.images,
            localURL: localURL
        });
    }
    onCloseClick = (tagObj) => {
        this.setState({
            isOpen: false
        })
        this.props.closeClick(tagObj);
    }
    render() {
        return (

            <React.Fragment>
                {
                    this.state.isOpen == true && this.state.images.length > 0 ?

                        <Lightbox
                            imageCaption={this.state.images[this.state.photoIndex].photoCredit}
                            mainSrc={commonConstants.IMAGE_PATH_Statcom + this.state.images[this.state.photoIndex].image}
                            imageTitle={this.state.images[this.state.photoIndex].title}
                            toolbarButtons={[

                                <TwitterShareButton url={commonConstants.IMAGE_PATH_Statcom +this.state.images
                                //  <TwitterShareButton url={this.state.localURL + commonConstants.ABSOLUTE_IMAGE_PATH + this.state.images Original
                                [this.state.photoIndex].image} className={'socialShareButtons'} />,

                            ]}

                            nextSrc={commonConstants.IMAGE_PATH_Statcom + this.state.images[(this.state.photoIndex + 1) % this.state.images.length].image}
                            prevSrc={commonConstants.IMAGE_PATH_Statcom + this.state.images[(this.state.photoIndex + this.state.images.length - 1) % this.state.images.length].image}
                            onCloseRequest={() => this.onCloseClick(false)}
                            onMovePrevRequest={() =>
                                this.setState({
                                    photoIndex: (this.state.photoIndex + this.state.images.length - 1) % this.state.images.length,
                                })
                            }
                            onMoveNextRequest={() =>
                                this.setState({
                                    photoIndex: (this.state.photoIndex + 1) % this.state.images.length,
                                })
                            }
                        /> : ""
                }



            </React.Fragment >
        )

    }
}
export default PhotoGalleryLightbox



