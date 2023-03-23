# Copyright 2022 Google LLC
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

SERIES_WITHIN_ALL_FACETS = {
    'facets': {
        '324358135': {
            'importName': 'BLS_LAUS',
            'measurementMethod': 'BLSSeasonallyUnadjusted',
            'observationPeriod': 'P1M',
            'provenanceUrl': 'https://www.bls.gov/lau/'
        },
        '1145703171': {
            'importName': 'CensusACS5YearSurvey',
            'measurementMethod': 'CensusACS5yrSurvey',
            'provenanceUrl': 'https://www.census.gov/'
        },
        '1249140336': {
            'importName': 'BLS_LAUS',
            'measurementMethod': 'BLSSeasonallyAdjusted',
            'observationPeriod': 'P1M',
            'provenanceUrl': 'https://www.bls.gov/lau/'
        },
        '2517965213': {
            'importName':
                'CensusPEP',
            'measurementMethod':
                'CensusPEPSurvey',
            'provenanceUrl':
                'https://www.census.gov/programs-surveys/popest.html',
            'unit':
                'testUnit'
        },
    },
    'observationsByVariable': [{
        'observationsByEntity': [{
            'entity':
                'geoId/01',
            'seriesByFacet': [
                {
                    'facet':
                        '2517965213',
                    'series': [{
                        'date': '2014',
                        'value': 1021869
                    }, {
                        'date': '2015',
                        'value': 1030475
                    }, {
                        'date': '2017',
                        'value': 1052482
                    }, {
                        'date': '2018',
                        'value': 1060665
                    }, {
                        'date': '2019',
                        'value': 1068778
                    }]
                },
                {
                    'facet':
                        '1145703171',
                    'series': [{
                        'date': '2011',
                        'value': 4747424
                    }, {
                        'date': '2012',
                        'value': 4777326
                    }]
                },
            ]
        }, {
            'entity':
                'geoId/06',
            'seriesByFacet': [{
                'facet':
                    '2517965213',
                'series': [{
                    'date': '2014',
                    'value': 2817628
                }, {
                    'date': '2015',
                    'value': 2866939
                }, {
                    'date': '2016',
                    'value': 2917563
                }, {
                    'date': '2017',
                    'value': 2969905
                }]
            }],
        }],
        'variable': 'Count_Person'
    }, {
        'observationsByEntity': [
            {
                'entity':
                    'geoId/01',
                'seriesByFacet': [
                    {
                        'facet':
                            '324358135',
                        'series': [{
                            'date': '1979-01',
                            'value': 6.6
                        }, {
                            'date': '2018-01',
                            'value': 4.5
                        }, {
                            'date': '2015-05',
                            'value': 4.2
                        }, {
                            'date': '2018-07',
                            'value': 3.9
                        }, {
                            'date': '2017-11',
                            'value': 4
                        }, {
                            'date': '2019-05',
                            'value': 3.6
                        }]
                    },
                    {
                        'facet':
                            '1249140336',
                        'series': [{
                            'date': '2019',
                            'value': 3.2
                        }, {
                            'date': '2020',
                            'value': 6.5
                        }, {
                            'date': '2021',
                            'value': 3.4
                        }]
                    },
                ]
            },
            {
                'entity':
                    'geoId/06',
                'seriesByFacet': [{
                    'facet':
                        '324358135',
                    'series': [{
                        'date': '2015-10',
                        'value': 6.4
                    }, {
                        'date': '2017-05',
                        'value': 4.8
                    }, {
                        'date': '1991-08',
                        'value': 5.6
                    }, {
                        'date': '2018-08',
                        'value': 4.3
                    }, {
                        'date': '2018-03',
                        'value': 4.6
                    }, {
                        'date': '2020-04',
                        'value': 1.2
                    }]
                }]
            },
        ],
        'variable': 'UnemploymentRate_Person'
    }]
}

