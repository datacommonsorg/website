import Enzyme, { shallow } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
import _ from "lodash";
import React from "react";

Enzyme.configure({ adapter: new Adapter() });

import { GraphNodes } from "../shared/types";
import { ProteinPropDataStrType } from "./chart";
import { getChemicalGeneAssoc, getDiseaseGeneAssoc, getProteinInteraction, getTissueScore, getVarGeneAssoc, getVarSigAssoc, getVarTypeAssoc } from "./data_processing_utils";
import { InteractingProteinType } from "./page";
import { ProteinVarType } from "./page";
import { Page } from "./page";

const dataP53 = require('./data_P53.json');
const dataFGFR1 = require('./data_FGFR1.json');
test("getTissueScore", () => {
  //const wrapper = shallow(<Page dcid={"test"} nodeName={"test-node"} />);
  const cases: {
    data: GraphNodes;
    wantArray: ProteinPropDataStrType[];
  }[] = [
    // Passing in P53_HUMAN data
    {data: dataP53,
      wantArray: [
        {
          name: "Vagina",
          value: "ProteinExpressionNotDetected",
        },
        {
          name: "UrinaryBladder",
          value: "ProteinExpressionLow",
        },
        {
          name: "Tonsil",
          value: "ProteinExpressionLow",
        },
      ],
    },
    {
      // Passing in FGFR1_HUMAN data
      data: dataFGFR1,
      wantArray: [
        {
          name: "UrinaryBladder",
          value: "ProteinExpressionMedium",
        },
      ],
    },
    {
      // Passing in incorrect FGFR1_HUMAN data - expecting a null object to be returned
      data: {
        nodes: [
          {
            neighbors: [
              {
                direction: "DIRECTION_IN",
                nodes: [
                  {
                    neighbors: [
                      {
                        direction: "DIRECTION_OUT",
                        nodes: [
                          {
                            value: "SHB_MOUSE_FGFR1_HUMAN",
                          },
                        ],
                        property: "name",
                      },
                      {
                        direction: "DIRECTION_OUT",
                        nodes: [
                          {
                            neighbors: [
                              {
                                direction: "DIRECTION_OUT",
                                nodes: [
                                  {
                                    value: "0.22",
                                  },
                                ],
                                property: "value",
                              },
                            ],
                            value: "IntactMiScore0.22",
                          },
                        ],
                        property: "confidenceScore",
                      },
                    ],
                    value: "bio/SHB_MOUSE_FGFR1_HUMAN",
                  },
                  {
                    neighbors: [
                      {
                        direction: "DIRECTION_OUT",
                        nodes: [
                          {
                            value: "PLCG1_HUMAN_FGFR1_HUMAN",
                          },
                        ],
                        property: "name",
                      },
                      {
                        direction: "DIRECTION_OUT",
                        nodes: [
                          {
                            neighbors: [
                              {
                                direction: "DIRECTION_OUT",
                                nodes: [
                                  {
                                    value: "0.87",
                                  },
                                  {
                                    value: "0.87",
                                  },
                                ],
                                property: "value",
                              },
                            ],
                            value: "IntactMiScore0.87",
                          },
                        ],
                        property: "confidenceScore",
                      },
                    ],
                    value: "bio/PLCG1_HUMAN_FGFR1_HUMAN",
                  },
                  {
                    neighbors: [
                      {
                        direction: "DIRECTION_OUT",
                        nodes: [
                          {
                            value: "P85A_HUMAN_FGFR1_HUMAN",
                          },
                        ],
                        property: "name",
                      },
                      {
                        direction: "DIRECTION_OUT",
                        nodes: [
                          {
                            neighbors: [
                              {
                                direction: "DIRECTION_OUT",
                                nodes: [
                                  {
                                    value: "0.62",
                                  },
                                  {
                                    value: "0.62",
                                  },
                                ],
                                property: "value",
                              },
                            ],
                            value: "IntactMiScore0.62",
                          },
                        ],
                        property: "confidenceScore",
                      },
                    ],
                    value: "bio/P85A_HUMAN_FGFR1_HUMAN",
                  },
                  {
                    neighbors: [
                      {
                        direction: "DIRECTION_OUT",
                        nodes: [
                          {
                            value: "NOSTN_HUMAN_FGFR1_HUMAN",
                          },
                        ],
                        property: "name",
                      },
                      {
                        direction: "DIRECTION_OUT",
                        nodes: [
                          {
                            neighbors: [
                              {
                                direction: "DIRECTION_OUT",
                                nodes: [
                                  {
                                    value: "0.63",
                                  },
                                ],
                                property: "value",
                              },
                            ],
                            value: "IntactMiScore0.63",
                          },
                        ],
                        property: "confidenceScore",
                      },
                    ],
                    value: "bio/NOSTN_HUMAN_FGFR1_HUMAN",
                  },
                  {
                    neighbors: [
                      {
                        direction: "DIRECTION_OUT",
                        nodes: [
                          {
                            value: "NEDD4_HUMAN_FGFR1_HUMAN",
                          },
                        ],
                        property: "name",
                      },
                      {
                        direction: "DIRECTION_OUT",
                        nodes: [
                          {
                            neighbors: [
                              {
                                direction: "DIRECTION_OUT",
                                nodes: [
                                  {
                                    value: "0.67",
                                  },
                                  {
                                    value: "0.67",
                                  },
                                ],
                                property: "value",
                              },
                            ],
                            value: "IntactMiScore0.67",
                          },
                        ],
                        property: "confidenceScore",
                      },
                    ],
                    value: "bio/NEDD4_HUMAN_FGFR1_HUMAN",
                  },
                  {
                    neighbors: [
                      {
                        direction: "DIRECTION_OUT",
                        nodes: [
                          {
                            value: "KLOTB_HUMAN_FGFR1_HUMAN",
                          },
                        ],
                        property: "name",
                      },
                      {
                        direction: "DIRECTION_OUT",
                        nodes: [
                          {
                            neighbors: [
                              {
                                direction: "DIRECTION_OUT",
                                nodes: [
                                  {
                                    value: "0.44",
                                  },
                                  {
                                    value: "0.44",
                                  },
                                ],
                                property: "value",
                              },
                            ],
                            value: "IntactMiScore0.44",
                          },
                        ],
                        property: "confidenceScore",
                      },
                    ],
                    value: "bio/KLOTB_HUMAN_FGFR1_HUMAN",
                  },
                  {
                    neighbors: [
                      {
                        direction: "DIRECTION_OUT",
                        nodes: [
                          {
                            value: "GRB14_RAT_FGFR1_HUMAN",
                          },
                        ],
                        property: "name",
                      },
                      {
                        direction: "DIRECTION_OUT",
                        nodes: [
                          {
                            neighbors: [
                              {
                                direction: "DIRECTION_OUT",
                                nodes: [
                                  {
                                    value: "0.52",
                                  },
                                ],
                                property: "value",
                              },
                            ],
                            value: "IntactMiScore0.52",
                          },
                        ],
                        property: "confidenceScore",
                      },
                    ],
                    value: "bio/GRB14_RAT_FGFR1_HUMAN",
                  },
                  {
                    neighbors: [
                      {
                        direction: "DIRECTION_OUT",
                        nodes: [
                          {
                            value: "FGFR1_HUMAN_PLCG1_HUMAN",
                          },
                        ],
                        property: "name",
                      },
                      {
                        direction: "DIRECTION_OUT",
                        nodes: [
                          {
                            neighbors: [
                              {
                                direction: "DIRECTION_OUT",
                                nodes: [
                                  {
                                    value: "0.87",
                                  },
                                  {
                                    value: "0.87",
                                  },
                                ],
                                property: "value",
                              },
                            ],
                            value: "IntactMiScore0.87",
                          },
                        ],
                        property: "confidenceScore",
                      },
                    ],
                    value: "bio/FGFR1_HUMAN_PLCG1_HUMAN",
                  },
                  {
                    neighbors: [
                      {
                        direction: "DIRECTION_OUT",
                        nodes: [
                          {
                            value: "FGFR1_HUMAN_P85A_HUMAN",
                          },
                        ],
                        property: "name",
                      },
                      {
                        direction: "DIRECTION_OUT",
                        nodes: [
                          {
                            neighbors: [
                              {
                                direction: "DIRECTION_OUT",
                                nodes: [
                                  {
                                    value: "0.62",
                                  },
                                  {
                                    value: "0.62",
                                  },
                                ],
                                property: "value",
                              },
                            ],
                            value: "IntactMiScore0.62",
                          },
                        ],
                        property: "confidenceScore",
                      },
                    ],
                    value: "bio/FGFR1_HUMAN_P85A_HUMAN",
                  },
                  {
                    neighbors: [
                      {
                        direction: "DIRECTION_OUT",
                        nodes: [
                          {
                            value: "FGFR1_HUMAN_NEDD4_HUMAN",
                          },
                        ],
                        property: "name",
                      },
                      {
                        direction: "DIRECTION_OUT",
                        nodes: [
                          {
                            neighbors: [
                              {
                                direction: "DIRECTION_OUT",
                                nodes: [
                                  {
                                    value: "0.67",
                                  },
                                  {
                                    value: "0.67",
                                  },
                                ],
                                property: "value",
                              },
                            ],
                            value: "IntactMiScore0.67",
                          },
                        ],
                        property: "confidenceScore",
                      },
                    ],
                    value: "bio/FGFR1_HUMAN_NEDD4_HUMAN",
                  },
                  {
                    neighbors: [
                      {
                        direction: "DIRECTION_OUT",
                        nodes: [
                          {
                            value: "FGFR1_HUMAN_FRS2_HUMAN",
                          },
                        ],
                        property: "name",
                      },
                      {
                        direction: "DIRECTION_OUT",
                        nodes: [
                          {
                            neighbors: [
                              {
                                direction: "DIRECTION_OUT",
                                nodes: [
                                  {
                                    value: "0.35",
                                  },
                                ],
                                property: "value",
                              },
                            ],
                            value: "IntactMiScore0.35",
                          },
                        ],
                        property: "confidenceScore",
                      },
                    ],
                    value: "bio/FGFR1_HUMAN_FRS2_HUMAN",
                  },
                  {
                    neighbors: [
                      {
                        direction: "DIRECTION_OUT",
                        nodes: [
                          {
                            value: "ERBB3_HUMAN_FGFR1_HUMAN",
                          },
                        ],
                        property: "name",
                      },
                      {
                        direction: "DIRECTION_OUT",
                        nodes: [
                          {
                            neighbors: [
                              {
                                direction: "DIRECTION_OUT",
                                nodes: [
                                  {
                                    value: "0.44",
                                  },
                                  {
                                    value: "0.44",
                                  },
                                ],
                                property: "value",
                              },
                            ],
                            value: "IntactMiScore0.44",
                          },
                        ],
                        property: "confidenceScore",
                      },
                    ],
                    value: "bio/ERBB3_HUMAN_FGFR1_HUMAN",
                  },
                  {
                    neighbors: [
                      {
                        direction: "DIRECTION_OUT",
                        nodes: [
                          {
                            value: "CRK_HUMAN_FGFR1_HUMAN",
                          },
                        ],
                        property: "name",
                      },
                      {
                        direction: "DIRECTION_OUT",
                        nodes: [
                          {
                            neighbors: [
                              {
                                direction: "DIRECTION_OUT",
                                nodes: [
                                  {
                                    value: "0.56",
                                  },
                                ],
                                property: "value",
                              },
                            ],
                            value: "IntactMiScore0.56",
                          },
                        ],
                        property: "confidenceScore",
                      },
                    ],
                    value: "bio/CRK_HUMAN_FGFR1_HUMAN",
                  },
                ],
                property: "interactingProtein",
              },
            ],
            value: "bio/FGFR1_HUMAN",
          },
        ],
      },
      wantArray: [],
    },
  ];
  for (const c of cases) {
    const tissueScore = getTissueScore(c.data);
    try {
      expect(tissueScore).toEqual(c.wantArray);
    } catch (e) {
      console.log(
        `Got different tissue score array than expected for query data`
      );
      throw e;
    }
  }
});


