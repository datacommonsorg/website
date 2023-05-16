# Copyright 2023 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import logging
import urllib.parse

import flask
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

# TODO: Remove this override after the API is strengthened.
_OVERRIDE_CHART_MAP = {
    'family earnings in california': [{
        "data_csv":
            "label,Average Income for Family Households\r\n2019,119126\r\n2018,113046\r\n2017,106970\r\n2016,101373\r\n2015,97665\r\n2014,96357\r\n2013,94926\r\n2012,94829\r\n2011,94747\r\n2010,92942",
        "legend": ["Average Income for Family Households"],
        "srcs": [{
            "name":
                "data.census.gov",
            "url":
                "https://data.census.gov/cedsci/table?q=S1901&tid=ACSST5Y2019.S1901"
        }],
        "svg":
            "data:image/svg+xml;%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20xmlns%3Axlink%3D%22http%3A//www.w3.org/1999/xlink%22%20width%3D%22875%22%20height%3D%22160%22%3E%3Cg%20class%3D%22x%20axis%22%20transform%3D%22translate%280%2C%20130%29%22%20fill%3D%22none%22%20font-size%3D%2210%22%20font-family%3D%22sans-serif%22%20text-anchor%3D%22middle%22%3E%3Cpath%20class%3D%22domain%22%20stroke%3D%22%23999%22%20d%3D%22M0%2C0.5H865.5%22%20transform%3D%22translate%280%2C%200%29%22%3E%3C/path%3E%3Cg%20class%3D%22tick%22%20opacity%3D%221%22%20transform%3D%22translate%28114.46679469627827%2C0%29%22%3E%3Cline%20stroke%3D%22%23999%22%20y2%3D%226%22%20stroke-width%3D%220.5%22%3E%3C/line%3E%3Ctext%20fill%3D%22currentColor%22%20y%3D%229%22%20dy%3D%220.71em%22%3E2010%3C/text%3E%3C/g%3E%3Cg%20class%3D%22tick%22%20opacity%3D%221%22%20transform%3D%22translate%28281.278429545685%2C0%29%22%3E%3Cline%20stroke%3D%22%23999%22%20y2%3D%226%22%20stroke-width%3D%220.5%22%3E%3C/line%3E%3Ctext%20fill%3D%22currentColor%22%20y%3D%229%22%20dy%3D%220.71em%22%3E2012%3C/text%3E%3C/g%3E%3Cg%20class%3D%22tick%22%20opacity%3D%221%22%20transform%3D%22translate%28448.31857348392657%2C0%29%22%3E%3Cline%20stroke%3D%22%23999%22%20y2%3D%226%22%20stroke-width%3D%220.5%22%3E%3C/line%3E%3Ctext%20fill%3D%22currentColor%22%20y%3D%229%22%20dy%3D%220.71em%22%3E2014%3C/text%3E%3C/g%3E%3Cg%20class%3D%22tick%22%20opacity%3D%221%22%20transform%3D%22translate%28615.1302083333333%2C0%29%22%3E%3Cline%20stroke%3D%22%23999%22%20y2%3D%226%22%20stroke-width%3D%220.5%22%3E%3C/line%3E%3Ctext%20fill%3D%22currentColor%22%20y%3D%229%22%20dy%3D%220.71em%22%3E2016%3C/text%3E%3C/g%3E%3Cg%20class%3D%22tick%22%20opacity%3D%221%22%20transform%3D%22translate%28782.170352271575%2C0%29%22%3E%3Cline%20stroke%3D%22%23999%22%20y2%3D%226%22%20stroke-width%3D%220.5%22%3E%3C/line%3E%3Ctext%20fill%3D%22currentColor%22%20y%3D%229%22%20dy%3D%220.71em%22%3E2018%3C/text%3E%3C/g%3E%3C/g%3E%3Cg%20class%3D%22y%20axis%22%20transform%3D%22translate%28865%2C%200%29%22%20fill%3D%22none%22%20font-size%3D%2210%22%20font-family%3D%22sans-serif%22%20text-anchor%3D%22end%22%3E%3Cg%20class%3D%22tick%22%20opacity%3D%221%22%20transform%3D%22translate%280%2C130.5%29%22%3E%3Cline%20stroke%3D%22currentColor%22%20x2%3D%22-865%22%20class%3D%22grid-line%22%20style%3D%22stroke%3A%20rgb%28153%2C%20153%2C%20153%29%3B%20stroke-width%3A%200.5%3B%20stroke-opacity%3A%200.5%3B%20stroke-dasharray%3A%202%2C%202%3B%22%3E%3C/line%3E%3Ctext%20fill%3D%22currentColor%22%20x%3D%22-865%22%20dy%3D%22-4%22%20style%3D%22fill%3A%20rgb%2843%2C%2041%2C%2041%29%3B%20shape-rendering%3A%20crispedges%3B%20font-family%3A%20Roboto%3B%22%20transform%3D%22translate%28103.890625%2C%200%29%22%3E0%20Infl.%20adj.%20USD%20%28CY%29%3C/text%3E%3C/g%3E%3Cg%20class%3D%22tick%22%20opacity%3D%221%22%20transform%3D%22translate%280%2C112.16666666666667%29%22%3E%3Cline%20stroke%3D%22currentColor%22%20x2%3D%22-865%22%20class%3D%22grid-line%22%20style%3D%22stroke%3A%20rgb%28153%2C%20153%2C%20153%29%3B%20stroke-width%3A%200.5%3B%20stroke-opacity%3A%200.5%3B%20stroke-dasharray%3A%202%2C%202%3B%22%3E%3C/line%3E%3Ctext%20fill%3D%22currentColor%22%20x%3D%22-865%22%20dy%3D%22-4%22%20style%3D%22fill%3A%20rgb%2843%2C%2041%2C%2041%29%3B%20shape-rendering%3A%20crispedges%3B%20font-family%3A%20Roboto%3B%22%20transform%3D%22translate%28103.890625%2C%200%29%22%3E20K%20Infl.%20adj.%20USD%20%28CY%29%3C/text%3E%3C/g%3E%3Cg%20class%3D%22tick%22%20opacity%3D%221%22%20transform%3D%22translate%280%2C93.83333333333334%29%22%3E%3Cline%20stroke%3D%22currentColor%22%20x2%3D%22-865%22%20class%3D%22grid-line%22%20style%3D%22stroke%3A%20rgb%28153%2C%20153%2C%20153%29%3B%20stroke-width%3A%200.5%3B%20stroke-opacity%3A%200.5%3B%20stroke-dasharray%3A%202%2C%202%3B%22%3E%3C/line%3E%3Ctext%20fill%3D%22currentColor%22%20x%3D%22-865%22%20dy%3D%22-4%22%20style%3D%22fill%3A%20rgb%2843%2C%2041%2C%2041%29%3B%20shape-rendering%3A%20crispedges%3B%20font-family%3A%20Roboto%3B%22%20transform%3D%22translate%28103.890625%2C%200%29%22%3E40K%20Infl.%20adj.%20USD%20%28CY%29%3C/text%3E%3C/g%3E%3Cg%20class%3D%22tick%22%20opacity%3D%221%22%20transform%3D%22translate%280%2C75.5%29%22%3E%3Cline%20stroke%3D%22currentColor%22%20x2%3D%22-865%22%20class%3D%22grid-line%22%20style%3D%22stroke%3A%20rgb%28153%2C%20153%2C%20153%29%3B%20stroke-width%3A%200.5%3B%20stroke-opacity%3A%200.5%3B%20stroke-dasharray%3A%202%2C%202%3B%22%3E%3C/line%3E%3Ctext%20fill%3D%22currentColor%22%20x%3D%22-865%22%20dy%3D%22-4%22%20style%3D%22fill%3A%20rgb%2843%2C%2041%2C%2041%29%3B%20shape-rendering%3A%20crispedges%3B%20font-family%3A%20Roboto%3B%22%20transform%3D%22translate%28103.890625%2C%200%29%22%3E60K%20Infl.%20adj.%20USD%20%28CY%29%3C/text%3E%3C/g%3E%3Cg%20class%3D%22tick%22%20opacity%3D%221%22%20transform%3D%22translate%280%2C57.16666666666667%29%22%3E%3Cline%20stroke%3D%22currentColor%22%20x2%3D%22-865%22%20class%3D%22grid-line%22%20style%3D%22stroke%3A%20rgb%28153%2C%20153%2C%20153%29%3B%20stroke-width%3A%200.5%3B%20stroke-opacity%3A%200.5%3B%20stroke-dasharray%3A%202%2C%202%3B%22%3E%3C/line%3E%3Ctext%20fill%3D%22currentColor%22%20x%3D%22-865%22%20dy%3D%22-4%22%20style%3D%22fill%3A%20rgb%2843%2C%2041%2C%2041%29%3B%20shape-rendering%3A%20crispedges%3B%20font-family%3A%20Roboto%3B%22%20transform%3D%22translate%28103.890625%2C%200%29%22%3E80K%20Infl.%20adj.%20USD%20%28CY%29%3C/text%3E%3C/g%3E%3Cg%20class%3D%22tick%22%20opacity%3D%221%22%20transform%3D%22translate%280%2C38.83333333333333%29%22%3E%3Cline%20stroke%3D%22currentColor%22%20x2%3D%22-865%22%20class%3D%22grid-line%22%20style%3D%22stroke%3A%20rgb%28153%2C%20153%2C%20153%29%3B%20stroke-width%3A%200.5%3B%20stroke-opacity%3A%200.5%3B%20stroke-dasharray%3A%202%2C%202%3B%22%3E%3C/line%3E%3Ctext%20fill%3D%22currentColor%22%20x%3D%22-865%22%20dy%3D%22-4%22%20style%3D%22fill%3A%20rgb%2843%2C%2041%2C%2041%29%3B%20shape-rendering%3A%20crispedges%3B%20font-family%3A%20Roboto%3B%22%20transform%3D%22translate%28103.890625%2C%200%29%22%3E100K%20Infl.%20adj.%20USD%20%28CY%29%3C/text%3E%3C/g%3E%3Cg%20class%3D%22tick%22%20opacity%3D%221%22%20transform%3D%22translate%280%2C20.5%29%22%3E%3Cline%20stroke%3D%22currentColor%22%20x2%3D%22-865%22%20class%3D%22grid-line%22%20style%3D%22stroke%3A%20rgb%28153%2C%20153%2C%20153%29%3B%20stroke-width%3A%200.5%3B%20stroke-opacity%3A%200.5%3B%20stroke-dasharray%3A%202%2C%202%3B%22%3E%3C/line%3E%3Ctext%20fill%3D%22currentColor%22%20x%3D%22-865%22%20dy%3D%22-4%22%20style%3D%22fill%3A%20rgb%2843%2C%2041%2C%2041%29%3B%20shape-rendering%3A%20crispedges%3B%20font-family%3A%20Roboto%3B%22%20transform%3D%22translate%28103.890625%2C%200%29%22%3E120K%20Infl.%20adj.%20USD%20%28CY%29%3C/text%3E%3C/g%3E%3C/g%3E%3Cg%20class%3D%22highlight%22%3E%3C/g%3E%3Cg%20class%3D%22chart-area%22%3E%3Cpath%20class%3D%22line%22%20d%3D%22M865%2C20.801166666666663L781.5941825752966%2C26.374499999999994L698.1883651505933%2C31.94416666666667L614.5540386370551%2C37.074749999999995L531.1482212123517%2C40.473749999999995L447.7424037876483%2C41.67275L364.33658636294496%2C42.9845L280.70225984940674%2C43.073416666666674L197.29644242470337%2C43.14858333333333L113.890625%2C44.80316666666667%22%20style%3D%22stroke%3A%20rgb%28211%2C%20211%2C%20143%29%3B%20fill%3A%20none%3B%20stroke-width%3A%202.5px%3B%22%3E%3C/path%3E%3Cg%3E%3Ccircle%20class%3D%22dot%22%20cx%3D%22865%22%20cy%3D%2220.801166666666663%22%20r%3D%223%22%20style%3D%22fill%3A%20rgb%28211%2C%20211%2C%20143%29%3B%20stroke%3A%20rgb%28255%2C%20255%2C%20255%29%3B%22%3E%3C/circle%3E%3Ccircle%20class%3D%22dot%22%20cx%3D%22781.5941825752966%22%20cy%3D%2226.374499999999994%22%20r%3D%223%22%20style%3D%22fill%3A%20rgb%28211%2C%20211%2C%20143%29%3B%20stroke%3A%20rgb%28255%2C%20255%2C%20255%29%3B%22%3E%3C/circle%3E%3Ccircle%20class%3D%22dot%22%20cx%3D%22698.1883651505933%22%20cy%3D%2231.94416666666667%22%20r%3D%223%22%20style%3D%22fill%3A%20rgb%28211%2C%20211%2C%20143%29%3B%20stroke%3A%20rgb%28255%2C%20255%2C%20255%29%3B%22%3E%3C/circle%3E%3Ccircle%20class%3D%22dot%22%20cx%3D%22614.5540386370551%22%20cy%3D%2237.074749999999995%22%20r%3D%223%22%20style%3D%22fill%3A%20rgb%28211%2C%20211%2C%20143%29%3B%20stroke%3A%20rgb%28255%2C%20255%2C%20255%29%3B%22%3E%3C/circle%3E%3Ccircle%20class%3D%22dot%22%20cx%3D%22531.1482212123517%22%20cy%3D%2240.473749999999995%22%20r%3D%223%22%20style%3D%22fill%3A%20rgb%28211%2C%20211%2C%20143%29%3B%20stroke%3A%20rgb%28255%2C%20255%2C%20255%29%3B%22%3E%3C/circle%3E%3Ccircle%20class%3D%22dot%22%20cx%3D%22447.7424037876483%22%20cy%3D%2241.67275%22%20r%3D%223%22%20style%3D%22fill%3A%20rgb%28211%2C%20211%2C%20143%29%3B%20stroke%3A%20rgb%28255%2C%20255%2C%20255%29%3B%22%3E%3C/circle%3E%3Ccircle%20class%3D%22dot%22%20cx%3D%22364.33658636294496%22%20cy%3D%2242.9845%22%20r%3D%223%22%20style%3D%22fill%3A%20rgb%28211%2C%20211%2C%20143%29%3B%20stroke%3A%20rgb%28255%2C%20255%2C%20255%29%3B%22%3E%3C/circle%3E%3Ccircle%20class%3D%22dot%22%20cx%3D%22280.70225984940674%22%20cy%3D%2243.073416666666674%22%20r%3D%223%22%20style%3D%22fill%3A%20rgb%28211%2C%20211%2C%20143%29%3B%20stroke%3A%20rgb%28255%2C%20255%2C%20255%29%3B%22%3E%3C/circle%3E%3Ccircle%20class%3D%22dot%22%20cx%3D%22197.29644242470337%22%20cy%3D%2243.14858333333333%22%20r%3D%223%22%20style%3D%22fill%3A%20rgb%28211%2C%20211%2C%20143%29%3B%20stroke%3A%20rgb%28255%2C%20255%2C%20255%29%3B%22%3E%3C/circle%3E%3Ccircle%20class%3D%22dot%22%20cx%3D%22113.890625%22%20cy%3D%2244.80316666666667%22%20r%3D%223%22%20style%3D%22fill%3A%20rgb%28211%2C%20211%2C%20143%29%3B%20stroke%3A%20rgb%28255%2C%20255%2C%20255%29%3B%22%3E%3C/circle%3E%3C/g%3E%3C/g%3E%3C/svg%3E",
        "title":
            "Average Income for Family Households in California",
        "type":
            "LINE",
        "data": {
            "Average Income for Family Households": [{
                "date": "2019",
                "value": 119126
            }, {
                "date": "2018",
                "value": 113046
            }, {
                "date": "2017",
                "value": 106970
            }, {
                "date": "2016",
                "value": 101373
            }, {
                "date": "2015",
                "value": 97665
            }, {
                "date": "2014",
                "value": 96357
            }, {
                "date": "2013",
                "value": 94926
            }, {
                "date": "2012",
                "value": 94829
            }, {
                "date": "2011",
                "value": 94747
            }, {
                "date": "2010",
                "value": 92942
            }]
        }
    }, {
        "data_csv":
            "label,Individual Median Income,Individual Median Earnings\r\n2020,33719,\r\n2019,31960,\r\n2018,30797,\r\n2017,29454,\r\n2016,27772,31736\r\n2015,27035,31296\r\n2014,26932,31345\r\n2013,26893,31212\r\n2012,27129,31272\r\n2011,27355,31507\r\n2010,,31245",
        "legend": ["Individual Median Income", "Individual Median Earnings"],
        "srcs": [{
            "name":
                "census.gov",
            "url":
                "https://www.census.gov/programs-surveys/acs/data/data-via-ftp.html"
        }],
        "svg":
            "data:image/svg+xml;%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20xmlns%3Axlink%3D%22http%3A//www.w3.org/1999/xlink%22%20width%3D%22875%22%20height%3D%22160%22%3E%3Cg%20class%3D%22x%20axis%22%20transform%3D%22translate%280%2C%20130%29%22%20fill%3D%22none%22%20font-size%3D%2210%22%20font-family%3D%22sans-serif%22%20text-anchor%3D%22middle%22%3E%3Cpath%20class%3D%22domain%22%20stroke%3D%22%23999%22%20d%3D%22M0%2C0.5H865.5%22%20transform%3D%22translate%280%2C%200%29%22%3E%3C/path%3E%3Cg%20class%3D%22tick%22%20opacity%3D%221%22%20transform%3D%22translate%2850.30097592072836%2C0%29%22%3E%3Cline%20stroke%3D%22%23999%22%20y2%3D%226%22%20stroke-width%3D%220.5%22%3E%3C/line%3E%3Ctext%20fill%3D%22currentColor%22%20y%3D%229%22%20dy%3D%220.71em%22%3E2010%3C/text%3E%3C/g%3E%3Cg%20class%3D%22tick%22%20opacity%3D%221%22%20transform%3D%22translate%28213.26636731585432%2C0%29%22%3E%3Cline%20stroke%3D%22%23999%22%20y2%3D%226%22%20stroke-width%3D%220.5%22%3E%3C/line%3E%3Ctext%20fill%3D%22currentColor%22%20y%3D%229%22%20dy%3D%220.71em%22%3E2012%3C/text%3E%3C/g%3E%3Cg%20class%3D%22tick%22%20opacity%3D%221%22%20transform%3D%22translate%28376.4549989731654%2C0%29%22%3E%3Cline%20stroke%3D%22%23999%22%20y2%3D%226%22%20stroke-width%3D%220.5%22%3E%3C/line%3E%3Ctext%20fill%3D%22currentColor%22%20y%3D%229%22%20dy%3D%220.71em%22%3E2014%3C/text%3E%3C/g%3E%3Cg%20class%3D%22tick%22%20opacity%3D%221%22%20transform%3D%22translate%28539.4203903682914%2C0%29%22%3E%3Cline%20stroke%3D%22%23999%22%20y2%3D%226%22%20stroke-width%3D%220.5%22%3E%3C/line%3E%3Ctext%20fill%3D%22currentColor%22%20y%3D%229%22%20dy%3D%220.71em%22%3E2016%3C/text%3E%3C/g%3E%3Cg%20class%3D%22tick%22%20opacity%3D%221%22%20transform%3D%22translate%28702.6090220256024%2C0%29%22%3E%3Cline%20stroke%3D%22%23999%22%20y2%3D%226%22%20stroke-width%3D%220.5%22%3E%3C/line%3E%3Ctext%20fill%3D%22currentColor%22%20y%3D%229%22%20dy%3D%220.71em%22%3E2018%3C/text%3E%3C/g%3E%3C/g%3E%3Cg%20class%3D%22y%20axis%22%20transform%3D%22translate%28865%2C%200%29%22%20fill%3D%22none%22%20font-size%3D%2210%22%20font-family%3D%22sans-serif%22%20text-anchor%3D%22end%22%3E%3Cg%20class%3D%22tick%22%20opacity%3D%221%22%20transform%3D%22translate%280%2C130.5%29%22%3E%3Cline%20stroke%3D%22currentColor%22%20x2%3D%22-865%22%20class%3D%22grid-line%22%20style%3D%22stroke%3A%20rgb%28153%2C%20153%2C%20153%29%3B%20stroke-width%3A%200.5%3B%20stroke-opacity%3A%200.5%3B%20stroke-dasharray%3A%202%2C%202%3B%22%3E%3C/line%3E%3Ctext%20fill%3D%22currentColor%22%20x%3D%22-865%22%20dy%3D%22-4%22%20style%3D%22fill%3A%20rgb%2843%2C%2041%2C%2041%29%3B%20shape-rendering%3A%20crispedges%3B%20font-family%3A%20Roboto%3B%22%20transform%3D%22translate%2839.7265625%2C%200%29%22%3E0%20USD%3C/text%3E%3C/g%3E%3Cg%20class%3D%22tick%22%20opacity%3D%221%22%20transform%3D%22translate%280%2C114.78571428571429%29%22%3E%3Cline%20stroke%3D%22currentColor%22%20x2%3D%22-865%22%20class%3D%22grid-line%22%20style%3D%22stroke%3A%20rgb%28153%2C%20153%2C%20153%29%3B%20stroke-width%3A%200.5%3B%20stroke-opacity%3A%200.5%3B%20stroke-dasharray%3A%202%2C%202%3B%22%3E%3C/line%3E%3Ctext%20fill%3D%22currentColor%22%20x%3D%22-865%22%20dy%3D%22-4%22%20style%3D%22fill%3A%20rgb%2843%2C%2041%2C%2041%29%3B%20shape-rendering%3A%20crispedges%3B%20font-family%3A%20Roboto%3B%22%20transform%3D%22translate%2839.7265625%2C%200%29%22%3E5K%20USD%3C/text%3E%3C/g%3E%3Cg%20class%3D%22tick%22%20opacity%3D%221%22%20transform%3D%22translate%280%2C99.07142857142857%29%22%3E%3Cline%20stroke%3D%22currentColor%22%20x2%3D%22-865%22%20class%3D%22grid-line%22%20style%3D%22stroke%3A%20rgb%28153%2C%20153%2C%20153%29%3B%20stroke-width%3A%200.5%3B%20stroke-opacity%3A%200.5%3B%20stroke-dasharray%3A%202%2C%202%3B%22%3E%3C/line%3E%3Ctext%20fill%3D%22currentColor%22%20x%3D%22-865%22%20dy%3D%22-4%22%20style%3D%22fill%3A%20rgb%2843%2C%2041%2C%2041%29%3B%20shape-rendering%3A%20crispedges%3B%20font-family%3A%20Roboto%3B%22%20transform%3D%22translate%2839.7265625%2C%200%29%22%3E10K%20USD%3C/text%3E%3C/g%3E%3Cg%20class%3D%22tick%22%20opacity%3D%221%22%20transform%3D%22translate%280%2C83.35714285714285%29%22%3E%3Cline%20stroke%3D%22currentColor%22%20x2%3D%22-865%22%20class%3D%22grid-line%22%20style%3D%22stroke%3A%20rgb%28153%2C%20153%2C%20153%29%3B%20stroke-width%3A%200.5%3B%20stroke-opacity%3A%200.5%3B%20stroke-dasharray%3A%202%2C%202%3B%22%3E%3C/line%3E%3Ctext%20fill%3D%22currentColor%22%20x%3D%22-865%22%20dy%3D%22-4%22%20style%3D%22fill%3A%20rgb%2843%2C%2041%2C%2041%29%3B%20shape-rendering%3A%20crispedges%3B%20font-family%3A%20Roboto%3B%22%20transform%3D%22translate%2839.7265625%2C%200%29%22%3E15K%20USD%3C/text%3E%3C/g%3E%3Cg%20class%3D%22tick%22%20opacity%3D%221%22%20transform%3D%22translate%280%2C67.64285714285714%29%22%3E%3Cline%20stroke%3D%22currentColor%22%20x2%3D%22-865%22%20class%3D%22grid-line%22%20style%3D%22stroke%3A%20rgb%28153%2C%20153%2C%20153%29%3B%20stroke-width%3A%200.5%3B%20stroke-opacity%3A%200.5%3B%20stroke-dasharray%3A%202%2C%202%3B%22%3E%3C/line%3E%3Ctext%20fill%3D%22currentColor%22%20x%3D%22-865%22%20dy%3D%22-4%22%20style%3D%22fill%3A%20rgb%2843%2C%2041%2C%2041%29%3B%20shape-rendering%3A%20crispedges%3B%20font-family%3A%20Roboto%3B%22%20transform%3D%22translate%2839.7265625%2C%200%29%22%3E20K%20USD%3C/text%3E%3C/g%3E%3Cg%20class%3D%22tick%22%20opacity%3D%221%22%20transform%3D%22translate%280%2C51.92857142857142%29%22%3E%3Cline%20stroke%3D%22currentColor%22%20x2%3D%22-865%22%20class%3D%22grid-line%22%20style%3D%22stroke%3A%20rgb%28153%2C%20153%2C%20153%29%3B%20stroke-width%3A%200.5%3B%20stroke-opacity%3A%200.5%3B%20stroke-dasharray%3A%202%2C%202%3B%22%3E%3C/line%3E%3Ctext%20fill%3D%22currentColor%22%20x%3D%22-865%22%20dy%3D%22-4%22%20style%3D%22fill%3A%20rgb%2843%2C%2041%2C%2041%29%3B%20shape-rendering%3A%20crispedges%3B%20font-family%3A%20Roboto%3B%22%20transform%3D%22translate%2839.7265625%2C%200%29%22%3E25K%20USD%3C/text%3E%3C/g%3E%3Cg%20class%3D%22tick%22%20opacity%3D%221%22%20transform%3D%22translate%280%2C36.21428571428572%29%22%3E%3Cline%20stroke%3D%22currentColor%22%20x2%3D%22-865%22%20class%3D%22grid-line%22%20style%3D%22stroke%3A%20rgb%28153%2C%20153%2C%20153%29%3B%20stroke-width%3A%200.5%3B%20stroke-opacity%3A%200.5%3B%20stroke-dasharray%3A%202%2C%202%3B%22%3E%3C/line%3E%3Ctext%20fill%3D%22currentColor%22%20x%3D%22-865%22%20dy%3D%22-4%22%20style%3D%22fill%3A%20rgb%2843%2C%2041%2C%2041%29%3B%20shape-rendering%3A%20crispedges%3B%20font-family%3A%20Roboto%3B%22%20transform%3D%22translate%2839.7265625%2C%200%29%22%3E30K%20USD%3C/text%3E%3C/g%3E%3Cg%20class%3D%22tick%22%20opacity%3D%221%22%20transform%3D%22translate%280%2C20.5%29%22%3E%3Cline%20stroke%3D%22currentColor%22%20x2%3D%22-865%22%20class%3D%22grid-line%22%20style%3D%22stroke%3A%20rgb%28153%2C%20153%2C%20153%29%3B%20stroke-width%3A%200.5%3B%20stroke-opacity%3A%200.5%3B%20stroke-dasharray%3A%202%2C%202%3B%22%3E%3C/line%3E%3Ctext%20fill%3D%22currentColor%22%20x%3D%22-865%22%20dy%3D%22-4%22%20style%3D%22fill%3A%20rgb%2843%2C%2041%2C%2041%29%3B%20shape-rendering%3A%20crispedges%3B%20font-family%3A%20Roboto%3B%22%20transform%3D%22translate%2839.7265625%2C%200%29%22%3E35K%20USD%3C/text%3E%3C/g%3E%3C/g%3E%3Cg%20class%3D%22highlight%22%3E%3C/g%3E%3Cg%20class%3D%22chart-area%22%3E%3Cpath%20class%3D%22line%22%20d%3D%22M865%2C24.025999999999996L783.517304302437%2C29.554285714285715L702.0346086048742%2C33.20942857142857L620.5519129073111%2C37.430285714285716L538.845976947563%2C42.716571428571434L457.36328125%2C45.03285714285714L375.8805855524371%2C45.35657142857143L294.39788985487405%2C45.479142857142854L212.69195389512598%2C44.737428571428566L131.20925819756297%2C44.027142857142856%22%20style%3D%22stroke%3A%20rgb%28147%2C%200%2C%200%29%3B%20fill%3A%20none%3B%20stroke-width%3A%202.5px%3B%22%3E%3C/path%3E%3Cg%3E%3Ccircle%20class%3D%22dot%22%20cx%3D%22865%22%20cy%3D%2224.025999999999996%22%20r%3D%223%22%20style%3D%22fill%3A%20rgb%28147%2C%200%2C%200%29%3B%20stroke%3A%20rgb%28255%2C%20255%2C%20255%29%3B%22%3E%3C/circle%3E%3Ccircle%20class%3D%22dot%22%20cx%3D%22783.517304302437%22%20cy%3D%2229.554285714285715%22%20r%3D%223%22%20style%3D%22fill%3A%20rgb%28147%2C%200%2C%200%29%3B%20stroke%3A%20rgb%28255%2C%20255%2C%20255%29%3B%22%3E%3C/circle%3E%3Ccircle%20class%3D%22dot%22%20cx%3D%22702.0346086048742%22%20cy%3D%2233.20942857142857%22%20r%3D%223%22%20style%3D%22fill%3A%20rgb%28147%2C%200%2C%200%29%3B%20stroke%3A%20rgb%28255%2C%20255%2C%20255%29%3B%22%3E%3C/circle%3E%3Ccircle%20class%3D%22dot%22%20cx%3D%22620.5519129073111%22%20cy%3D%2237.430285714285716%22%20r%3D%223%22%20style%3D%22fill%3A%20rgb%28147%2C%200%2C%200%29%3B%20stroke%3A%20rgb%28255%2C%20255%2C%20255%29%3B%22%3E%3C/circle%3E%3Ccircle%20class%3D%22dot%22%20cx%3D%22538.845976947563%22%20cy%3D%2242.716571428571434%22%20r%3D%223%22%20style%3D%22fill%3A%20rgb%28147%2C%200%2C%200%29%3B%20stroke%3A%20rgb%28255%2C%20255%2C%20255%29%3B%22%3E%3C/circle%3E%3Ccircle%20class%3D%22dot%22%20cx%3D%22457.36328125%22%20cy%3D%2245.03285714285714%22%20r%3D%223%22%20style%3D%22fill%3A%20rgb%28147%2C%200%2C%200%29%3B%20stroke%3A%20rgb%28255%2C%20255%2C%20255%29%3B%22%3E%3C/circle%3E%3Ccircle%20class%3D%22dot%22%20cx%3D%22375.8805855524371%22%20cy%3D%2245.35657142857143%22%20r%3D%223%22%20style%3D%22fill%3A%20rgb%28147%2C%200%2C%200%29%3B%20stroke%3A%20rgb%28255%2C%20255%2C%20255%29%3B%22%3E%3C/circle%3E%3Ccircle%20class%3D%22dot%22%20cx%3D%22294.39788985487405%22%20cy%3D%2245.479142857142854%22%20r%3D%223%22%20style%3D%22fill%3A%20rgb%28147%2C%200%2C%200%29%3B%20stroke%3A%20rgb%28255%2C%20255%2C%20255%29%3B%22%3E%3C/circle%3E%3Ccircle%20class%3D%22dot%22%20cx%3D%22212.69195389512598%22%20cy%3D%2244.737428571428566%22%20r%3D%223%22%20style%3D%22fill%3A%20rgb%28147%2C%200%2C%200%29%3B%20stroke%3A%20rgb%28255%2C%20255%2C%20255%29%3B%22%3E%3C/circle%3E%3Ccircle%20class%3D%22dot%22%20cx%3D%22131.20925819756297%22%20cy%3D%2244.027142857142856%22%20r%3D%223%22%20style%3D%22fill%3A%20rgb%28147%2C%200%2C%200%29%3B%20stroke%3A%20rgb%28255%2C%20255%2C%20255%29%3B%22%3E%3C/circle%3E%3C/g%3E%3Cpath%20class%3D%22line%22%20d%3D%22M538.845976947563%2C30.25828571428571L457.36328125%2C31.641142857142853L375.8805855524371%2C31.487142857142857L294.39788985487405%2C31.905142857142863L212.69195389512598%2C31.716571428571427L131.20925819756297%2C30.978L49.7265625%2C31.801428571428573%22%20style%3D%22stroke%3A%20rgb%2894%2C%2079%2C%20162%29%3B%20fill%3A%20none%3B%20stroke-width%3A%202.5px%3B%22%3E%3C/path%3E%3Cg%3E%3Ccircle%20class%3D%22dot%22%20cx%3D%22538.845976947563%22%20cy%3D%2230.25828571428571%22%20r%3D%223%22%20style%3D%22fill%3A%20rgb%2894%2C%2079%2C%20162%29%3B%20stroke%3A%20rgb%28255%2C%20255%2C%20255%29%3B%22%3E%3C/circle%3E%3Ccircle%20class%3D%22dot%22%20cx%3D%22457.36328125%22%20cy%3D%2231.641142857142853%22%20r%3D%223%22%20style%3D%22fill%3A%20rgb%2894%2C%2079%2C%20162%29%3B%20stroke%3A%20rgb%28255%2C%20255%2C%20255%29%3B%22%3E%3C/circle%3E%3Ccircle%20class%3D%22dot%22%20cx%3D%22375.8805855524371%22%20cy%3D%2231.487142857142857%22%20r%3D%223%22%20style%3D%22fill%3A%20rgb%2894%2C%2079%2C%20162%29%3B%20stroke%3A%20rgb%28255%2C%20255%2C%20255%29%3B%22%3E%3C/circle%3E%3Ccircle%20class%3D%22dot%22%20cx%3D%22294.39788985487405%22%20cy%3D%2231.905142857142863%22%20r%3D%223%22%20style%3D%22fill%3A%20rgb%2894%2C%2079%2C%20162%29%3B%20stroke%3A%20rgb%28255%2C%20255%2C%20255%29%3B%22%3E%3C/circle%3E%3Ccircle%20class%3D%22dot%22%20cx%3D%22212.69195389512598%22%20cy%3D%2231.716571428571427%22%20r%3D%223%22%20style%3D%22fill%3A%20rgb%2894%2C%2079%2C%20162%29%3B%20stroke%3A%20rgb%28255%2C%20255%2C%20255%29%3B%22%3E%3C/circle%3E%3Ccircle%20class%3D%22dot%22%20cx%3D%22131.20925819756297%22%20cy%3D%2230.978%22%20r%3D%223%22%20style%3D%22fill%3A%20rgb%2894%2C%2079%2C%20162%29%3B%20stroke%3A%20rgb%28255%2C%20255%2C%20255%29%3B%22%3E%3C/circle%3E%3Ccircle%20class%3D%22dot%22%20cx%3D%2249.7265625%22%20cy%3D%2231.801428571428573%22%20r%3D%223%22%20style%3D%22fill%3A%20rgb%2894%2C%2079%2C%20162%29%3B%20stroke%3A%20rgb%28255%2C%20255%2C%20255%29%3B%22%3E%3C/circle%3E%3C/g%3E%3C/g%3E%3C/svg%3E",
        "title":
            "Individual Income in California",
        "type":
            "LINE",
        "data": {
            "Individual Income in California": [{
                "date": "2020",
                "value": 33719
            }, {
                "date": "2019",
                "value": 31960
            }, {
                "date": "2018",
                "value": 30797
            }, {
                "date": "2017",
                "value": 29454
            }, {
                "date": "2016",
                "value": 27772
            }, {
                "date": "2015",
                "value": 27035
            }, {
                "date": "2014",
                "value": 26932
            }, {
                "date": "2013",
                "value": 26893
            }, {
                "date": "2012",
                "value": 27129
            }, {
                "date": "2011",
                "value": 27355
            }],
            "Individual Median Earnings": [{
                "date": "2016",
                "value": 31736
            }, {
                "date": "2015",
                "value": 31296
            }, {
                "date": "2014",
                "value": 31345
            }, {
                "date": "2013",
                "value": 31212
            }, {
                "date": "2012",
                "value": 31272
            }, {
                "date": "2011",
                "value": 31507
            }, {
                "date": "2010",
                "value": 31245
            }]
        }
    }, {
        "data_csv":
            "label,Household Median Income\r\n2020,78672\r\n2019,75235\r\n2018,71228\r\n2017,67169\r\n2016,63783\r\n2015,61818\r\n2014,61489\r\n2013,61094\r\n2012,61400\r\n2011,61632",
        "legend": ["Household Median Income"],
        "srcs": [{
            "name":
                "census.gov",
            "url":
                "https://www.census.gov/programs-surveys/acs/data/data-via-ftp.html"
        }],
        "svg":
            "data:image/svg+xml;%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20xmlns%3Axlink%3D%22http%3A//www.w3.org/1999/xlink%22%20width%3D%22875%22%20height%3D%22160%22%3E%3Cg%20class%3D%22x%20axis%22%20transform%3D%22translate%280%2C%20130%29%22%20fill%3D%22none%22%20font-size%3D%2210%22%20font-family%3D%22sans-serif%22%20text-anchor%3D%22middle%22%3E%3Cpath%20class%3D%22domain%22%20stroke%3D%22%23999%22%20d%3D%22M0%2C0.5H865.5%22%20transform%3D%22translate%280%2C%200%29%22%3E%3C/path%3E%3Cg%20class%3D%22tick%22%20opacity%3D%221%22%20transform%3D%22translate%28140.84005884925463%2C0%29%22%3E%3Cline%20stroke%3D%22%23999%22%20y2%3D%226%22%20stroke-width%3D%220.5%22%3E%3C/line%3E%3Ctext%20fill%3D%22currentColor%22%20y%3D%229%22%20dy%3D%220.71em%22%3E2012%3C/text%3E%3C/g%3E%3Cg%20class%3D%22tick%22%20opacity%3D%221%22%20transform%3D%22translate%28322.14972809552785%2C0%29%22%3E%3Cline%20stroke%3D%22%23999%22%20y2%3D%226%22%20stroke-width%3D%220.5%22%3E%3C/line%3E%3Ctext%20fill%3D%22currentColor%22%20y%3D%229%22%20dy%3D%220.71em%22%3E2014%3C/text%3E%3C/g%3E%3Cg%20class%3D%22tick%22%20opacity%3D%221%22%20transform%3D%22translate%28503.2113676985093%2C0%29%22%3E%3Cline%20stroke%3D%22%23999%22%20y2%3D%226%22%20stroke-width%3D%220.5%22%3E%3C/line%3E%3Ctext%20fill%3D%22currentColor%22%20y%3D%229%22%20dy%3D%220.71em%22%3E2016%3C/text%3E%3C/g%3E%3Cg%20class%3D%22tick%22%20opacity%3D%221%22%20transform%3D%22translate%28684.5210369447824%2C0%29%22%3E%3Cline%20stroke%3D%22%23999%22%20y2%3D%226%22%20stroke-width%3D%220.5%22%3E%3C/line%3E%3Ctext%20fill%3D%22currentColor%22%20y%3D%229%22%20dy%3D%220.71em%22%3E2018%3C/text%3E%3C/g%3E%3C/g%3E%3Cg%20class%3D%22y%20axis%22%20transform%3D%22translate%28865%2C%200%29%22%20fill%3D%22none%22%20font-size%3D%2210%22%20font-family%3D%22sans-serif%22%20text-anchor%3D%22end%22%3E%3Cg%20class%3D%22tick%22%20opacity%3D%221%22%20transform%3D%22translate%280%2C130.5%29%22%3E%3Cline%20stroke%3D%22currentColor%22%20x2%3D%22-865%22%20class%3D%22grid-line%22%20style%3D%22stroke%3A%20rgb%28153%2C%20153%2C%20153%29%3B%20stroke-width%3A%200.5%3B%20stroke-opacity%3A%200.5%3B%20stroke-dasharray%3A%202%2C%202%3B%22%3E%3C/line%3E%3Ctext%20fill%3D%22currentColor%22%20x%3D%22-865%22%20dy%3D%22-4%22%20style%3D%22fill%3A%20rgb%2843%2C%2041%2C%2041%29%3B%20shape-rendering%3A%20crispedges%3B%20font-family%3A%20Roboto%3B%22%20transform%3D%22translate%2839.7265625%2C%200%29%22%3E0%20USD%3C/text%3E%3C/g%3E%3Cg%20class%3D%22tick%22%20opacity%3D%221%22%20transform%3D%22translate%280%2C103%29%22%3E%3Cline%20stroke%3D%22currentColor%22%20x2%3D%22-865%22%20class%3D%22grid-line%22%20style%3D%22stroke%3A%20rgb%28153%2C%20153%2C%20153%29%3B%20stroke-width%3A%200.5%3B%20stroke-opacity%3A%200.5%3B%20stroke-dasharray%3A%202%2C%202%3B%22%3E%3C/line%3E%3Ctext%20fill%3D%22currentColor%22%20x%3D%22-865%22%20dy%3D%22-4%22%20style%3D%22fill%3A%20rgb%2843%2C%2041%2C%2041%29%3B%20shape-rendering%3A%20crispedges%3B%20font-family%3A%20Roboto%3B%22%20transform%3D%22translate%2839.7265625%2C%200%29%22%3E20K%20USD%3C/text%3E%3C/g%3E%3Cg%20class%3D%22tick%22%20opacity%3D%221%22%20transform%3D%22translate%280%2C75.5%29%22%3E%3Cline%20stroke%3D%22currentColor%22%20x2%3D%22-865%22%20class%3D%22grid-line%22%20style%3D%22stroke%3A%20rgb%28153%2C%20153%2C%20153%29%3B%20stroke-width%3A%200.5%3B%20stroke-opacity%3A%200.5%3B%20stroke-dasharray%3A%202%2C%202%3B%22%3E%3C/line%3E%3Ctext%20fill%3D%22currentColor%22%20x%3D%22-865%22%20dy%3D%22-4%22%20style%3D%22fill%3A%20rgb%2843%2C%2041%2C%2041%29%3B%20shape-rendering%3A%20crispedges%3B%20font-family%3A%20Roboto%3B%22%20transform%3D%22translate%2839.7265625%2C%200%29%22%3E40K%20USD%3C/text%3E%3C/g%3E%3Cg%20class%3D%22tick%22%20opacity%3D%221%22%20transform%3D%22translate%280%2C48%29%22%3E%3Cline%20stroke%3D%22currentColor%22%20x2%3D%22-865%22%20class%3D%22grid-line%22%20style%3D%22stroke%3A%20rgb%28153%2C%20153%2C%20153%29%3B%20stroke-width%3A%200.5%3B%20stroke-opacity%3A%200.5%3B%20stroke-dasharray%3A%202%2C%202%3B%22%3E%3C/line%3E%3Ctext%20fill%3D%22currentColor%22%20x%3D%22-865%22%20dy%3D%22-4%22%20style%3D%22fill%3A%20rgb%2843%2C%2041%2C%2041%29%3B%20shape-rendering%3A%20crispedges%3B%20font-family%3A%20Roboto%3B%22%20transform%3D%22translate%2839.7265625%2C%200%29%22%3E60K%20USD%3C/text%3E%3C/g%3E%3Cg%20class%3D%22tick%22%20opacity%3D%221%22%20transform%3D%22translate%280%2C20.5%29%22%3E%3Cline%20stroke%3D%22currentColor%22%20x2%3D%22-865%22%20class%3D%22grid-line%22%20style%3D%22stroke%3A%20rgb%28153%2C%20153%2C%20153%29%3B%20stroke-width%3A%200.5%3B%20stroke-opacity%3A%200.5%3B%20stroke-dasharray%3A%202%2C%202%3B%22%3E%3C/line%3E%3Ctext%20fill%3D%22currentColor%22%20x%3D%22-865%22%20dy%3D%22-4%22%20style%3D%22fill%3A%20rgb%2843%2C%2041%2C%2041%29%3B%20shape-rendering%3A%20crispedges%3B%20font-family%3A%20Roboto%3B%22%20transform%3D%22translate%2839.7265625%2C%200%29%22%3E80K%20USD%3C/text%3E%3C/g%3E%3C/g%3E%3Cg%20class%3D%22highlight%22%3E%3C/g%3E%3Cg%20class%3D%22chart-area%22%3E%3Cpath%20class%3D%22line%22%20d%3D%22M865%2C21.825999999999993L774.4691801985092%2C26.551874999999995L683.9383603970186%2C32.0615L593.4075405955278%2C37.642625L502.62869115074534%2C42.29837499999999L412.0978713492546%2C45.00025L321.5670515477639%2C45.452625L231.0362317462732%2C45.99575L140.25738230149074%2C45.575L49.7265625%2C45.256%22%20style%3D%22stroke%3A%20rgb%28252%2C%20191%2C%20113%29%3B%20fill%3A%20none%3B%20stroke-width%3A%202.5px%3B%22%3E%3C/path%3E%3Cg%3E%3Ccircle%20class%3D%22dot%22%20cx%3D%22865%22%20cy%3D%2221.825999999999993%22%20r%3D%223%22%20style%3D%22fill%3A%20rgb%28252%2C%20191%2C%20113%29%3B%20stroke%3A%20rgb%28255%2C%20255%2C%20255%29%3B%22%3E%3C/circle%3E%3Ccircle%20class%3D%22dot%22%20cx%3D%22774.4691801985092%22%20cy%3D%2226.551874999999995%22%20r%3D%223%22%20style%3D%22fill%3A%20rgb%28252%2C%20191%2C%20113%29%3B%20stroke%3A%20rgb%28255%2C%20255%2C%20255%29%3B%22%3E%3C/circle%3E%3Ccircle%20class%3D%22dot%22%20cx%3D%22683.9383603970186%22%20cy%3D%2232.0615%22%20r%3D%223%22%20style%3D%22fill%3A%20rgb%28252%2C%20191%2C%20113%29%3B%20stroke%3A%20rgb%28255%2C%20255%2C%20255%29%3B%22%3E%3C/circle%3E%3Ccircle%20class%3D%22dot%22%20cx%3D%22593.4075405955278%22%20cy%3D%2237.642625%22%20r%3D%223%22%20style%3D%22fill%3A%20rgb%28252%2C%20191%2C%20113%29%3B%20stroke%3A%20rgb%28255%2C%20255%2C%20255%29%3B%22%3E%3C/circle%3E%3Ccircle%20class%3D%22dot%22%20cx%3D%22502.62869115074534%22%20cy%3D%2242.29837499999999%22%20r%3D%223%22%20style%3D%22fill%3A%20rgb%28252%2C%20191%2C%20113%29%3B%20stroke%3A%20rgb%28255%2C%20255%2C%20255%29%3B%22%3E%3C/circle%3E%3Ccircle%20class%3D%22dot%22%20cx%3D%22412.0978713492546%22%20cy%3D%2245.00025%22%20r%3D%223%22%20style%3D%22fill%3A%20rgb%28252%2C%20191%2C%20113%29%3B%20stroke%3A%20rgb%28255%2C%20255%2C%20255%29%3B%22%3E%3C/circle%3E%3Ccircle%20class%3D%22dot%22%20cx%3D%22321.5670515477639%22%20cy%3D%2245.452625%22%20r%3D%223%22%20style%3D%22fill%3A%20rgb%28252%2C%20191%2C%20113%29%3B%20stroke%3A%20rgb%28255%2C%20255%2C%20255%29%3B%22%3E%3C/circle%3E%3Ccircle%20class%3D%22dot%22%20cx%3D%22231.0362317462732%22%20cy%3D%2245.99575%22%20r%3D%223%22%20style%3D%22fill%3A%20rgb%28252%2C%20191%2C%20113%29%3B%20stroke%3A%20rgb%28255%2C%20255%2C%20255%29%3B%22%3E%3C/circle%3E%3Ccircle%20class%3D%22dot%22%20cx%3D%22140.25738230149074%22%20cy%3D%2245.575%22%20r%3D%223%22%20style%3D%22fill%3A%20rgb%28252%2C%20191%2C%20113%29%3B%20stroke%3A%20rgb%28255%2C%20255%2C%20255%29%3B%22%3E%3C/circle%3E%3Ccircle%20class%3D%22dot%22%20cx%3D%2249.7265625%22%20cy%3D%2245.256%22%20r%3D%223%22%20style%3D%22fill%3A%20rgb%28252%2C%20191%2C%20113%29%3B%20stroke%3A%20rgb%28255%2C%20255%2C%20255%29%3B%22%3E%3C/circle%3E%3C/g%3E%3C/g%3E%3C/svg%3E",
        "title":
            "Household Median Income in California",
        "type":
            "LINE",
        "data": {
            "Household Median Income": [{
                "date": "2020",
                "value": 78672
            }, {
                "date": "2019",
                "value": 75235
            }, {
                "date": "2018",
                "value": 71228
            }, {
                "date": "2017",
                "value": 67169
            }, {
                "date": "2016",
                "value": 63783
            }, {
                "date": "2015",
                "value": 61818
            }, {
                "date": "2014",
                "value": 61489
            }, {
                "date": "2013",
                "value": 61094
            }, {
                "date": "2012",
                "value": 61400
            }, {
                "date": "2011",
                "value": 61632
            }]
        }
    }]
}

