import Enzyme, { shallow } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
import _ from "lodash";
import React from "react";

Enzyme.configure({ adapter: new Adapter() });

import { GraphNodes } from "../shared/types";
import { ProteinPropDataStrType } from "./chart";
import { Page } from "./page";

test("getTissueScore", () => {
  const wrapper = shallow(<Page dcid={"test"} nodeName={"test-node"} />);
  const cases: {
    data: GraphNodes;
    wantArray: ProteinPropDataStrType[];
  }[] = [
    // Passing in P53_HUMAN data
    {
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
                            value: "ProteinExpressionNotDetected",
                          },
                        ],
                        property: "proteinExpressionScore",
                      },
                      {
                        direction: "DIRECTION_OUT",
                        nodes: [
                          {
                            value: "Vagina",
                          },
                        ],
                        property: "humanTissue",
                      },
                    ],
                    value: "bio/P53_HUMAN_Vagina_SquamousEpithelialCells",
                  },
                  {
                    neighbors: [
                      {
                        direction: "DIRECTION_OUT",
                        nodes: [
                          {
                            value: "ProteinExpressionLow",
                          },
                        ],
                        property: "proteinExpressionScore",
                      },
                      {
                        direction: "DIRECTION_OUT",
                        nodes: [
                          {
                            value: "UrinaryBladder",
                          },
                        ],
                        property: "humanTissue",
                      },
                    ],
                    value: "bio/P53_HUMAN_UrinaryBladder_UrothelialCells",
                  },
                  {
                    neighbors: [
                      {
                        direction: "DIRECTION_OUT",
                        nodes: [
                          {
                            value: "ProteinExpressionLow",
                          },
                        ],
                        property: "proteinExpressionScore",
                      },
                      {
                        direction: "DIRECTION_OUT",
                        nodes: [
                          {
                            value: "Tonsil",
                          },
                        ],
                        property: "humanTissue",
                      },
                    ],
                    value: "bio/P53_HUMAN_Tonsil_SquamousEpithelialCells",
                  },
                  {
                    neighbors: [
                      {
                        direction: "DIRECTION_OUT",
                        nodes: [
                          {
                            value: "ProteinExpressionNotDetected",
                          },
                        ],
                        property: "proteinExpressionScore",
                      },
                      {
                        direction: "DIRECTION_OUT",
                        nodes: [
                          {
                            value: "Tonsil",
                          },
                        ],
                        property: "humanTissue",
                      },
                    ],
                    value: "bio/P53_HUMAN_Tonsil_NonGerminalCenterCells",
                  },
                  {
                    neighbors: [
                      {
                        direction: "DIRECTION_OUT",
                        nodes: [
                          {
                            value: "ProteinExpressionNotDetected",
                          },
                        ],
                        property: "proteinExpressionScore",
                      },
                      {
                        direction: "DIRECTION_OUT",
                        nodes: [
                          {
                            value: "Tonsil",
                          },
                        ],
                        property: "humanTissue",
                      },
                    ],
                    value: "bio/P53_HUMAN_Tonsil_GerminalCenterCells",
                  },
                ],
                property: "detectedProtein",
              },
            ],
            value: "bio/P53_HUMAN",
          },
        ],
      },
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
          value: "ProteinExpressionNotDetected",
        },
      ],
    },
    {
      // Passing in FGFR1_HUMAN data
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
                            value: "ProteinExpressionMedium",
                          },
                        ],
                        property: "proteinExpressionScore",
                      },
                      {
                        direction: "DIRECTION_OUT",
                        nodes: [
                          {
                            value: "UrinaryBladder",
                          },
                        ],
                        property: "humanTissue",
                      },
                    ],
                    value: "bio/FGFR1_HUMAN_UrinaryBladder_UrothelialCells",
                  },
                ],
                property: "detectedProtein",
              },
            ],
            value: "bio/FGFR1_HUMAN",
          },
        ],
      },
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
    const tissueScore = wrapper.instance().getTissueScore(c.data);
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