test("getProteinInteraction", () => {
  const cases: {
    data: GraphNodes;
    wantArray: InteractingProteinType[];
    nodeName: string;
  }[] = [
    // Passing in P53_HUMAN data
    {data: dataP53,
      nodeName: "P53_HUMAN",
      wantArray: [
      {
        name: "ZN420_HUMAN_P53_HUMAN",
        value: 0.59,
        parent: "P53_HUMAN"
      },
      {
        name: "ZN363_HUMAN_P53_HUMAN",
        value: 0.85,
        parent: "P53_HUMAN"
      },
      {
        name: "X_HBVA3_P53_HUMAN",
        value: 0.40,
        parent: "P53_HUMAN"
      },
    ],
    },
    {
      data: {
        "nodes": [
            {
                "neighbors": [
                    {
                        "direction": "DIRECTION_IN",
                        "nodes": [
                            {
                                "neighbors": [
                                    {
                                        "direction": "DIRECTION_OUT",
                                        "nodes": [
                                            {
                                                "value": "ProteinExpressionNotDetected"
                                            }
                                        ],
                                        "property": "proteinExpressionScore"
                                    },
                                    {
                                        "direction": "DIRECTION_OUT",
                                        "nodes": [
                                            {
                                                "value": "Vagina"
                                            }
                                        ],
                                        "property": "humanTissue"
                                    }
                                ],
                                "value": "bio/P53_HUMAN_Vagina_SquamousEpithelialCells"
                            },
                            {
                                "neighbors": [
                                    {
                                        "direction": "DIRECTION_OUT",
                                        "nodes": [
                                            {
                                                "value": "ProteinExpressionLow"
                                            }
                                        ],
                                        "property": "proteinExpressionScore"
                                    },
                                    {
                                        "direction": "DIRECTION_OUT",
                                        "nodes": [
                                            {
                                                "value": "UrinaryBladder"
                                            }
                                        ],
                                        "property": "humanTissue"
                                    }
                                ],
                                "value": "bio/P53_HUMAN_UrinaryBladder_UrothelialCells"
                            },
                            {
                                "neighbors": [
                                    {
                                        "direction": "DIRECTION_OUT",
                                        "nodes": [
                                            {
                                                "value": "ProteinExpressionLow"
                                            }
                                        ],
                                        "property": "proteinExpressionScore"
                                    },
                                    {
                                        "direction": "DIRECTION_OUT",
                                        "nodes": [
                                            {
                                                "value": "Tonsil"
                                            }
                                        ],
                                        "property": "humanTissue"
                                    }
                                ],
                                "value": "bio/P53_HUMAN_Tonsil_SquamousEpithelialCells"
                            }
                        ],
                        "property": "detectedProtein"
                    }
                ],
                "value": "bio/P53_HUMAN"
            }
        ]
},
      wantArray: [],
      nodeName: "P53_HUMAN",
    }
  ];
  for (const c of cases) {
    const tissueInteraction = getProteinInteraction(c.data, c.nodeName);
    try {
      expect(tissueInteraction).toEqual(c.wantArray);
    } catch (e) {
      console.log(
        `Got different tissue score array than expected for query data`
      );
      throw e;
    }
  }
});


