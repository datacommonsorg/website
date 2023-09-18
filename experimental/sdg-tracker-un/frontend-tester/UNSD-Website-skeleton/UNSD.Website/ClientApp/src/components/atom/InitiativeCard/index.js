import { Col, Row, Modal, Button } from 'antd'
import React, { useState } from 'react'
import CustomButton from '../CustomButton'
import { Image } from '../Image'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt, faExternalLinkAlt, faUser } from '@fortawesome/free-solid-svg-icons';
import moment from 'moment';
import './initiativeCard.css'

const InitiativeCard = ({ img, title, startDate, endDate, contactPerson, description, url, status }) => {

    const [isModalOpen, setIsModalOpen] = useState(false)
    return (
        <>
            <Modal
                title={title}
                centered
                visible={isModalOpen}
                onOk={() => setIsModalOpen(false)}
                onCancel={() => setIsModalOpen(false)}
                width={1000}
                wrapClassName="Capacitydevpt-modal"
                footer={url && (url.trim() !== '') && (url !== "#") && [
                    <a href={url} target="_blank" className='initiative-card_modal_footer_btn outline' rel="noreferrer">
                        <FontAwesomeIcon icon={faExternalLinkAlt} /> View Details
                    </a>
                ]}
            >
                <div className='initiative-card-modal_inner'>
                    <Row className='initiative-card-modal'>
                        {/* <Col span={8}>
                        <Image image={img} className='initiative-card-modal_img' />
                    </Col>
                    <Col span={16} className='initiative-card-modal_col_content'>
                        <h3 className='heading_underline'>{title}</h3>
                        <div className='initiative-card-modal_date_contact'>
                            <p className='date'><FontAwesomeIcon icon={faCalendarDay} /> 
                             {moment(startDate, "DD-MM-YYYY").format("MMM DD, YYYY")} - {moment(endDate, "DD-MM-YYYY").format("MMM DD, YYYY")} 
                            </p>
                            <p className='contact'><FontAwesomeIcon icon={faUser} /> {contactPerson[0].name} </p>
                        </div>
                    </Col> */}
                    </Row>
                    <Row className='initiative-card-modal_desc'>
                        <Col>
                            <p>{description}</p>
                        </Col>
                    </Row>
                </div>
            </Modal>
            <Row className='initiative-card'>
                <span className={`initiative-card_status ${status}`}>{status}</span>
                <Col span={6}>
                    <Image externalPath="true" image={img} className='initiative-card_img' />
                </Col>
                <Col span={18} className='initiative-card_col_content'>
                    <h3 className='heading_underline'>{title}</h3>
                    {/*<div className='initiative-card_date_contact'>
                        <p className='date'><FontAwesomeIcon icon={faCalendarAlt} /> {moment(startDate, "DD-MM-YYYY").format("MMM DD, YYYY")}{endDate != null && endDate.length > 0 ? ' - '+ moment(endDate, "DD-MM-YYYY").format("MMM DD, YYYY"):''}
                        </p>
                        {contactPerson != null && contactPerson.length > 0 ? <p className='contact'><FontAwesomeIcon icon={faUser} /> {contactPerson[0].name} </p>:''}
                    </div>*/}


                    <div className='initiative-card_row_desc'>
                        <p>{description.length > 420 ? `${description.slice(0, 420)}...` : description}</p>
                    </div>
                    <div className='initiative-card_btns'>
                        <CustomButton className='initiative-card_desc_btn' linkType onClick={() => setIsModalOpen(true)}>{description.length > 420 ? 'Read Full Description' : ''}</CustomButton>
                        {url && (url.trim() !== '') && (url !== "#") && url.startsWith('http') && <a href={url} target="_blank" className='initiative-card_modal_footer_btn outline' rel="noreferrer">
                            <FontAwesomeIcon icon={faExternalLinkAlt} /> View Details
                        </a>}
                        {url && (url.trim() !== '') && (url !== "#") && !url.startsWith('http') && <a href={url} className='initiative-card_modal_footer_btn outline' rel="noreferrer">
                            View Details
                        </a>}
                    </div>
                </Col>
            </Row>
        </>
    )
}

export default InitiativeCard