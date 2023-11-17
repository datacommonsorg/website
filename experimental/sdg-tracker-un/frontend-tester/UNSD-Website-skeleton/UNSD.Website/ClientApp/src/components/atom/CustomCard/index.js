import React from 'react'
import { Link, useHistory } from 'react-router-dom'
import './customCard.css'

import { Button, Col, Row } from 'antd'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';

const CustomCard = ({ img, heading, url, description, isExternal, refresh }) => {

    return (
        <Row className='custom-card'>
            <Col span={6} style={{ backgroundImage: `url(${img})` }} className="custom-card_img"></Col>
            <Col span={18} className="custom-card_content">
                <div className="CDcardheading">
                    <h2>{heading}</h2>
                    <p className="mt-3">
                    {description}
                    </p>
                </div>
                {
                    isExternal ?
                        <a href={url} target="_blank" className='custom-card_link mt-3' rel="noreferrer">
                            <Button shape="round" className='custom-card_link_btn'>
                                <FontAwesomeIcon icon={faExternalLinkAlt} /> View Details
                            </Button>
                        </a>
                        :
                        refresh ?
                            <Button shape="round" className='mt-3 custom-card_link_btn_refresh' onClick={() => window.location.href = url}>
                                View Details
                            </Button>
                            :
                            <Link to={url} className='custom-card_link mt-3'>
                                <Button shape="round" className='custom-card_link_btn'>
                                    View Details
                                </Button>
                            </Link>
                }
            </Col>
        </Row>
    )
}

export default CustomCard