test("getDiseaseGeneAssoc", () => {
  //const wrapper = shallow(<Page dcid={"test"} nodeName={"P53_HUMAN"} />);
  const cases: {
    data: GraphNodes;
    wantArray: { name: string; value: number }[];
  }[] = [
    // Passing in P53_HUMAN data
    {data: dataP53,
      wantArray: [
    {
        name: "\"hypereosinophilic syndrome\"",
        value: 1.307
    },
    {
        name: "\"hypoglycemia\"",
        value: 1.637
    }
    ],
    },
    {
      data: {
        "nodes": [
            {
                "neighbors": [
                    {
                        "direction": "DIRECTION_IN",
                        "nodes": [
                            {
                                "neighbors": [
                                    {
                                        "direction": "DIRECTION_OUT",
                                        "nodes": [
                                            {
                                                "value": "ProteinExpressionNotDetected"
                                            }
                                        ],
                                        "property": "proteinExpressionScore"
                                    },
                                    {
                                        "direction": "DIRECTION_OUT",
                                        "nodes": [
                                            {
                                                "value": "Vagina"
                                            }
                                        ],
                                        "property": "humanTissue"
                                    }
                                ],
                                "value": "bio/P53_HUMAN_Vagina_SquamousEpithelialCells"
                            },
                            {
                                "neighbors": [
                                    {
                                        "direction": "DIRECTION_OUT",
                                        "nodes": [
                                            {
                                                "value": "ProteinExpressionLow"
                                            }
                                        ],
                                        "property": "proteinExpressionScore"
                                    },
                                    {
                                        "direction": "DIRECTION_OUT",
                                        "nodes": [
                                            {
                                                "value": "UrinaryBladder"
                                            }
                                        ],
                                        "property": "humanTissue"
                                    }
                                ],
                                "value": "bio/P53_HUMAN_UrinaryBladder_UrothelialCells"
                            },
                            {
                                "neighbors": [
                                    {
                                        "direction": "DIRECTION_OUT",
                                        "nodes": [
                                            {
                                                "value": "ProteinExpressionLow"
                                            }
                                        ],
                                        "property": "proteinExpressionScore"
                                    },
                                    {
                                        "direction": "DIRECTION_OUT",
                                        "nodes": [
                                            {
                                                "value": "Tonsil"
                                            }
                                        ],
                                        "property": "humanTissue"
                                    }
                                ],
                                "value": "bio/P53_HUMAN_Tonsil_SquamousEpithelialCells"
                            }
                        ],
                        "property": "detectedProtein"
                    }
                ],
                "value": "bio/P53_HUMAN"
            }
        ]
},
      wantArray: []
    }
  ];
  for (const c of cases) {
    const diseaseGeneAssoc = getDiseaseGeneAssoc(c.data);
    try {
      expect(diseaseGeneAssoc).toEqual(c.wantArray);
    } catch (e) {
      console.log(
        `Got different disease gene association array than expected for query data`
      );
      throw e;
    }
  }
});