# Key is classname of a chart type and value is a tag name that should be drawn
# in the svgs for that chart type
_CHART_TYPE_TO_DRAWN_SVG_TAG = {
    'line-chart': 'path',
    'map-chart': 'path',
    'disaster-event-map-tile': 'path',
    'bar-chart': 'rect',
    'scatter-chart': 'circle'
}


def _local_url():
  port = flask.request.environ.get('SERVER_PORT')
  return f'http://127.0.0.1:{port}/'


def _to_svg(svg_str):
  if ' xmlns=' not in svg_str:
    # This makes the SVG not render when opened on chrome.
    svg_str = svg_str.replace('<svg ',
                              '<svg xmlns="http://www.w3.org/2000/svg" ')
  if ' xlink:href' in svg_str:
    # This happens for SVGs with legend and causes an error when opened.
    svg_str = svg_str.replace(' xlink:href', ' href')
  svg_str = urllib.parse.quote(svg_str)
  return 'data:image/svg+xml;' + svg_str


def _get_attr(elt, attr):
  if elt:
    val = elt.get_attribute(attr)
    if val:
      return str(val)
  return ""


def _get_inline_svg(container):
  svg = container.find_element(By.TAG_NAME, 'svg')
  return _to_svg(_get_attr(svg, 'outerHTML'))


