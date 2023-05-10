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

import base64
import logging
import time

from bs4 import BeautifulSoup
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

_URL = 'https://dev.datacommons.org/nl#a=True&q='

_OVERRIDE_CHART_MAP = {
    'family earnings in california': [{
        "legend": ["Average Income for Family Households"],
        "srcs": [{
            "name":
                "data.census.gov",
            "url":
                "https://data.census.gov/cedsci/table?q=S1901&tid=ACSST5Y2019.S1901"
        }],
        "svg":
            "data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9IjE2MCIgd2lkdGg9Ijg3NSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+PGcgY2xhc3M9InggYXhpcyIgZmlsbD0ibm9uZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAsIDEzMCkiPjxwYXRoIGNsYXNzPSJkb21haW4iIGQ9Ik0wLDAuNUg4NjUuNSIgc3Ryb2tlPSIjOTk5IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwLCAwKSI+PC9wYXRoPjxnIGNsYXNzPSJ0aWNrIiBvcGFjaXR5PSIxIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxMTQuNDY2Nzk0Njk2Mjc4MjcsMCkiPjxsaW5lIHN0cm9rZT0iIzk5OSIgc3Ryb2tlLXdpZHRoPSIwLjUiIHkyPSI2Ij48L2xpbmU+PHRleHQgZHk9IjAuNzFlbSIgZmlsbD0iY3VycmVudENvbG9yIiB5PSI5Ij4yMDEwPC90ZXh0PjwvZz48ZyBjbGFzcz0idGljayIgb3BhY2l0eT0iMSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMjgxLjI3ODQyOTU0NTY4NSwwKSI+PGxpbmUgc3Ryb2tlPSIjOTk5IiBzdHJva2Utd2lkdGg9IjAuNSIgeTI9IjYiPjwvbGluZT48dGV4dCBkeT0iMC43MWVtIiBmaWxsPSJjdXJyZW50Q29sb3IiIHk9IjkiPjIwMTI8L3RleHQ+PC9nPjxnIGNsYXNzPSJ0aWNrIiBvcGFjaXR5PSIxIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0NDguMzE4NTczNDgzOTI2NTcsMCkiPjxsaW5lIHN0cm9rZT0iIzk5OSIgc3Ryb2tlLXdpZHRoPSIwLjUiIHkyPSI2Ij48L2xpbmU+PHRleHQgZHk9IjAuNzFlbSIgZmlsbD0iY3VycmVudENvbG9yIiB5PSI5Ij4yMDE0PC90ZXh0PjwvZz48ZyBjbGFzcz0idGljayIgb3BhY2l0eT0iMSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNjE1LjEzMDIwODMzMzMzMzMsMCkiPjxsaW5lIHN0cm9rZT0iIzk5OSIgc3Ryb2tlLXdpZHRoPSIwLjUiIHkyPSI2Ij48L2xpbmU+PHRleHQgZHk9IjAuNzFlbSIgZmlsbD0iY3VycmVudENvbG9yIiB5PSI5Ij4yMDE2PC90ZXh0PjwvZz48ZyBjbGFzcz0idGljayIgb3BhY2l0eT0iMSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNzgyLjE3MDM1MjI3MTU3NSwwKSI+PGxpbmUgc3Ryb2tlPSIjOTk5IiBzdHJva2Utd2lkdGg9IjAuNSIgeTI9IjYiPjwvbGluZT48dGV4dCBkeT0iMC43MWVtIiBmaWxsPSJjdXJyZW50Q29sb3IiIHk9IjkiPjIwMTg8L3RleHQ+PC9nPjwvZz48ZyBjbGFzcz0ieSBheGlzIiBmaWxsPSJub25lIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMCIgdGV4dC1hbmNob3I9ImVuZCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoODY1LCAwKSI+PGcgY2xhc3M9InRpY2siIG9wYWNpdHk9IjEiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAsMTMwLjUpIj48bGluZSBjbGFzcz0iZ3JpZC1saW5lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3R5bGU9InN0cm9rZTogcmdiKDE1MywgMTUzLCAxNTMpOyBzdHJva2Utd2lkdGg6IDAuNTsgc3Ryb2tlLW9wYWNpdHk6IDAuNTsgc3Ryb2tlLWRhc2hhcnJheTogMiwgMjsiIHgyPSItODY1Ij48L2xpbmU+PHRleHQgZHk9Ii00IiBmaWxsPSJjdXJyZW50Q29sb3IiIHN0eWxlPSJmaWxsOiByZ2IoNDMsIDQxLCA0MSk7IHNoYXBlLXJlbmRlcmluZzogY3Jpc3BlZGdlczsgZm9udC1mYW1pbHk6IFJvYm90bzsiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEwMy44OTA2MjUsIDApIiB4PSItODY1Ij4wIEluZmwuIGFkai4gVVNEIChDWSk8L3RleHQ+PC9nPjxnIGNsYXNzPSJ0aWNrIiBvcGFjaXR5PSIxIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwLDExMi4xNjY2NjY2NjY2NjY2NykiPjxsaW5lIGNsYXNzPSJncmlkLWxpbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHlsZT0ic3Ryb2tlOiByZ2IoMTUzLCAxNTMsIDE1Myk7IHN0cm9rZS13aWR0aDogMC41OyBzdHJva2Utb3BhY2l0eTogMC41OyBzdHJva2UtZGFzaGFycmF5OiAyLCAyOyIgeDI9Ii04NjUiPjwvbGluZT48dGV4dCBkeT0iLTQiIGZpbGw9ImN1cnJlbnRDb2xvciIgc3R5bGU9ImZpbGw6IHJnYig0MywgNDEsIDQxKTsgc2hhcGUtcmVuZGVyaW5nOiBjcmlzcGVkZ2VzOyBmb250LWZhbWlseTogUm9ib3RvOyIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTAzLjg5MDYyNSwgMCkiIHg9Ii04NjUiPjIwSyBJbmZsLiBhZGouIFVTRCAoQ1kpPC90ZXh0PjwvZz48ZyBjbGFzcz0idGljayIgb3BhY2l0eT0iMSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCw5My44MzMzMzMzMzMzMzMzNCkiPjxsaW5lIGNsYXNzPSJncmlkLWxpbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHlsZT0ic3Ryb2tlOiByZ2IoMTUzLCAxNTMsIDE1Myk7IHN0cm9rZS13aWR0aDogMC41OyBzdHJva2Utb3BhY2l0eTogMC41OyBzdHJva2UtZGFzaGFycmF5OiAyLCAyOyIgeDI9Ii04NjUiPjwvbGluZT48dGV4dCBkeT0iLTQiIGZpbGw9ImN1cnJlbnRDb2xvciIgc3R5bGU9ImZpbGw6IHJnYig0MywgNDEsIDQxKTsgc2hhcGUtcmVuZGVyaW5nOiBjcmlzcGVkZ2VzOyBmb250LWZhbWlseTogUm9ib3RvOyIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTAzLjg5MDYyNSwgMCkiIHg9Ii04NjUiPjQwSyBJbmZsLiBhZGouIFVTRCAoQ1kpPC90ZXh0PjwvZz48ZyBjbGFzcz0idGljayIgb3BhY2l0eT0iMSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCw3NS41KSI+PGxpbmUgY2xhc3M9ImdyaWQtbGluZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0eWxlPSJzdHJva2U6IHJnYigxNTMsIDE1MywgMTUzKTsgc3Ryb2tlLXdpZHRoOiAwLjU7IHN0cm9rZS1vcGFjaXR5OiAwLjU7IHN0cm9rZS1kYXNoYXJyYXk6IDIsIDI7IiB4Mj0iLTg2NSI+PC9saW5lPjx0ZXh0IGR5PSItNCIgZmlsbD0iY3VycmVudENvbG9yIiBzdHlsZT0iZmlsbDogcmdiKDQzLCA0MSwgNDEpOyBzaGFwZS1yZW5kZXJpbmc6IGNyaXNwZWRnZXM7IGZvbnQtZmFtaWx5OiBSb2JvdG87IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxMDMuODkwNjI1LCAwKSIgeD0iLTg2NSI+NjBLIEluZmwuIGFkai4gVVNEIChDWSk8L3RleHQ+PC9nPjxnIGNsYXNzPSJ0aWNrIiBvcGFjaXR5PSIxIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwLDU3LjE2NjY2NjY2NjY2NjY3KSI+PGxpbmUgY2xhc3M9ImdyaWQtbGluZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0eWxlPSJzdHJva2U6IHJnYigxNTMsIDE1MywgMTUzKTsgc3Ryb2tlLXdpZHRoOiAwLjU7IHN0cm9rZS1vcGFjaXR5OiAwLjU7IHN0cm9rZS1kYXNoYXJyYXk6IDIsIDI7IiB4Mj0iLTg2NSI+PC9saW5lPjx0ZXh0IGR5PSItNCIgZmlsbD0iY3VycmVudENvbG9yIiBzdHlsZT0iZmlsbDogcmdiKDQzLCA0MSwgNDEpOyBzaGFwZS1yZW5kZXJpbmc6IGNyaXNwZWRnZXM7IGZvbnQtZmFtaWx5OiBSb2JvdG87IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxMDMuODkwNjI1LCAwKSIgeD0iLTg2NSI+ODBLIEluZmwuIGFkai4gVVNEIChDWSk8L3RleHQ+PC9nPjxnIGNsYXNzPSJ0aWNrIiBvcGFjaXR5PSIxIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwLDM4LjgzMzMzMzMzMzMzMzMzKSI+PGxpbmUgY2xhc3M9ImdyaWQtbGluZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0eWxlPSJzdHJva2U6IHJnYigxNTMsIDE1MywgMTUzKTsgc3Ryb2tlLXdpZHRoOiAwLjU7IHN0cm9rZS1vcGFjaXR5OiAwLjU7IHN0cm9rZS1kYXNoYXJyYXk6IDIsIDI7IiB4Mj0iLTg2NSI+PC9saW5lPjx0ZXh0IGR5PSItNCIgZmlsbD0iY3VycmVudENvbG9yIiBzdHlsZT0iZmlsbDogcmdiKDQzLCA0MSwgNDEpOyBzaGFwZS1yZW5kZXJpbmc6IGNyaXNwZWRnZXM7IGZvbnQtZmFtaWx5OiBSb2JvdG87IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxMDMuODkwNjI1LCAwKSIgeD0iLTg2NSI+MTAwSyBJbmZsLiBhZGouIFVTRCAoQ1kpPC90ZXh0PjwvZz48ZyBjbGFzcz0idGljayIgb3BhY2l0eT0iMSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCwyMC41KSI+PGxpbmUgY2xhc3M9ImdyaWQtbGluZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0eWxlPSJzdHJva2U6IHJnYigxNTMsIDE1MywgMTUzKTsgc3Ryb2tlLXdpZHRoOiAwLjU7IHN0cm9rZS1vcGFjaXR5OiAwLjU7IHN0cm9rZS1kYXNoYXJyYXk6IDIsIDI7IiB4Mj0iLTg2NSI+PC9saW5lPjx0ZXh0IGR5PSItNCIgZmlsbD0iY3VycmVudENvbG9yIiBzdHlsZT0iZmlsbDogcmdiKDQzLCA0MSwgNDEpOyBzaGFwZS1yZW5kZXJpbmc6IGNyaXNwZWRnZXM7IGZvbnQtZmFtaWx5OiBSb2JvdG87IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxMDMuODkwNjI1LCAwKSIgeD0iLTg2NSI+MTIwSyBJbmZsLiBhZGouIFVTRCAoQ1kpPC90ZXh0PjwvZz48L2c+PGcgY2xhc3M9ImhpZ2hsaWdodCI+PC9nPjxnIGNsYXNzPSJjaGFydC1hcmVhIj48cGF0aCBjbGFzcz0ibGluZSIgZD0iTTg2NSwyMC44MDExNjY2NjY2NjY2NjNMNzgxLjU5NDE4MjU3NTI5NjYsMjYuMzc0NDk5OTk5OTk5OTk0TDY5OC4xODgzNjUxNTA1OTMzLDMxLjk0NDE2NjY2NjY2NjY3TDYxNC41NTQwMzg2MzcwNTUxLDM3LjA3NDc0OTk5OTk5OTk5NUw1MzEuMTQ4MjIxMjEyMzUxNyw0MC40NzM3NDk5OTk5OTk5OTVMNDQ3Ljc0MjQwMzc4NzY0ODMsNDEuNjcyNzVMMzY0LjMzNjU4NjM2Mjk0NDk2LDQyLjk4NDVMMjgwLjcwMjI1OTg0OTQwNjc0LDQzLjA3MzQxNjY2NjY2NjY3NEwxOTcuMjk2NDQyNDI0NzAzMzcsNDMuMTQ4NTgzMzMzMzMzMzNMMTEzLjg5MDYyNSw0NC44MDMxNjY2NjY2NjY2NyIgc3R5bGU9InN0cm9rZTogcmdiKDIxMSwgMjExLCAxNDMpOyBmaWxsOiBub25lOyBzdHJva2Utd2lkdGg6IDIuNXB4OyI+PC9wYXRoPjxnPjxjaXJjbGUgY2xhc3M9ImRvdCIgY3g9Ijg2NSIgY3k9IjIwLjgwMTE2NjY2NjY2NjY2MyIgcj0iMyIgc3R5bGU9ImZpbGw6IHJnYigyMTEsIDIxMSwgMTQzKTsgc3Ryb2tlOiByZ2IoMjU1LCAyNTUsIDI1NSk7Ij48L2NpcmNsZT48Y2lyY2xlIGNsYXNzPSJkb3QiIGN4PSI3ODEuNTk0MTgyNTc1Mjk2NiIgY3k9IjI2LjM3NDQ5OTk5OTk5OTk5NCIgcj0iMyIgc3R5bGU9ImZpbGw6IHJnYigyMTEsIDIxMSwgMTQzKTsgc3Ryb2tlOiByZ2IoMjU1LCAyNTUsIDI1NSk7Ij48L2NpcmNsZT48Y2lyY2xlIGNsYXNzPSJkb3QiIGN4PSI2OTguMTg4MzY1MTUwNTkzMyIgY3k9IjMxLjk0NDE2NjY2NjY2NjY3IiByPSIzIiBzdHlsZT0iZmlsbDogcmdiKDIxMSwgMjExLCAxNDMpOyBzdHJva2U6IHJnYigyNTUsIDI1NSwgMjU1KTsiPjwvY2lyY2xlPjxjaXJjbGUgY2xhc3M9ImRvdCIgY3g9IjYxNC41NTQwMzg2MzcwNTUxIiBjeT0iMzcuMDc0NzQ5OTk5OTk5OTk1IiByPSIzIiBzdHlsZT0iZmlsbDogcmdiKDIxMSwgMjExLCAxNDMpOyBzdHJva2U6IHJnYigyNTUsIDI1NSwgMjU1KTsiPjwvY2lyY2xlPjxjaXJjbGUgY2xhc3M9ImRvdCIgY3g9IjUzMS4xNDgyMjEyMTIzNTE3IiBjeT0iNDAuNDczNzQ5OTk5OTk5OTk1IiByPSIzIiBzdHlsZT0iZmlsbDogcmdiKDIxMSwgMjExLCAxNDMpOyBzdHJva2U6IHJnYigyNTUsIDI1NSwgMjU1KTsiPjwvY2lyY2xlPjxjaXJjbGUgY2xhc3M9ImRvdCIgY3g9IjQ0Ny43NDI0MDM3ODc2NDgzIiBjeT0iNDEuNjcyNzUiIHI9IjMiIHN0eWxlPSJmaWxsOiByZ2IoMjExLCAyMTEsIDE0Myk7IHN0cm9rZTogcmdiKDI1NSwgMjU1LCAyNTUpOyI+PC9jaXJjbGU+PGNpcmNsZSBjbGFzcz0iZG90IiBjeD0iMzY0LjMzNjU4NjM2Mjk0NDk2IiBjeT0iNDIuOTg0NSIgcj0iMyIgc3R5bGU9ImZpbGw6IHJnYigyMTEsIDIxMSwgMTQzKTsgc3Ryb2tlOiByZ2IoMjU1LCAyNTUsIDI1NSk7Ij48L2NpcmNsZT48Y2lyY2xlIGNsYXNzPSJkb3QiIGN4PSIyODAuNzAyMjU5ODQ5NDA2NzQiIGN5PSI0My4wNzM0MTY2NjY2NjY2NzQiIHI9IjMiIHN0eWxlPSJmaWxsOiByZ2IoMjExLCAyMTEsIDE0Myk7IHN0cm9rZTogcmdiKDI1NSwgMjU1LCAyNTUpOyI+PC9jaXJjbGU+PGNpcmNsZSBjbGFzcz0iZG90IiBjeD0iMTk3LjI5NjQ0MjQyNDcwMzM3IiBjeT0iNDMuMTQ4NTgzMzMzMzMzMzMiIHI9IjMiIHN0eWxlPSJmaWxsOiByZ2IoMjExLCAyMTEsIDE0Myk7IHN0cm9rZTogcmdiKDI1NSwgMjU1LCAyNTUpOyI+PC9jaXJjbGU+PGNpcmNsZSBjbGFzcz0iZG90IiBjeD0iMTEzLjg5MDYyNSIgY3k9IjQ0LjgwMzE2NjY2NjY2NjY3IiByPSIzIiBzdHlsZT0iZmlsbDogcmdiKDIxMSwgMjExLCAxNDMpOyBzdHJva2U6IHJnYigyNTUsIDI1NSwgMjU1KTsiPjwvY2lyY2xlPjwvZz48L2c+PC9zdmc+",
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
        "legend": ["Individual Median Income", "Individual Median Earnings"],
        "srcs": [{
            "name":
                "census.gov",
            "url":
                "https://www.census.gov/programs-surveys/acs/data/data-via-ftp.html"
        }],
        "svg":
            "data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9IjE2MCIgd2lkdGg9Ijg3NSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+PGcgY2xhc3M9InggYXhpcyIgZmlsbD0ibm9uZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAsIDEzMCkiPjxwYXRoIGNsYXNzPSJkb21haW4iIGQ9Ik0wLDAuNUg4NjUuNSIgc3Ryb2tlPSIjOTk5IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwLCAwKSI+PC9wYXRoPjxnIGNsYXNzPSJ0aWNrIiBvcGFjaXR5PSIxIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0OS41Mjc2MDkwMTU2MDc4OCwwKSI+PGxpbmUgc3Ryb2tlPSIjOTk5IiBzdHJva2Utd2lkdGg9IjAuNSIgeTI9IjYiPjwvbGluZT48dGV4dCBkeT0iMC43MWVtIiBmaWxsPSJjdXJyZW50Q29sb3IiIHk9IjkiPjIwMTA8L3RleHQ+PC9nPjxnIGNsYXNzPSJ0aWNrIiBvcGFjaXR5PSIxIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyMTIuNjQ3NjAzMTk2ODc4NCwwKSI+PGxpbmUgc3Ryb2tlPSIjOTk5IiBzdHJva2Utd2lkdGg9IjAuNSIgeTI9IjYiPjwvbGluZT48dGV4dCBkeT0iMC43MWVtIiBmaWxsPSJjdXJyZW50Q29sb3IiIHk9IjkiPjIwMTI8L3RleHQ+PC9nPjxnIGNsYXNzPSJ0aWNrIiBvcGFjaXR5PSIxIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzNzUuOTkxMDQ5NDI0OTcyNjMsMCkiPjxsaW5lIHN0cm9rZT0iIzk5OSIgc3Ryb2tlLXdpZHRoPSIwLjUiIHkyPSI2Ij48L2xpbmU+PHRleHQgZHk9IjAuNzFlbSIgZmlsbD0iY3VycmVudENvbG9yIiB5PSI5Ij4yMDE0PC90ZXh0PjwvZz48ZyBjbGFzcz0idGljayIgb3BhY2l0eT0iMSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNTM5LjExMTA0MzYwNjI0MzEsMCkiPjxsaW5lIHN0cm9rZT0iIzk5OSIgc3Ryb2tlLXdpZHRoPSIwLjUiIHkyPSI2Ij48L2xpbmU+PHRleHQgZHk9IjAuNzFlbSIgZmlsbD0iY3VycmVudENvbG9yIiB5PSI5Ij4yMDE2PC90ZXh0PjwvZz48ZyBjbGFzcz0idGljayIgb3BhY2l0eT0iMSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNzAyLjQ1NDQ4OTgzNDMzNzMsMCkiPjxsaW5lIHN0cm9rZT0iIzk5OSIgc3Ryb2tlLXdpZHRoPSIwLjUiIHkyPSI2Ij48L2xpbmU+PHRleHQgZHk9IjAuNzFlbSIgZmlsbD0iY3VycmVudENvbG9yIiB5PSI5Ij4yMDE4PC90ZXh0PjwvZz48L2c+PGcgY2xhc3M9InkgYXhpcyIgZmlsbD0ibm9uZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTAiIHRleHQtYW5jaG9yPSJlbmQiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDg2NSwgMCkiPjxnIGNsYXNzPSJ0aWNrIiBvcGFjaXR5PSIxIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwLDEzMC41KSI+PGxpbmUgY2xhc3M9ImdyaWQtbGluZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0eWxlPSJzdHJva2U6IHJnYigxNTMsIDE1MywgMTUzKTsgc3Ryb2tlLXdpZHRoOiAwLjU7IHN0cm9rZS1vcGFjaXR5OiAwLjU7IHN0cm9rZS1kYXNoYXJyYXk6IDIsIDI7IiB4Mj0iLTg2NSI+PC9saW5lPjx0ZXh0IGR5PSItNCIgZmlsbD0iY3VycmVudENvbG9yIiBzdHlsZT0iZmlsbDogcmdiKDQzLCA0MSwgNDEpOyBzaGFwZS1yZW5kZXJpbmc6IGNyaXNwZWRnZXM7IGZvbnQtZmFtaWx5OiBSb2JvdG87IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzOC45NTMxMjUsIDApIiB4PSItODY1Ij4wIFVTRDwvdGV4dD48L2c+PGcgY2xhc3M9InRpY2siIG9wYWNpdHk9IjEiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAsMTE0Ljc4NTcxNDI4NTcxNDI5KSI+PGxpbmUgY2xhc3M9ImdyaWQtbGluZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0eWxlPSJzdHJva2U6IHJnYigxNTMsIDE1MywgMTUzKTsgc3Ryb2tlLXdpZHRoOiAwLjU7IHN0cm9rZS1vcGFjaXR5OiAwLjU7IHN0cm9rZS1kYXNoYXJyYXk6IDIsIDI7IiB4Mj0iLTg2NSI+PC9saW5lPjx0ZXh0IGR5PSItNCIgZmlsbD0iY3VycmVudENvbG9yIiBzdHlsZT0iZmlsbDogcmdiKDQzLCA0MSwgNDEpOyBzaGFwZS1yZW5kZXJpbmc6IGNyaXNwZWRnZXM7IGZvbnQtZmFtaWx5OiBSb2JvdG87IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzOC45NTMxMjUsIDApIiB4PSItODY1Ij41SyBVU0Q8L3RleHQ+PC9nPjxnIGNsYXNzPSJ0aWNrIiBvcGFjaXR5PSIxIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwLDk5LjA3MTQyODU3MTQyODU3KSI+PGxpbmUgY2xhc3M9ImdyaWQtbGluZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0eWxlPSJzdHJva2U6IHJnYigxNTMsIDE1MywgMTUzKTsgc3Ryb2tlLXdpZHRoOiAwLjU7IHN0cm9rZS1vcGFjaXR5OiAwLjU7IHN0cm9rZS1kYXNoYXJyYXk6IDIsIDI7IiB4Mj0iLTg2NSI+PC9saW5lPjx0ZXh0IGR5PSItNCIgZmlsbD0iY3VycmVudENvbG9yIiBzdHlsZT0iZmlsbDogcmdiKDQzLCA0MSwgNDEpOyBzaGFwZS1yZW5kZXJpbmc6IGNyaXNwZWRnZXM7IGZvbnQtZmFtaWx5OiBSb2JvdG87IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzOC45NTMxMjUsIDApIiB4PSItODY1Ij4xMEsgVVNEPC90ZXh0PjwvZz48ZyBjbGFzcz0idGljayIgb3BhY2l0eT0iMSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCw4My4zNTcxNDI4NTcxNDI4NSkiPjxsaW5lIGNsYXNzPSJncmlkLWxpbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHlsZT0ic3Ryb2tlOiByZ2IoMTUzLCAxNTMsIDE1Myk7IHN0cm9rZS13aWR0aDogMC41OyBzdHJva2Utb3BhY2l0eTogMC41OyBzdHJva2UtZGFzaGFycmF5OiAyLCAyOyIgeDI9Ii04NjUiPjwvbGluZT48dGV4dCBkeT0iLTQiIGZpbGw9ImN1cnJlbnRDb2xvciIgc3R5bGU9ImZpbGw6IHJnYig0MywgNDEsIDQxKTsgc2hhcGUtcmVuZGVyaW5nOiBjcmlzcGVkZ2VzOyBmb250LWZhbWlseTogUm9ib3RvOyIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMzguOTUzMTI1LCAwKSIgeD0iLTg2NSI+MTVLIFVTRDwvdGV4dD48L2c+PGcgY2xhc3M9InRpY2siIG9wYWNpdHk9IjEiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAsNjcuNjQyODU3MTQyODU3MTQpIj48bGluZSBjbGFzcz0iZ3JpZC1saW5lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3R5bGU9InN0cm9rZTogcmdiKDE1MywgMTUzLCAxNTMpOyBzdHJva2Utd2lkdGg6IDAuNTsgc3Ryb2tlLW9wYWNpdHk6IDAuNTsgc3Ryb2tlLWRhc2hhcnJheTogMiwgMjsiIHgyPSItODY1Ij48L2xpbmU+PHRleHQgZHk9Ii00IiBmaWxsPSJjdXJyZW50Q29sb3IiIHN0eWxlPSJmaWxsOiByZ2IoNDMsIDQxLCA0MSk7IHNoYXBlLXJlbmRlcmluZzogY3Jpc3BlZGdlczsgZm9udC1mYW1pbHk6IFJvYm90bzsiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDM4Ljk1MzEyNSwgMCkiIHg9Ii04NjUiPjIwSyBVU0Q8L3RleHQ+PC9nPjxnIGNsYXNzPSJ0aWNrIiBvcGFjaXR5PSIxIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwLDUxLjkyODU3MTQyODU3MTQyKSI+PGxpbmUgY2xhc3M9ImdyaWQtbGluZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0eWxlPSJzdHJva2U6IHJnYigxNTMsIDE1MywgMTUzKTsgc3Ryb2tlLXdpZHRoOiAwLjU7IHN0cm9rZS1vcGFjaXR5OiAwLjU7IHN0cm9rZS1kYXNoYXJyYXk6IDIsIDI7IiB4Mj0iLTg2NSI+PC9saW5lPjx0ZXh0IGR5PSItNCIgZmlsbD0iY3VycmVudENvbG9yIiBzdHlsZT0iZmlsbDogcmdiKDQzLCA0MSwgNDEpOyBzaGFwZS1yZW5kZXJpbmc6IGNyaXNwZWRnZXM7IGZvbnQtZmFtaWx5OiBSb2JvdG87IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzOC45NTMxMjUsIDApIiB4PSItODY1Ij4yNUsgVVNEPC90ZXh0PjwvZz48ZyBjbGFzcz0idGljayIgb3BhY2l0eT0iMSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCwzNi4yMTQyODU3MTQyODU3MikiPjxsaW5lIGNsYXNzPSJncmlkLWxpbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHlsZT0ic3Ryb2tlOiByZ2IoMTUzLCAxNTMsIDE1Myk7IHN0cm9rZS13aWR0aDogMC41OyBzdHJva2Utb3BhY2l0eTogMC41OyBzdHJva2UtZGFzaGFycmF5OiAyLCAyOyIgeDI9Ii04NjUiPjwvbGluZT48dGV4dCBkeT0iLTQiIGZpbGw9ImN1cnJlbnRDb2xvciIgc3R5bGU9ImZpbGw6IHJnYig0MywgNDEsIDQxKTsgc2hhcGUtcmVuZGVyaW5nOiBjcmlzcGVkZ2VzOyBmb250LWZhbWlseTogUm9ib3RvOyIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMzguOTUzMTI1LCAwKSIgeD0iLTg2NSI+MzBLIFVTRDwvdGV4dD48L2c+PGcgY2xhc3M9InRpY2siIG9wYWNpdHk9IjEiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAsMjAuNSkiPjxsaW5lIGNsYXNzPSJncmlkLWxpbmUiIHN0cm9rZT0iY3VycmVudENvbG9yIiBzdHlsZT0ic3Ryb2tlOiByZ2IoMTUzLCAxNTMsIDE1Myk7IHN0cm9rZS13aWR0aDogMC41OyBzdHJva2Utb3BhY2l0eTogMC41OyBzdHJva2UtZGFzaGFycmF5OiAyLCAyOyIgeDI9Ii04NjUiPjwvbGluZT48dGV4dCBkeT0iLTQiIGZpbGw9ImN1cnJlbnRDb2xvciIgc3R5bGU9ImZpbGw6IHJnYig0MywgNDEsIDQxKTsgc2hhcGUtcmVuZGVyaW5nOiBjcmlzcGVkZ2VzOyBmb250LWZhbWlseTogUm9ib3RvOyIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMzguOTUzMTI1LCAwKSIgeD0iLTg2NSI+MzVLIFVTRDwvdGV4dD48L2c+PC9nPjxnIGNsYXNzPSJoaWdobGlnaHQiPjwvZz48ZyBjbGFzcz0iY2hhcnQtYXJlYSI+PHBhdGggY2xhc3M9ImxpbmUiIGQ9Ik04NjUsMjQuMDI1OTk5OTk5OTk5OTk2TDc4My40NDAwMDI5MDkzNjQ3LDI5LjU1NDI4NTcxNDI4NTcxNUw3MDEuODgwMDA1ODE4NzI5NSwzMy4yMDk0Mjg1NzE0Mjg1N0w2MjAuMzIwMDA4NzI4MDk0MiwzNy40MzAyODU3MTQyODU3MTZMNTM4LjUzNjU1OTU5MDYzNTMsNDIuNzE2NTcxNDI4NTcxNDM0TDQ1Ni45NzY1NjI1LDQ1LjAzMjg1NzE0Mjg1NzE0TDM3NS40MTY1NjU0MDkzNjQ3NSw0NS4zNTY1NzE0Mjg1NzE0M0wyOTMuODU2NTY4MzE4NzI5NSw0NS40NzkxNDI4NTcxNDI4NTRMMjEyLjA3MzExOTE4MTI3MDU2LDQ0LjczNzQyODU3MTQyODU2NkwxMzAuNTEzMTIyMDkwNjM1MjgsNDQuMDI3MTQyODU3MTQyODU2IiBzdHlsZT0ic3Ryb2tlOiByZ2IoMTQ3LCAwLCAwKTsgZmlsbDogbm9uZTsgc3Ryb2tlLXdpZHRoOiAyLjVweDsiPjwvcGF0aD48Zz48Y2lyY2xlIGNsYXNzPSJkb3QiIGN4PSI4NjUiIGN5PSIyNC4wMjU5OTk5OTk5OTk5OTYiIHI9IjMiIHN0eWxlPSJmaWxsOiByZ2IoMTQ3LCAwLCAwKTsgc3Ryb2tlOiByZ2IoMjU1LCAyNTUsIDI1NSk7Ij48L2NpcmNsZT48Y2lyY2xlIGNsYXNzPSJkb3QiIGN4PSI3ODMuNDQwMDAyOTA5MzY0NyIgY3k9IjI5LjU1NDI4NTcxNDI4NTcxNSIgcj0iMyIgc3R5bGU9ImZpbGw6IHJnYigxNDcsIDAsIDApOyBzdHJva2U6IHJnYigyNTUsIDI1NSwgMjU1KTsiPjwvY2lyY2xlPjxjaXJjbGUgY2xhc3M9ImRvdCIgY3g9IjcwMS44ODAwMDU4MTg3Mjk1IiBjeT0iMzMuMjA5NDI4NTcxNDI4NTciIHI9IjMiIHN0eWxlPSJmaWxsOiByZ2IoMTQ3LCAwLCAwKTsgc3Ryb2tlOiByZ2IoMjU1LCAyNTUsIDI1NSk7Ij48L2NpcmNsZT48Y2lyY2xlIGNsYXNzPSJkb3QiIGN4PSI2MjAuMzIwMDA4NzI4MDk0MiIgY3k9IjM3LjQzMDI4NTcxNDI4NTcxNiIgcj0iMyIgc3R5bGU9ImZpbGw6IHJnYigxNDcsIDAsIDApOyBzdHJva2U6IHJnYigyNTUsIDI1NSwgMjU1KTsiPjwvY2lyY2xlPjxjaXJjbGUgY2xhc3M9ImRvdCIgY3g9IjUzOC41MzY1NTk1OTA2MzUzIiBjeT0iNDIuNzE2NTcxNDI4NTcxNDM0IiByPSIzIiBzdHlsZT0iZmlsbDogcmdiKDE0NywgMCwgMCk7IHN0cm9rZTogcmdiKDI1NSwgMjU1LCAyNTUpOyI+PC9jaXJjbGU+PGNpcmNsZSBjbGFzcz0iZG90IiBjeD0iNDU2Ljk3NjU2MjUiIGN5PSI0NS4wMzI4NTcxNDI4NTcxNCIgcj0iMyIgc3R5bGU9ImZpbGw6IHJnYigxNDcsIDAsIDApOyBzdHJva2U6IHJnYigyNTUsIDI1NSwgMjU1KTsiPjwvY2lyY2xlPjxjaXJjbGUgY2xhc3M9ImRvdCIgY3g9IjM3NS40MTY1NjU0MDkzNjQ3NSIgY3k9IjQ1LjM1NjU3MTQyODU3MTQzIiByPSIzIiBzdHlsZT0iZmlsbDogcmdiKDE0NywgMCwgMCk7IHN0cm9rZTogcmdiKDI1NSwgMjU1LCAyNTUpOyI+PC9jaXJjbGU+PGNpcmNsZSBjbGFzcz0iZG90IiBjeD0iMjkzLjg1NjU2ODMxODcyOTUiIGN5PSI0NS40NzkxNDI4NTcxNDI4NTQiIHI9IjMiIHN0eWxlPSJmaWxsOiByZ2IoMTQ3LCAwLCAwKTsgc3Ryb2tlOiByZ2IoMjU1LCAyNTUsIDI1NSk7Ij48L2NpcmNsZT48Y2lyY2xlIGNsYXNzPSJkb3QiIGN4PSIyMTIuMDczMTE5MTgxMjcwNTYiIGN5PSI0NC43Mzc0Mjg1NzE0Mjg1NjYiIHI9IjMiIHN0eWxlPSJmaWxsOiByZ2IoMTQ3LCAwLCAwKTsgc3Ryb2tlOiByZ2IoMjU1LCAyNTUsIDI1NSk7Ij48L2NpcmNsZT48Y2lyY2xlIGNsYXNzPSJkb3QiIGN4PSIxMzAuNTEzMTIyMDkwNjM1MjgiIGN5PSI0NC4wMjcxNDI4NTcxNDI4NTYiIHI9IjMiIHN0eWxlPSJmaWxsOiByZ2IoMTQ3LCAwLCAwKTsgc3Ryb2tlOiByZ2IoMjU1LCAyNTUsIDI1NSk7Ij48L2NpcmNsZT48L2c+PHBhdGggY2xhc3M9ImxpbmUiIGQ9Ik01MzguNTM2NTU5NTkwNjM1MywzMC4yNTgyODU3MTQyODU3MUw0NTYuOTc2NTYyNSwzMS42NDExNDI4NTcxNDI4NTNMMzc1LjQxNjU2NTQwOTM2NDc1LDMxLjQ4NzE0Mjg1NzE0Mjg1N0wyOTMuODU2NTY4MzE4NzI5NSwzMS45MDUxNDI4NTcxNDI4NjNMMjEyLjA3MzExOTE4MTI3MDU2LDMxLjcxNjU3MTQyODU3MTQyN0wxMzAuNTEzMTIyMDkwNjM1MjgsMzAuOTc4TDQ4Ljk1MzEyNSwzMS44MDE0Mjg1NzE0Mjg1NzMiIHN0eWxlPSJzdHJva2U6IHJnYig5NCwgNzksIDE2Mik7IGZpbGw6IG5vbmU7IHN0cm9rZS13aWR0aDogMi41cHg7Ij48L3BhdGg+PGc+PGNpcmNsZSBjbGFzcz0iZG90IiBjeD0iNTM4LjUzNjU1OTU5MDYzNTMiIGN5PSIzMC4yNTgyODU3MTQyODU3MSIgcj0iMyIgc3R5bGU9ImZpbGw6IHJnYig5NCwgNzksIDE2Mik7IHN0cm9rZTogcmdiKDI1NSwgMjU1LCAyNTUpOyI+PC9jaXJjbGU+PGNpcmNsZSBjbGFzcz0iZG90IiBjeD0iNDU2Ljk3NjU2MjUiIGN5PSIzMS42NDExNDI4NTcxNDI4NTMiIHI9IjMiIHN0eWxlPSJmaWxsOiByZ2IoOTQsIDc5LCAxNjIpOyBzdHJva2U6IHJnYigyNTUsIDI1NSwgMjU1KTsiPjwvY2lyY2xlPjxjaXJjbGUgY2xhc3M9ImRvdCIgY3g9IjM3NS40MTY1NjU0MDkzNjQ3NSIgY3k9IjMxLjQ4NzE0Mjg1NzE0Mjg1NyIgcj0iMyIgc3R5bGU9ImZpbGw6IHJnYig5NCwgNzksIDE2Mik7IHN0cm9rZTogcmdiKDI1NSwgMjU1LCAyNTUpOyI+PC9jaXJjbGU+PGNpcmNsZSBjbGFzcz0iZG90IiBjeD0iMjkzLjg1NjU2ODMxODcyOTUiIGN5PSIzMS45MDUxNDI4NTcxNDI4NjMiIHI9IjMiIHN0eWxlPSJmaWxsOiByZ2IoOTQsIDc5LCAxNjIpOyBzdHJva2U6IHJnYigyNTUsIDI1NSwgMjU1KTsiPjwvY2lyY2xlPjxjaXJjbGUgY2xhc3M9ImRvdCIgY3g9IjIxMi4wNzMxMTkxODEyNzA1NiIgY3k9IjMxLjcxNjU3MTQyODU3MTQyNyIgcj0iMyIgc3R5bGU9ImZpbGw6IHJnYig5NCwgNzksIDE2Mik7IHN0cm9rZTogcmdiKDI1NSwgMjU1LCAyNTUpOyI+PC9jaXJjbGU+PGNpcmNsZSBjbGFzcz0iZG90IiBjeD0iMTMwLjUxMzEyMjA5MDYzNTI4IiBjeT0iMzAuOTc4IiByPSIzIiBzdHlsZT0iZmlsbDogcmdiKDk0LCA3OSwgMTYyKTsgc3Ryb2tlOiByZ2IoMjU1LCAyNTUsIDI1NSk7Ij48L2NpcmNsZT48Y2lyY2xlIGNsYXNzPSJkb3QiIGN4PSI0OC45NTMxMjUiIGN5PSIzMS44MDE0Mjg1NzE0Mjg1NzMiIHI9IjMiIHN0eWxlPSJmaWxsOiByZ2IoOTQsIDc5LCAxNjIpOyBzdHJva2U6IHJnYigyNTUsIDI1NSwgMjU1KTsiPjwvY2lyY2xlPjwvZz48L2c+PC9zdmc+",
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
        "legend": ["Household Median Income"],
        "srcs": [{
            "name":
                "census.gov",
            "url":
                "https://www.census.gov/programs-surveys/acs/data/data-via-ftp.html"
        }],
        "svg":
            "data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9IjE2MCIgd2lkdGg9Ijg3NSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+PGcgY2xhc3M9InggYXhpcyIgZmlsbD0ibm9uZSIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAsIDEzMCkiPjxwYXRoIGNsYXNzPSJkb21haW4iIGQ9Ik0wLDAuNUg4NjUuNSIgc3Ryb2tlPSIjOTk5IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwLCAwKSI+PC9wYXRoPjxnIGNsYXNzPSJ0aWNrIiBvcGFjaXR5PSIxIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxNDAuMTUyNTg0OTkzOTE1NCwwKSI+PGxpbmUgc3Ryb2tlPSIjOTk5IiBzdHJva2Utd2lkdGg9IjAuNSIgeTI9IjYiPjwvbGluZT48dGV4dCBkeT0iMC43MWVtIiBmaWxsPSJjdXJyZW50Q29sb3IiIHk9IjkiPjIwMTI8L3RleHQ+PC9nPjxnIGNsYXNzPSJ0aWNrIiBvcGFjaXR5PSIxIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzMjEuNjM0MjU5OTYzNDkyNSwwKSI+PGxpbmUgc3Ryb2tlPSIjOTk5IiBzdHJva2Utd2lkdGg9IjAuNSIgeTI9IjYiPjwvbGluZT48dGV4dCBkeT0iMC43MWVtIiBmaWxsPSJjdXJyZW50Q29sb3IiIHk9IjkiPjIwMTQ8L3RleHQ+PC9nPjxnIGNsYXNzPSJ0aWNrIiBvcGFjaXR5PSIxIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg1MDIuODY3NjY5OTg3ODMwOSwwKSI+PGxpbmUgc3Ryb2tlPSIjOTk5IiBzdHJva2Utd2lkdGg9IjAuNSIgeTI9IjYiPjwvbGluZT48dGV4dCBkeT0iMC43MWVtIiBmaWxsPSJjdXJyZW50Q29sb3IiIHk9IjkiPjIwMTY8L3RleHQ+PC9nPjxnIGNsYXNzPSJ0aWNrIiBvcGFjaXR5PSIxIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg2ODQuMzQ5MzQ0OTU3NDA3OSwwKSI+PGxpbmUgc3Ryb2tlPSIjOTk5IiBzdHJva2Utd2lkdGg9IjAuNSIgeTI9IjYiPjwvbGluZT48dGV4dCBkeT0iMC43MWVtIiBmaWxsPSJjdXJyZW50Q29sb3IiIHk9IjkiPjIwMTg8L3RleHQ+PC9nPjwvZz48ZyBjbGFzcz0ieSBheGlzIiBmaWxsPSJub25lIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMCIgdGV4dC1hbmNob3I9ImVuZCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoODY1LCAwKSI+PGcgY2xhc3M9InRpY2siIG9wYWNpdHk9IjEiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAsMTMwLjUpIj48bGluZSBjbGFzcz0iZ3JpZC1saW5lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3R5bGU9InN0cm9rZTogcmdiKDE1MywgMTUzLCAxNTMpOyBzdHJva2Utd2lkdGg6IDAuNTsgc3Ryb2tlLW9wYWNpdHk6IDAuNTsgc3Ryb2tlLWRhc2hhcnJheTogMiwgMjsiIHgyPSItODY1Ij48L2xpbmU+PHRleHQgZHk9Ii00IiBmaWxsPSJjdXJyZW50Q29sb3IiIHN0eWxlPSJmaWxsOiByZ2IoNDMsIDQxLCA0MSk7IHNoYXBlLXJlbmRlcmluZzogY3Jpc3BlZGdlczsgZm9udC1mYW1pbHk6IFJvYm90bzsiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDM4Ljk1MzEyNSwgMCkiIHg9Ii04NjUiPjAgVVNEPC90ZXh0PjwvZz48ZyBjbGFzcz0idGljayIgb3BhY2l0eT0iMSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCwxMDMpIj48bGluZSBjbGFzcz0iZ3JpZC1saW5lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3R5bGU9InN0cm9rZTogcmdiKDE1MywgMTUzLCAxNTMpOyBzdHJva2Utd2lkdGg6IDAuNTsgc3Ryb2tlLW9wYWNpdHk6IDAuNTsgc3Ryb2tlLWRhc2hhcnJheTogMiwgMjsiIHgyPSItODY1Ij48L2xpbmU+PHRleHQgZHk9Ii00IiBmaWxsPSJjdXJyZW50Q29sb3IiIHN0eWxlPSJmaWxsOiByZ2IoNDMsIDQxLCA0MSk7IHNoYXBlLXJlbmRlcmluZzogY3Jpc3BlZGdlczsgZm9udC1mYW1pbHk6IFJvYm90bzsiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDM4Ljk1MzEyNSwgMCkiIHg9Ii04NjUiPjIwSyBVU0Q8L3RleHQ+PC9nPjxnIGNsYXNzPSJ0aWNrIiBvcGFjaXR5PSIxIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwLDc1LjUpIj48bGluZSBjbGFzcz0iZ3JpZC1saW5lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3R5bGU9InN0cm9rZTogcmdiKDE1MywgMTUzLCAxNTMpOyBzdHJva2Utd2lkdGg6IDAuNTsgc3Ryb2tlLW9wYWNpdHk6IDAuNTsgc3Ryb2tlLWRhc2hhcnJheTogMiwgMjsiIHgyPSItODY1Ij48L2xpbmU+PHRleHQgZHk9Ii00IiBmaWxsPSJjdXJyZW50Q29sb3IiIHN0eWxlPSJmaWxsOiByZ2IoNDMsIDQxLCA0MSk7IHNoYXBlLXJlbmRlcmluZzogY3Jpc3BlZGdlczsgZm9udC1mYW1pbHk6IFJvYm90bzsiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDM4Ljk1MzEyNSwgMCkiIHg9Ii04NjUiPjQwSyBVU0Q8L3RleHQ+PC9nPjxnIGNsYXNzPSJ0aWNrIiBvcGFjaXR5PSIxIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgwLDQ4KSI+PGxpbmUgY2xhc3M9ImdyaWQtbGluZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0eWxlPSJzdHJva2U6IHJnYigxNTMsIDE1MywgMTUzKTsgc3Ryb2tlLXdpZHRoOiAwLjU7IHN0cm9rZS1vcGFjaXR5OiAwLjU7IHN0cm9rZS1kYXNoYXJyYXk6IDIsIDI7IiB4Mj0iLTg2NSI+PC9saW5lPjx0ZXh0IGR5PSItNCIgZmlsbD0iY3VycmVudENvbG9yIiBzdHlsZT0iZmlsbDogcmdiKDQzLCA0MSwgNDEpOyBzaGFwZS1yZW5kZXJpbmc6IGNyaXNwZWRnZXM7IGZvbnQtZmFtaWx5OiBSb2JvdG87IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzOC45NTMxMjUsIDApIiB4PSItODY1Ij42MEsgVVNEPC90ZXh0PjwvZz48ZyBjbGFzcz0idGljayIgb3BhY2l0eT0iMSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCwyMC41KSI+PGxpbmUgY2xhc3M9ImdyaWQtbGluZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0eWxlPSJzdHJva2U6IHJnYigxNTMsIDE1MywgMTUzKTsgc3Ryb2tlLXdpZHRoOiAwLjU7IHN0cm9rZS1vcGFjaXR5OiAwLjU7IHN0cm9rZS1kYXNoYXJyYXk6IDIsIDI7IiB4Mj0iLTg2NSI+PC9saW5lPjx0ZXh0IGR5PSItNCIgZmlsbD0iY3VycmVudENvbG9yIiBzdHlsZT0iZmlsbDogcmdiKDQzLCA0MSwgNDEpOyBzaGFwZS1yZW5kZXJpbmc6IGNyaXNwZWRnZXM7IGZvbnQtZmFtaWx5OiBSb2JvdG87IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzOC45NTMxMjUsIDApIiB4PSItODY1Ij44MEsgVVNEPC90ZXh0PjwvZz48L2c+PGcgY2xhc3M9ImhpZ2hsaWdodCI+PC9nPjxnIGNsYXNzPSJjaGFydC1hcmVhIj48cGF0aCBjbGFzcz0ibGluZSIgZD0iTTg2NSwyMS44MjU5OTk5OTk5OTk5OTNMNzc0LjM4MzI5NDk4NzgzMDgsMjYuNTUxODc0OTk5OTk5OTk1TDY4My43NjY1ODk5NzU2NjE4LDMyLjA2MTVMNTkzLjE0OTg4NDk2MzQ5MjYsMzcuNjQyNjI1TDUwMi4yODQ5MTUwMDYwODQ1Myw0Mi4yOTgzNzQ5OTk5OTk5OUw0MTEuNjY4MjA5OTkzOTE1NCw0NS4wMDAyNUwzMjEuMDUxNTA0OTgxNzQ2Myw0NS40NTI2MjVMMjMwLjQzNDc5OTk2OTU3NzEsNDUuOTk1NzVMMTM5LjU2OTgzMDAxMjE2OTE1LDQ1LjU3NUw0OC45NTMxMjUsNDUuMjU2IiBzdHlsZT0ic3Ryb2tlOiByZ2IoMjUyLCAxOTEsIDExMyk7IGZpbGw6IG5vbmU7IHN0cm9rZS13aWR0aDogMi41cHg7Ij48L3BhdGg+PGc+PGNpcmNsZSBjbGFzcz0iZG90IiBjeD0iODY1IiBjeT0iMjEuODI1OTk5OTk5OTk5OTkzIiByPSIzIiBzdHlsZT0iZmlsbDogcmdiKDI1MiwgMTkxLCAxMTMpOyBzdHJva2U6IHJnYigyNTUsIDI1NSwgMjU1KTsiPjwvY2lyY2xlPjxjaXJjbGUgY2xhc3M9ImRvdCIgY3g9Ijc3NC4zODMyOTQ5ODc4MzA4IiBjeT0iMjYuNTUxODc0OTk5OTk5OTk1IiByPSIzIiBzdHlsZT0iZmlsbDogcmdiKDI1MiwgMTkxLCAxMTMpOyBzdHJva2U6IHJnYigyNTUsIDI1NSwgMjU1KTsiPjwvY2lyY2xlPjxjaXJjbGUgY2xhc3M9ImRvdCIgY3g9IjY4My43NjY1ODk5NzU2NjE4IiBjeT0iMzIuMDYxNSIgcj0iMyIgc3R5bGU9ImZpbGw6IHJnYigyNTIsIDE5MSwgMTEzKTsgc3Ryb2tlOiByZ2IoMjU1LCAyNTUsIDI1NSk7Ij48L2NpcmNsZT48Y2lyY2xlIGNsYXNzPSJkb3QiIGN4PSI1OTMuMTQ5ODg0OTYzNDkyNiIgY3k9IjM3LjY0MjYyNSIgcj0iMyIgc3R5bGU9ImZpbGw6IHJnYigyNTIsIDE5MSwgMTEzKTsgc3Ryb2tlOiByZ2IoMjU1LCAyNTUsIDI1NSk7Ij48L2NpcmNsZT48Y2lyY2xlIGNsYXNzPSJkb3QiIGN4PSI1MDIuMjg0OTE1MDA2MDg0NTMiIGN5PSI0Mi4yOTgzNzQ5OTk5OTk5OSIgcj0iMyIgc3R5bGU9ImZpbGw6IHJnYigyNTIsIDE5MSwgMTEzKTsgc3Ryb2tlOiByZ2IoMjU1LCAyNTUsIDI1NSk7Ij48L2NpcmNsZT48Y2lyY2xlIGNsYXNzPSJkb3QiIGN4PSI0MTEuNjY4MjA5OTkzOTE1NCIgY3k9IjQ1LjAwMDI1IiByPSIzIiBzdHlsZT0iZmlsbDogcmdiKDI1MiwgMTkxLCAxMTMpOyBzdHJva2U6IHJnYigyNTUsIDI1NSwgMjU1KTsiPjwvY2lyY2xlPjxjaXJjbGUgY2xhc3M9ImRvdCIgY3g9IjMyMS4wNTE1MDQ5ODE3NDYzIiBjeT0iNDUuNDUyNjI1IiByPSIzIiBzdHlsZT0iZmlsbDogcmdiKDI1MiwgMTkxLCAxMTMpOyBzdHJva2U6IHJnYigyNTUsIDI1NSwgMjU1KTsiPjwvY2lyY2xlPjxjaXJjbGUgY2xhc3M9ImRvdCIgY3g9IjIzMC40MzQ3OTk5Njk1NzcxIiBjeT0iNDUuOTk1NzUiIHI9IjMiIHN0eWxlPSJmaWxsOiByZ2IoMjUyLCAxOTEsIDExMyk7IHN0cm9rZTogcmdiKDI1NSwgMjU1LCAyNTUpOyI+PC9jaXJjbGU+PGNpcmNsZSBjbGFzcz0iZG90IiBjeD0iMTM5LjU2OTgzMDAxMjE2OTE1IiBjeT0iNDUuNTc1IiByPSIzIiBzdHlsZT0iZmlsbDogcmdiKDI1MiwgMTkxLCAxMTMpOyBzdHJva2U6IHJnYigyNTUsIDI1NSwgMjU1KTsiPjwvY2lyY2xlPjxjaXJjbGUgY2xhc3M9ImRvdCIgY3g9IjQ4Ljk1MzEyNSIgY3k9IjQ1LjI1NiIgcj0iMyIgc3R5bGU9ImZpbGw6IHJnYigyNTIsIDE5MSwgMTEzKTsgc3Ryb2tlOiByZ2IoMjU1LCAyNTUsIDI1NSk7Ij48L2NpcmNsZT48L2c+PC9nPjwvc3ZnPg==",
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


def _to_svg(svg):
  svg_str = str(svg)
  if ' xmlns=' not in svg_str:
    # This makes the SVG not render when opened on chrome.
    svg_str = svg_str.replace('<svg ',
                              '<svg xmlns="http://www.w3.org/2000/svg" ')
  if ' xlink:href' in svg_str:
    # This happens for SVGs with legend and causes an error when opened.
    svg_str = svg_str.replace(' xlink:href', ' href')
  svg_bytes = svg_str.encode('utf-8')
  svg_b64 = base64.b64encode(svg_bytes).decode('utf-8')
  return 'data:image/svg+xml;base64,' + svg_b64


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


def scrape(query, driver):
  if query.lower() in _OVERRIDE_CHART_MAP:
    return _OVERRIDE_CHART_MAP[query.lower()]

  logging.info(f'Scraping: {query}')
  driver.get(_URL + query)

  # Wait until the page has loaded.
  wait = WebDriverWait(driver, 30)
  wait.until(EC.presence_of_element_located((By.CLASS_NAME, 'chart-container')))
  wait.until(lambda d: _check_svgs_drawn(driver))

  html = driver.page_source
  soup = BeautifulSoup(html, 'html.parser')

  charts = []
  subject_page = soup.find('div', {'id': 'subject-page-main-pane'})
  for block in subject_page.find_all('section', {'class': 'block'}):
    for chart_container in block.find_all('div', {'class': 'chart-container'}):
      chart = {}

      chart['srcs'] = []
      chart['title'] = chart_container.find('h4').text
      for src in chart_container.find_all('div', {'class': 'sources'}):
        anchor = src.find('a')
        chart['srcs'].append({'name': anchor.text, 'url': anchor.get('href')})
      classes = chart_container['class']
      if 'line-chart' in classes:
        chart['type'] = 'LINE'
        chart['svg'] = _to_svg(chart_container.find('svg'))
        legend = chart_container.find('div', {'class': 'legend'})
        chart['legend'] = []
        for l in legend.find_all('a'):
          # TODO: maybe convert rbg to color name.
          chart['legend'].append(l.text)
      elif 'map-chart' in classes:
        chart['type'] = 'MAP'
        map_area = chart_container.find('div', {'class': 'map'})
        chart['svg'] = _to_svg(map_area.find('svg'))
        legend_area = chart_container.find('div', {'class': 'legend'})
        chart['legend_svg'] = _to_svg(legend_area.find('svg'))
      elif 'bar-chart' in classes:
        chart['type'] = 'BAR'
        chart['svg'] = _to_svg(chart_container.find('svg'))
        legend = chart_container.find('div', {'class': 'legend'})
        chart['legend'] = []
        for l in legend.find_all('a'):
          # TODO: maybe convert rbg to color name.
          chart['legend'].append(l.text)
      elif 'scatter-chart' in classes:
        chart['type'] = 'SCATTER'
        chart['svg'] = _to_svg(chart_container.find('svg'))
      elif 'ranking-tile' in classes:
        chart['type'] = 'TABLE'
        chart['rows'] = []
        table = chart_container.find('table')
        header_cols = []
        if table.find('thead'):
          header_cols = table.find('thead').find_all('td')
        # Loop through the rows of the table
        for row in table.find('tbody').find_all('tr'):
          # Create an empty dictionary to hold the row data
          row_data = {}
          # Loop through the cells of the row
          for i, cell in enumerate(row.find_all('td')):
            # Use the text content of the cell as the value
            col = None
            if i < len(header_cols):
              col = header_cols[i].text
            if not col:
              col = str(i)
            row_data[col] = cell.text
          # Add the row data to the list
          chart['rows'].append(row_data)
      elif 'disaster-event-map-tile' in classes:
        chart['type'] = 'EVENT_MAP'
        chart['svg'] = _to_svg(chart_container.find('svg'))
        legend = chart_container.find('div',
                                      {'class': 'disaster-event-map-legend'})
        chart['legend'] = []
        for l in legend.find_all('span'):
          # TODO: maybe convert rbg to color name.
          chart['legend'].append(l.text)
      charts.append(chart)
  return charts