test("getVarGeneAssoc", () => {
  const cases: {
    data: GraphNodes;
    wantArray: ProteinVarType[];
  }[] = [
    // Passing in P53_HUMAN data
    {data: dataP53,
      wantArray: [
    {
        id: "bio/rs7211097",
        name: "Whole Blood",
        value: "-0.094116",
        interval: "[-0.126789 -0.054901]"
    },
    {
        id: "bio/rs62059165",
        name: "Thyroid",
        value: "0.160064",
        interval: "[0.102083 0.231955]"
    },
    {
        id: "bio/rs7220915",
        name: "Pancreas",
        value: "0.081840",
        interval: "[0.017535 0.145954]"
    }
],
    },
    {
      data: {
        "nodes": [
            {
                "neighbors": [
                    {
                        "direction": "DIRECTION_IN",
                        "nodes": [
                            {
                                "neighbors": [
                                    {
                                        "direction": "DIRECTION_OUT",
                                        "nodes": [
                                            {
                                                "value": "ProteinExpressionNotDetected"
                                            }
                                        ],
                                        "property": "proteinExpressionScore"
                                    },
                                    {
                                        "direction": "DIRECTION_OUT",
                                        "nodes": [
                                            {
                                                "value": "Vagina"
                                            }
                                        ],
                                        "property": "humanTissue"
                                    }
                                ],
                                "value": "bio/P53_HUMAN_Vagina_SquamousEpithelialCells"
                            },
                            {
                                "neighbors": [
                                    {
                                        "direction": "DIRECTION_OUT",
                                        "nodes": [
                                            {
                                                "value": "ProteinExpressionLow"
                                            }
                                        ],
                                        "property": "proteinExpressionScore"
                                    },
                                    {
                                        "direction": "DIRECTION_OUT",
                                        "nodes": [
                                            {
                                                "value": "UrinaryBladder"
                                            }
                                        ],
                                        "property": "humanTissue"
                                    }
                                ],
                                "value": "bio/P53_HUMAN_UrinaryBladder_UrothelialCells"
                            },
                            {
                                "neighbors": [
                                    {
                                        "direction": "DIRECTION_OUT",
                                        "nodes": [
                                            {
                                                "value": "ProteinExpressionLow"
                                            }
                                        ],
                                        "property": "proteinExpressionScore"
                                    },
                                    {
                                        "direction": "DIRECTION_OUT",
                                        "nodes": [
                                            {
                                                "value": "Tonsil"
                                            }
                                        ],
                                        "property": "humanTissue"
                                    }
                                ],
                                "value": "bio/P53_HUMAN_Tonsil_SquamousEpithelialCells"
                            }
                        ],
                        "property": "detectedProtein"
                    }
                ],
                "value": "bio/P53_HUMAN"
            }
        ]
},
      wantArray: []
    }
  ];
  for (const c of cases) {
    const varGeneAssoc = getVarGeneAssoc(c.data);
    try {
      expect(varGeneAssoc).toEqual(c.wantArray);
    } catch (e) {
      console.log(
        `Got different variant gene association array than expected for query data`
      );
      throw e;
    }
  }
});