def _get_data_svg(div):
  return _to_svg(_get_attr(div, 'data-svg'))


def _check_svgs_drawn(driver):
  """Returns whether or not all svgs on a subject page are drawn"""
  subject_page = driver.find_element(By.ID, "subject-page-main-pane")
  for block in subject_page.find_elements(By.CLASS_NAME, "block"):
    # Check each chart in the block for any incomplete svgs
    for chart_container in block.find_elements(By.CLASS_NAME,
                                               "chart-container"):
      svg_tag_to_check = ""
      for chart_type_class in chart_container.get_attribute("class").split():
        if chart_type_class in _CHART_TYPE_TO_DRAWN_SVG_TAG:
          svg_tag_to_check = _CHART_TYPE_TO_DRAWN_SVG_TAG[chart_type_class]
          break
      # If there is no svg tag to check for, consider the svg complete
      if not svg_tag_to_check:
        continue
      drawn_objects = chart_container.find_elements(By.TAG_NAME,
                                                    svg_tag_to_check)
      # If there is svg tag to check for but no elements found for that tag,
      # return False
      if not drawn_objects:
        return False
  return True


def _get_legend_data(chart_container, css_selector, tag_name, chart):
  chart['legend'] = []
  legend = chart_container.find_element(By.CSS_SELECTOR, css_selector)
  if not legend:
    return
  for l in legend.find_elements(By.TAG_NAME, tag_name):
    # TODO: maybe convert rbg to color name.
    chart['legend'].append(l.text)


