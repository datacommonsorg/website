import { Col, Row } from 'antd'
import React from 'react'
import './activityCard.css'
import { Image } from '../Image'

const ActivityCard = ({ img, title, description }) => {
    return (
        <Row className='activity-card'>
            <Col span={4}>
                <Image image={img} className="activity-card_img" />
            </Col>
            <Col span={20} className="activity-card_content">
            <div>
                    <h3 className='heading_underline mb-3'>{title}</h3>
                    <p className='vertical-card_desc'>{description}</p>
                </div>
                {/* <h4 className='heading_underline'>
                    Lorem Ipsum
                </h4> */}
                {/* <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p> */}
            </Col>
        </Row>
    )
}

export default ActivityCard