test("getVarTypeAssoc", () => {
  const cases: {
    data: GraphNodes;
    wantArray: { name: string; value: number }[];
  }[] = [
    // Passing in P53_HUMAN data
    {data: dataP53,
      wantArray: [
    {
        "name": "GeneticVariantFunctionalCategorySplice5",
        "value": 2678
    },
    {
        "name": "GeneticVariantFunctionalCategoryCodingSynon",
        "value": 258
    }
],
    },
    {
      data: {
        "nodes": [
            {
                "neighbors": [
                    {
                        "direction": "DIRECTION_IN",
                        "nodes": [
                            {
                                "neighbors": [
                                    {
                                        "direction": "DIRECTION_OUT",
                                        "nodes": [
                                            {
                                                "value": "ProteinExpressionNotDetected"
                                            }
                                        ],
                                        "property": "proteinExpressionScore"
                                    },
                                    {
                                        "direction": "DIRECTION_OUT",
                                        "nodes": [
                                            {
                                                "value": "Vagina"
                                            }
                                        ],
                                        "property": "humanTissue"
                                    }
                                ],
                                "value": "bio/P53_HUMAN_Vagina_SquamousEpithelialCells"
                            },
                            {
                                "neighbors": [
                                    {
                                        "direction": "DIRECTION_OUT",
                                        "nodes": [
                                            {
                                                "value": "ProteinExpressionLow"
                                            }
                                        ],
                                        "property": "proteinExpressionScore"
                                    },
                                    {
                                        "direction": "DIRECTION_OUT",
                                        "nodes": [
                                            {
                                                "value": "UrinaryBladder"
                                            }
                                        ],
                                        "property": "humanTissue"
                                    }
                                ],
                                "value": "bio/P53_HUMAN_UrinaryBladder_UrothelialCells"
                            },
                            {
                                "neighbors": [
                                    {
                                        "direction": "DIRECTION_OUT",
                                        "nodes": [
                                            {
                                                "value": "ProteinExpressionLow"
                                            }
                                        ],
                                        "property": "proteinExpressionScore"
                                    },
                                    {
                                        "direction": "DIRECTION_OUT",
                                        "nodes": [
                                            {
                                                "value": "Tonsil"
                                            }
                                        ],
                                        "property": "humanTissue"
                                    }
                                ],
                                "value": "bio/P53_HUMAN_Tonsil_SquamousEpithelialCells"
                            }
                        ],
                        "property": "detectedProtein"
                    }
                ],
                "value": "bio/P53_HUMAN"
            }
        ]
},
      wantArray: []
    }
  ];
  for (const c of cases) {
    const varTypeAssoc = getVarTypeAssoc(c.data);
    try {
      expect(varTypeAssoc).toEqual(c.wantArray);
    } catch (e) {
      console.log(
        `Got different variant type association array than expected for query data`
      );
      throw e;
    }
  }
});


