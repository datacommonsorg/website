import React from 'react'
import './historicalData.css'

import { Col, Row } from 'antd'

const HistoricalData = () => {
    return (
        <Row className='historical-data'>
            <Col span={8}>
                <img src="https://unstats.un.org/unsd/ccsa/assets/img/sliders/ccsa/CCSA-covid19-vol3-cover.jpg" width="100%" />
            </Col>
            <Col span={16} className="pl-3">
                <h2 className="mb-3">Historical Data</h2>
                <p className="mb-3">
                    The Statistics Division engages in a wide variety of capacity-developing activities that support National Statistical Offices and the wider National Statistical Systems. The support is intended to strengthen countries' capacity in providing high quality statistics for decision making and analytical purposes by increasing their abilities to manage the statistical system, their knowledge of statistical standards and methods and the use of new data sources and tools.
                </p>
                <h3 className="heading_underline mb-3">Lorem Ipsum dolor sit amet</h3>
                <p className="mb-3">
                    This website provides information on ongoing activities, whether in the form of multi-year projects, targeted workshops or virtual trainings, as well as coordination mechanisms for such activities.
                </p>
                <p className="mb-3">
                    Select the corresponding links in the menu at the left to get more information.
                </p>
            </Col>
        </Row>
    )
}

export default HistoricalData