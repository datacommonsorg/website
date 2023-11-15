import { Col } from 'antd'
import React from 'react'
import { Link } from 'react-router-dom'
import { Image } from '../Image'
import './verticalCard.css'

const VerticalCard = ({ img, title, description, link, isLinkTypeButton, isExternal, width }) => {
    return (

        <div className="ant-card " style={{ height: "100%" }}>
                    <div className='ant-card-cover'>
                <Image image={img} width="100%" height="100%" />
            </div>
            <div className='ant-card-body national-system-body'>
                <div>
                    <h3 className='heading_underline mb-3'>{title}</h3>
                    <p className='vertical-card_desc'>{description}</p>
                </div>
                {
                    isExternal ?
                        <a href={link} className={isLinkTypeButton ? 'vertical-card_link_btn' : 'vertical-card_link_link'} target="_blank" rel="noreferrer">View Details</a>
                        :
                        <Link to={link} className={isLinkTypeButton ? 'vertical-card_link_btn' : 'vertical-card_link_link'}>View Details</Link>
                }
                </div>
                </div>
              
    )
}

export default VerticalCard