POINT_WITHIN_LATEST_ALL_FACETS = {
    'facets': {
        '1145703171': {
            'importName': 'CensusACS5YearSurvey',
            'measurementMethod': 'CensusACS5yrSurvey',
            'provenanceUrl': 'https://www.census.gov/'
        },
        '1249140336': {
            'importName': 'BLS_LAUS',
            'measurementMethod': 'BLSSeasonallyAdjusted',
            'observationPeriod': 'P1M',
            'provenanceUrl': 'https://www.bls.gov/lau/'
        },
        '2517965213': {
            'importName':
                'CensusPEP',
            'measurementMethod':
                'CensusPEPSurvey',
            'provenanceUrl':
                'https://www.census.gov/programs-surveys/popest.html'
        },
        '2978659163': {
            'importName': 'BLS_LAUS',
            'measurementMethod': 'BLSSeasonallyUnadjusted',
            'observationPeriod': 'P1Y',
            'provenanceUrl': 'https://www.bls.gov/lau/'
        },
        '324358135': {
            'importName': 'BLS_LAUS',
            'measurementMethod': 'BLSSeasonallyUnadjusted',
            'observationPeriod': 'P1M',
            'provenanceUrl': 'https://www.bls.gov/lau/'
        }
    },
    'observationsByVariable': [{
        'observationsByEntity': [
            {
                'entity':
                    'geoId/01',
                'pointsByFacet': [{
                    'date': '2019',
                    'facet': '2517965213',
                    'value': 4903185
                }, {
                    'date': '2020',
                    'facet': '1145703171',
                    'value': 4893186
                }]
            },
            {
                'entity':
                    'geoId/02',
                'pointsByFacet': [{
                    'date': '2019',
                    'facet': '2517965213',
                    'value': 731545
                }, {
                    'date': '2020',
                    'facet': '1145703171',
                    'value': 736990
                }]
            },
            {
                'entity':
                    'geoId/06',
                'pointsByFacet': [{
                    'date': '2019',
                    'facet': '2517965213',
                    'value': 731745
                }, {
                    'date': '2020',
                    'facet': '1145703171',
                    'value': 836990
                }]
            },
        ],
        'variable': 'Count_Person'
    }, {
        'observationsByEntity': [
            {
                'entity':
                    'geoId/01',
                'pointsByFacet': [{
                    'date': '2022-03',
                    'facet': '2978659163',
                    'value': 3.4
                }, {
                    'date': '2022-04',
                    'facet': '1249140336',
                    'value': 2.8
                }]
            },
            {
                'entity':
                    'geoId/02',
                'pointsByFacet': [{
                    'date': '2022-03',
                    'facet': '2978659163',
                    'value': 6.4
                }, {
                    'date': '2022-04',
                    'facet': '1249140336',
                    'value': 4.9
                }]
            },
            {
                'entity':
                    'geoId/02',
                'pointsByFacet': [{
                    'date': '2022-03',
                    'facet': '2978659163',
                    'value': 6.4
                }, {
                    'date': '2022-04',
                    'facet': '1249140336',
                    'value': 4.9
                }]
            },
        ],
        'variable': 'UnemploymentRate_Person'
    }]
}

POINT_WITHIN_2015_ALL_FACETS = {
    'facets': {
        '2176550201': {
            'importName':
                'USCensusPEP_Annual_Population',
            'measurementMethod':
                'CensusPEPSurvey',
            'observationPeriod':
                'P1Y',
            'provenanceUrl':
                'https://www2.census.gov/programs-surveys/popest/tables'
        },
        '2517965213': {
            'importName':
                'CensusPEP',
            'measurementMethod':
                'CensusPEPSurvey',
            'provenanceUrl':
                'https://www.census.gov/programs-surveys/popest.html'
        },
        '2978659163': {
            'importName': 'BLS_LAUS',
            'measurementMethod': 'BLSSeasonallyUnadjusted',
            'observationPeriod': 'P1Y',
            'provenanceUrl': 'https://www.bls.gov/lau/'
        }
    },
    'observationsByVariable': [{
        'observationsByEntity': [{
            'entity':
                'geoId/01',
            'pointsByFacet': [{
                'date': '2015',
                'facet': '2517965213',
                'value': 3120960
            }]
        }, {
            'entity':
                'geoId/02',
            'pointsByFacet': [{
                'date': '2015',
                'facet': '2517965213',
                'value': 625216
            }, {
                'date': '2015',
                'facet': 2176550201,
                'value': 686946
            }]
        }, {
            'entity':
                'geoId/06',
            'pointsByFacet': [{
                'date': '2015',
                'facet': '2517965213',
                'value': 9931715
            }]
        }],
        'variable': 'Count_Person'
    }, {
        'observationsByEntity': [{
            'entity':
                'geoId/01',
            'pointsByFacet': [{
                'date': '2015',
                'facet': '2978659163',
                'value': 12
            }]
        }, {
            'entity':
                'geoId/06',
            'pointsByFacet': [{
                'date': '2015',
                'facet': '2978659163',
                'value': 3.7
            }]
        }, {
            'entity':
                'geoId/02',
            'pointsByFacet': [{
                'date': '2015',
                'facet': '2978659163',
                'value': 5.6
            }]
        }],
        'variable': 'UnemploymentRate_Person'
    }]
}

