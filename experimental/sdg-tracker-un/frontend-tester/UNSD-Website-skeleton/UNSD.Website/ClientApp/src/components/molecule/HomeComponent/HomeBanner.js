import React, { Component } from 'react';
import { Row, Col, Carousel } from 'antd';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faAngleLeft, faAngleRight } from '@fortawesome/free-solid-svg-icons';
import { Image } from '../../atom/Image';
import { getHomeBanner } from '../../../services/Home/HomeService';


export default class HomeBanner extends Component {
    constructor(props) {
        super(props);

        this.state = {
            homeBannersResponse: []
        };
    }

    async componentDidMount() {
        const { bannersData, url } = this.props;
        let homeBannersData = [];
        if (url) {
            homeBannersData = await getHomeBanner(url);
        } else {
            homeBannersData = bannersData ? bannersData : [];
        }
        this.setState({
           // homeBannersResponse: homeBannersData.homeBannerResponse
            homeBannersResponse: homeBannersData
        });
    }
    render() {
        const settings = {
            dots: true,
            infinite: true,
            speed: 500,
            slidesToShow: 1,
            slidesToScroll: 1,
            autoplay: true,
            initialSlide: 0,
            responsive: [
                {
                    breakpoint: 480,
                    settings: {
                        slidesToShow: 1,
                        slidesToScroll: 1,
                        arrows: true,
                        prevArrow: <FontAwesomeIcon icon={faAngleLeft} />,
                        nextArrow: <FontAwesomeIcon icon={faAngleRight} />,
                        dots: false
                    }
                }
            ]
        };

        return (
            <React.Fragment>
                <div className='home-banner'>
                    {
                        this.state.homeBannersResponse.length > 0 ? <Carousel  {...settings}>
                            {
                                this.state.homeBannersResponse.map((item, index) => {
                                    return <>
                                        <div className="d-flex justify-content-center"><span className="text-truncate text-secondary bg-light">{item.title}</span></div>
                                        <div className='banner-background' key={index}>
                                        <a href={item.url} target={item.target}>
                                            
                                            <Image image={item.image} className="img-responsive" />
                                        </a>
                                    </div></>
                                })
                            }
                        </Carousel> : null
                    }
                    
                </div>
            </React.Fragment >
        )
    }
}
