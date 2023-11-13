import { Button } from 'antd'
import React from 'react'
import { Link } from 'react-router-dom'
import './customButton.css'

const CustomButton = ({ children, isLink, url, className, width, linkType, onClick, outline }) => {
    if (isLink) {
        return (
            <Link to={url} className={`${className} ${linkType ? 'link_type' : 'custom-btn'} ${outline ? 'outline' : ''}`} style={{ width: `${width}px` }}>
                {children}
            </Link>
        )
    } else {
        return (
            <button className={`${className} ${linkType ? 'link_type' : 'custom-btn'}`} style={{ width: `${width}px` }} onClick={() => onClick()}>
                {children}
            </button>
        )
    }
}

export default CustomButton