POINT_WITHIN_LATEST = {
    'facets': {
        '1145703171': {
            'importName': 'CensusACS5YearSurvey',
            'measurementMethod': 'CensusACS5yrSurvey',
            'provenanceUrl': 'https://www.census.gov/'
        },
        '324358135': {
            'importName': 'BLS_LAUS',
            'measurementMethod': 'BLSSeasonallyUnadjusted',
            'observationPeriod': 'P1M',
            'provenanceUrl': 'https://www.bls.gov/lau/'
        }
    },
    'observationsByVariable': [{
        'observationsByEntity': [
            {
                'entity':
                    'geoId/01',
                'pointsByFacet': [{
                    'date': '2020',
                    'facet': '1145703171',
                    'value': 6696893
                }]
            },
            {
                'entity':
                    'geoId/02',
                'pointsByFacet': [{
                    'date': '2020',
                    'facet': '1145703171',
                    'value': 581348
                }]
            },
            {
                'entity':
                    'geoId/06',
                'pointsByFacet': [{
                    'date': '2020',
                    'facet': '1145703171',
                    'value': 1923826
                }]
            },
        ],
        'variable': 'Count_Person'
    }, {
        'observationsByEntity': [
            {
                'entity':
                    'geoId/06',
                'pointsByFacet': [{
                    'date': '2022-04',
                    'facet': 324358135,
                    'value': 2.8
                }]
            },
            {
                'entity':
                    'geoId/02',
                'pointsByFacet': [{
                    'date': '2022-03',
                    'facet': 324358135,
                    'value': 3.2
                }]
            },
            {
                'entity':
                    'geoId/01',
                'pointsByFacet': [{
                    'date': '2022-03',
                    'facet': 324358135,
                    'value': 4.2
                }]
            },
        ],
        'variable': 'UnemploymentRate_Person'
    }]
}

POINT_WITHIN_2015 = {
    'facets': {
        '2517965213': {
            'importName':
                'CensusPEP',
            'measurementMethod':
                'CensusPEPSurvey',
            'provenanceUrl':
                'https://www.census.gov/programs-surveys/popest.html'
        },
        '2978659163': {
            'importName': 'BLS_LAUS',
            'measurementMethod': 'BLSSeasonallyUnadjusted',
            'observationPeriod': 'P1Y',
            'provenanceUrl': 'https://www.bls.gov/lau/',
            'unit': 'testUnit'
        }
    },
    'observationsByVariable': [{
        'observationsByEntity': [{
            'entity':
                'geoId/01',
            'pointsByFacet': [{
                'date': '2015',
                'facet': '2517965213',
                'value': 3120960
            }]
        }, {
            'entity':
                'geoId/02',
            'pointsByFacet': [{
                'date': '2015',
                'facet': '2517965213',
                'value': 625216
            }]
        }, {
            'entity':
                'geoId/06',
            'pointsByFacet': [{
                'date': '2015',
                'facet': '2517965213',
                'value': 9931715
            }]
        }],
        'variable': 'Count_Person'
    }, {
        'observationsByEntity': [{
            'entity':
                'geoId/01',
            'pointsByFacet': [{
                'date': '2015',
                'facet': '2978659163',
                'value': 12
            }]
        }, {
            'entity':
                'geoId/06',
            'pointsByFacet': [{
                'date': '2015',
                'facet': '2978659163',
                'value': 3.7
            }]
        }, {
            'entity':
                'geoId/02',
            'pointsByFacet': [{
                'date': '2015',
                'facet': '2978659163',
                'value': 5.6
            }]
        }],
        'variable': 'UnemploymentRate_Person'
    }]
}