test("getVarSigAssoc", () => {
  const cases: {
    data: GraphNodes;
    wantArray: { name: string; value: number }[];
  }[] = [
    // Passing in P53_HUMAN data
    {data: dataP53,
      wantArray: [
    {
        "name": "ClinSigConflictingPathogenicity",
        "value": 1146
    },
    {
        "name": "ClinSigUncertain",
        "value": 1184
    },
    {
        "name": "ClinSigPathogenic",
        "value": 560
    },
    {
        "name": "ClinSigBenign",
        "value": 58
    }
],
    },
    {
      data: {
        "nodes": [
            {
                "neighbors": [
                    {
                        "direction": "DIRECTION_IN",
                        "nodes": [
                            {
                                "neighbors": [
                                    {
                                        "direction": "DIRECTION_OUT",
                                        "nodes": [
                                            {
                                                "value": "ProteinExpressionNotDetected"
                                            }
                                        ],
                                        "property": "proteinExpressionScore"
                                    },
                                    {
                                        "direction": "DIRECTION_OUT",
                                        "nodes": [
                                            {
                                                "value": "Vagina"
                                            }
                                        ],
                                        "property": "humanTissue"
                                    }
                                ],
                                "value": "bio/P53_HUMAN_Vagina_SquamousEpithelialCells"
                            },
                            {
                                "neighbors": [
                                    {
                                        "direction": "DIRECTION_OUT",
                                        "nodes": [
                                            {
                                                "value": "ProteinExpressionLow"
                                            }
                                        ],
                                        "property": "proteinExpressionScore"
                                    },
                                    {
                                        "direction": "DIRECTION_OUT",
                                        "nodes": [
                                            {
                                                "value": "UrinaryBladder"
                                            }
                                        ],
                                        "property": "humanTissue"
                                    }
                                ],
                                "value": "bio/P53_HUMAN_UrinaryBladder_UrothelialCells"
                            },
                            {
                                "neighbors": [
                                    {
                                        "direction": "DIRECTION_OUT",
                                        "nodes": [
                                            {
                                                "value": "ProteinExpressionLow"
                                            }
                                        ],
                                        "property": "proteinExpressionScore"
                                    },
                                    {
                                        "direction": "DIRECTION_OUT",
                                        "nodes": [
                                            {
                                                "value": "Tonsil"
                                            }
                                        ],
                                        "property": "humanTissue"
                                    }
                                ],
                                "value": "bio/P53_HUMAN_Tonsil_SquamousEpithelialCells"
                            }
                        ],
                        "property": "detectedProtein"
                    }
                ],
                "value": "bio/P53_HUMAN"
            }
        ]
},
      wantArray: []
    }
  ];
  for (const c of cases) {
    const varSigAssoc = getVarSigAssoc(c.data);
    try {
      expect(varSigAssoc).toEqual(c.wantArray);
    } catch (e) {
      console.log(
        `Got different variant significance association array than expected for query data`
      );
      throw e;
    }
  }
});