def _get_tile_data(chart_container):
  tile_data = chart_container.find_elements(By.CLASS_NAME, 'tile-data')
  if tile_data:
    return tile_data[0]
  return None


def scrape(query, driver):
  if query.lower() in _OVERRIDE_CHART_MAP:
    return _OVERRIDE_CHART_MAP[query.lower()]

  url = f'{_local_url()}nl/data#a=True&q={query}'
  logging.info(f'Scraping: {url}')
  driver.get(url)

  # Wait until the page has loaded.
  wait = WebDriverWait(driver, timeout=30, poll_frequency=0.25)
  wait.until(EC.presence_of_element_located((By.CLASS_NAME, 'chart-container')))
  wait.until(lambda d: _check_svgs_drawn(driver))

  charts = []
  subject_page = driver.find_element(By.ID, 'subject-page-main-pane')
  for block in subject_page.find_elements(By.CSS_SELECTOR, 'section.block'):
    for chart_container in block.find_elements(By.CLASS_NAME,
                                               'chart-container'):
      chart = {}

      # Get title.
      chart['title'] = chart_container.find_element(By.TAG_NAME, 'h4').text

      # Get sources.
      chart['srcs'] = []
      for src in chart_container.find_elements(By.CSS_SELECTOR, 'div.sources'):
        anchor = src.find_element(By.TAG_NAME, 'a')
        chart['srcs'].append({
            'name': anchor.text,
            'url': anchor.get_attribute('href')
        })

      # Get data csv.
      tile_data = _get_tile_data(chart_container)
      if tile_data:
        data_csv = _get_attr(tile_data, 'data-csv')
        if data_csv:
          chart['data_csv'] = data_csv

      classes = chart_container.get_attribute('class').split()
      if 'line-chart' in classes:
        chart['type'] = 'LINE'
        chart['svg'] = _get_inline_svg(chart_container)
        _get_legend_data(chart_container, 'div.legend', 'a', chart)
      elif 'map-chart' in classes:
        chart['type'] = 'MAP'
        chart['svg'] = _get_data_svg(tile_data)
        # Map's legend is part of the SVG.
      elif 'bar-chart' in classes:
        chart['type'] = 'BAR'
        chart['svg'] = _get_inline_svg(chart_container)
        _get_legend_data(chart_container, 'div.legend', 'a', chart)
      elif 'scatter-chart' in classes:
        chart['type'] = 'SCATTER'
        chart['svg'] = _get_inline_svg(chart_container)
        # Scatter's legend is part of the SVG.
      elif 'ranking-tile' in classes:
        chart['type'] = 'TABLE'
        chart['svg'] = _get_data_svg(tile_data)
      elif 'disaster-event-map-tile' in classes:
        chart['type'] = 'EVENT_MAP'
        chart['svg'] = _get_inline_svg(chart_container)
        _get_legend_data(chart_container, 'div.disaster-event-map-legend',
                         'span', chart)

      charts.append(chart)
  return charts
