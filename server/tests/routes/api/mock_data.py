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
    'byVariable': {
        'Count_Person': {
            'byEntity': {
                'geoId/01': {
                    'orderedFacets': [
                        {
                            'facetId': '2517965213',
                            'observations': [{
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
                            }],
                            'earliestDate': '2014',
                            'latestDate': '2019',
                            'obsCount': 5
                        },
                        {
                            'facetId': '1145703171',
                            'observations': [{
                                'date': '2011',
                                'value': 4747424
                            }, {
                                'date': '2012',
                                'value': 4777326
                            }],
                            'earliestDate': '',
                            'latestDate': '2012',
                            'obsCount': 2
                        },
                    ],
                },
                'geoId/06': {
                    'orderedFacets': [{
                        'facetId': '2517965213',
                        'observations': [{
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
                        }],
                        'earliestDate': '2014',
                        'latestDate': '2017',
                        'obsCount': 4
                    }],
                },
            },
        },
        'UnemploymentRate_Person': {
            'byEntity': {
                'geoId/01': {
                    'orderedFacets': [
                        {
                            'facetId': '324358135',
                            'observations': [{
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
                            }],
                            'earliestDate': '1979-01',
                            'latestDate': '2019-05',
                            'obsCount': 6
                        },
                        {
                            'facetId': '1249140336',
                            'observations': [{
                                'date': '2019',
                                'value': 3.2
                            }, {
                                'date': '2020',
                                'value': 6.5
                            }, {
                                'date': '2021',
                                'value': 3.4
                            }],
                            'earliestDate': '2019',
                            'latestDate': '2021',
                            'obsCount': 3
                        },
                    ],
                },
                'geoId/06': {
                    'orderedFacets': [{
                        'facetId': '324358135',
                        'observations': [{
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
                        }],
                        'earliestDate': '2015-10',
                        'latestDate': '2020-04',
                        'obsCount': 6
                    }]
                },
            },
        },
    },
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
    'byVariable': {
        'Count_Person': {
            'byEntity': {
                'geoId/01': {
                    'orderedFacets': [{
                        'facetId': '2517965213',
                        'observations': [{
                            'date': '2019',
                            'value': 4903185
                        }]
                    }, {
                        'facetId': '1145703171',
                        'observations': [{
                            'date': '2020',
                            'value': 4893186
                        }]
                    }]
                },
                'geoId/02': {
                    'orderedFacets': [{
                        'facetId': '2517965213',
                        'observations': [{
                            'date': '2019',
                            'value': 731545
                        }]
                    }, {
                        'facetId': '1145703171',
                        'observations': [{
                            'date': '2020',
                            'value': 736990
                        }]
                    }],
                },
                'geoId/06': {
                    'orderedFacets': [{
                        'facetId': '2517965213',
                        'observations': [{
                            'date': '2019',
                            'value': 731545
                        }]
                    }, {
                        'facetId': '1145703171',
                        'observations': [{
                            'date': '2020',
                            'value': 836990
                        }]
                    }],
                },
            },
        },
        'UnemploymentRate_Person': {
            'byEntity': {
                'geoId/01': {
                    'orderedFacets': [{
                        'facetId': '2978659163',
                        'observations': [{
                            'date': '2022-03',
                            'value': 3.4
                        }]
                    }, {
                        'facetId': '1249140336',
                        'observations': [{
                            'date': '2022-04',
                            'value': 2.8
                        }]
                    }],
                },
                'geoId/02': {
                    'orderedFacets': [{
                        'facetId': '2978659163',
                        'observations': [{
                            'date': '2022-03',
                            'value': 6.4
                        }]
                    }, {
                        'facetId': '1249140336',
                        'observations': [{
                            'date': '2022-04',
                            'value': 4.9
                        }]
                    }],
                },
                'geoId/06': {
                    'orderedFacets': [{
                        'facetId': '2978659163',
                        'observations': [{
                            'date': '2022-03',
                            'value': 6.4
                        }]
                    }]
                }
            }
        }
    }
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
            'provenanceUrl': 'https://www.bls.gov/lau/',
            'unit': 'testUnit'
        }
    },
    'byVariable': {
        'Count_Person': {
            'byEntity': {
                'geoId/01': {
                    'orderedFacets': [{
                        'facetId': '2517965213',
                        'observations': [{
                            'date': '2015',
                            'value': 3120960
                        }]
                    }]
                },
                'geoId/02': {
                    'orderedFacets': [{
                        'facetId': '2517965213',
                        'observations': [{
                            'date': '2015',
                            'value': 625216
                        }]
                    }, {
                        'facetId': '2176550201',
                        'observations': [{
                            'date': '2015',
                            'value': 686946
                        }]
                    }],
                },
                'geoId/06': {
                    'orderedFacets': [{
                        'facetId': '2517965213',
                        'observations': [{
                            'date': '2015',
                            'value': 9931715
                        }]
                    }],
                },
            },
        },
        'UnemploymentRate_Person': {
            'byEntity': {
                'geoId/01': {
                    'orderedFacets': [{
                        'facetId': '2978659163',
                        'observations': [{
                            'date': '2015',
                            'value': 12
                        }]
                    }],
                },
                'geoId/02': {
                    'orderedFacets': [{
                        'facetId': '2978659163',
                        'observations': [{
                            'date': '2015',
                            'value': 5.6
                        }]
                    }],
                },
                'geoId/06': {
                    'orderedFacets': [{
                        'facetId': '2978659163',
                        'observations': [{
                            'date': '2015',
                            'value': 3.7
                        }]
                    }]
                }
            }
        }
    }
}


RESOLVE_IDS_VALUES = {
    'ChIJPV4oX_65j4ARVW8IJ6IJUYs': [{
        'dcid': 'geoId/4210768'
    }],
    'ChIJPV4oX_65j4ARVW8IJ6IJUYs1': [{
        'dcid': 'geoId/4210769'
    }],
    'ChIJPV4oX_65j4ARVW8IJ6IJUYs2': [{
        'dcid': 'geoId/4210770'
    }],
    'ChIJPV4oX_65j4ARVW8IJ6IJUYs3': [{
        'dcid': 'geoId/4210771'
    }],
    'ChIJPV4oX_65j4ARVW8IJ6IJUYs4': [{
        'dcid': 'geoId/4210772'
    }]
}

MAPS_PREDICTIONS_VALUES = [{
    'description': 'California, USA',
    'place_id': 'ChIJPV4oX_65j4ARVW8IJ6IJUYs',
    'matched_query': 'calif'
}, {
    'description': 'Califon, NJ, USA',
    'place_id': 'ChIJPV4oX_65j4ARVW8IJ6IJUYs1',
    'matched_query': 'calif'
}, {
    'description': 'California, MD, USA',
    'place_id': 'ChIJPV4oX_65j4ARVW8IJ6IJUYs2',
    'matched_query': 'calif'
}, {
    'description': 'California City, CA, USA',
    'place_id': 'ChIJPV4oX_65j4ARVW8IJ6IJUYs3',
    'matched_query': 'calif'
}, {
    'description': 'California, PA, USA',
    'place_id': 'ChIJPV4oX_65j4ARVW8IJ6IJUYs4',
    'matched_query': 'calif'
}]