test("getChemicalGeneAssoc", () => {
  const cases: {
    data: GraphNodes;
    wantArray: { name: string; value: number }[];
  }[] = [
    // Passing in P53_HUMAN data
    {data: dataP53,
      wantArray: [
    {
        "name": "RelationshipAssociationTypeAssociated",
        "value": 10
    },
    {
        "name": "RelationshipAssociationTypeNotAssociated",
        "value": 0
    },
    {
        "name": "RelationshipAssociationTypeAmbiguous",
        "value": 0
    }
],
    },
    {
      data: {
        "nodes": [
            {
                "neighbors": [
                    {
                        "direction": "DIRECTION_IN",
                        "nodes": [
                            {
                                "neighbors": [
                                    {
                                        "direction": "DIRECTION_OUT",
                                        "nodes": [
                                            {
                                                "value": "ProteinExpressionNotDetected"
                                            }
                                        ],
                                        "property": "proteinExpressionScore"
                                    },
                                    {
                                        "direction": "DIRECTION_OUT",
                                        "nodes": [
                                            {
                                                "value": "Vagina"
                                            }
                                        ],
                                        "property": "humanTissue"
                                    }
                                ],
                                "value": "bio/P53_HUMAN_Vagina_SquamousEpithelialCells"
                            },
                            {
                                "neighbors": [
                                    {
                                        "direction": "DIRECTION_OUT",
                                        "nodes": [
                                            {
                                                "value": "ProteinExpressionLow"
                                            }
                                        ],
                                        "property": "proteinExpressionScore"
                                    },
                                    {
                                        "direction": "DIRECTION_OUT",
                                        "nodes": [
                                            {
                                                "value": "UrinaryBladder"
                                            }
                                        ],
                                        "property": "humanTissue"
                                    }
                                ],
                                "value": "bio/P53_HUMAN_UrinaryBladder_UrothelialCells"
                            },
                            {
                                "neighbors": [
                                    {
                                        "direction": "DIRECTION_OUT",
                                        "nodes": [
                                            {
                                                "value": "ProteinExpressionLow"
                                            }
                                        ],
                                        "property": "proteinExpressionScore"
                                    },
                                    {
                                        "direction": "DIRECTION_OUT",
                                        "nodes": [
                                            {
                                                "value": "Tonsil"
                                            }
                                        ],
                                        "property": "humanTissue"
                                    }
                                ],
                                "value": "bio/P53_HUMAN_Tonsil_SquamousEpithelialCells"
                            }
                        ],
                        "property": "detectedProtein"
                    }
                ],
                "value": "bio/P53_HUMAN"
            }
        ]
},
      wantArray: []
    }
  ];
  for (const c of cases) {
    const chemGeneAssoc = getChemicalGeneAssoc(c.data);
    try {
      expect(chemGeneAssoc).toEqual(c.wantArray);
    } catch (e) {
      console.log(
        `Got different chemical gene association array than expected for query data`
      );
      throw e;
    }
  }
});


