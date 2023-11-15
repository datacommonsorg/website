import Adapter from "@wojtekmaj/enzyme-adapter-react-17";
import Enzyme from "enzyme";

Enzyme.configure({ adapter: new Adapter() });

import { GraphNodes } from "../../shared/types";
import { ProteinStrData } from "./chart";
import dataFGFR1 from "./data_FGFR1.json";
import dataP53 from "./data_P53.json";
import {
  getChemicalGeneAssoc,
  getDiseaseGeneAssoc,
  getProteinInteraction,
  getTissueScore,
  getVarGeneAssoc,
  getVarSigAssoc,
  getVarTypeAssoc,
} from "./data_processing_utils";
import {
  DiseaseAssociationType,
  InteractingProteinType,
  ProteinVarType,
} from "./page";
test("getTissueScore", () => {
  //const wrapper = shallow(<Page dcid={"test"} nodeName={"test-node"} />);
  const cases: {
    data: GraphNodes;
    wantArray: ProteinStrData[];
  }[] = [
    // Passing in P53_HUMAN data
    {
      data: dataP53 as GraphNodes,
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
      data: dataFGFR1 as GraphNodes,
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
        "Got different tissue score array than expected for query data"
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
    {
      data: dataP53 as GraphNodes,
      nodeName: "P53_HUMAN",
      wantArray: [
        {
          name: "ZN420_HUMAN_P53_HUMAN",
          parent: "P53_HUMAN",
          value: 0.59,
        },
        {
          name: "ZN363_HUMAN_P53_HUMAN",
          parent: "P53_HUMAN",
          value: 0.85,
        },
        {
          name: "X_HBVA3_P53_HUMAN",
          parent: "P53_HUMAN",
          value: 0.4,
        },
      ],
    },
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
                ],
                property: "detectedProtein",
              },
            ],
            value: "bio/P53_HUMAN",
          },
        ],
      },
      nodeName: "P53_HUMAN",
      wantArray: [],
    },
  ];
  for (const c of cases) {
    const tissueInteraction = getProteinInteraction(c.data, c.nodeName);
    try {
      expect(tissueInteraction).toEqual(c.wantArray);
    } catch (e) {
      console.log(
        "Got different tissue score array than expected for query data"
      );
      throw e;
    }
  }
});

test("getDiseaseGeneAssoc", () => {
  //const wrapper = shallow(<Page dcid={"test"} nodeName={"P53_HUMAN"} />);
  const cases: {
    data: GraphNodes;
    wantArray: DiseaseAssociationType[];
  }[] = [
    // Passing in P53_HUMAN data
    {
      data: dataP53 as GraphNodes,
      wantArray: [
        {
          id: "bio/DOID_999",
          name: '"hypereosinophilic syndrome"',
          value: 1.307,
        },
        {
          id: "bio/DOID_9993",
          name: '"hypoglycemia"',
          value: 1.637,
        },
      ],
    },
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
                ],
                property: "detectedProtein",
              },
            ],
            value: "bio/P53_HUMAN",
          },
        ],
      },
      wantArray: [],
    },
  ];
  for (const c of cases) {
    const diseaseGeneAssoc = getDiseaseGeneAssoc(c.data);
    try {
      expect(diseaseGeneAssoc).toEqual(c.wantArray);
    } catch (e) {
      console.log(
        "Got different disease gene association array than expected for query data"
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
    {
      data: dataP53 as GraphNodes,
      wantArray: [
        {
          associationID: "bio/pg37tb2s2hnn8dyev9q986j36b",
          id: "bio/rs7211097",
          interval: "[-0.126789 -0.054901]",
          name: "Whole Blood",
          value: "-0.094116",
        },
        {
          associationID: "bio/7gs5e8nzcl3tfp930d901fssc7",
          id: "bio/rs62059165",
          interval: "[0.102083 0.231955]",
          name: "Thyroid",
          value: "0.160064",
        },
        {
          associationID: "bio/5dw9kkb9f9z59mk0e2yj0tnbp6",
          id: "bio/rs7220915",
          interval: "[0.017535 0.145954]",
          name: "Pancreas",
          value: "0.081840",
        },
      ],
    },
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
                ],
                property: "detectedProtein",
              },
            ],
            value: "bio/P53_HUMAN",
          },
        ],
      },
      wantArray: [],
    },
  ];
  for (const c of cases) {
    const varGeneAssoc = getVarGeneAssoc(c.data);
    try {
      expect(varGeneAssoc).toEqual(c.wantArray);
    } catch (e) {
      console.log(
        "Got different variant gene association array than expected for query data"
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
    {
      data: dataP53 as GraphNodes,
      wantArray: [
        {
          name: "GeneticVariantFunctionalCategorySplice5",
          value: 2678,
        },
        {
          name: "GeneticVariantFunctionalCategoryCodingSynon",
          value: 258,
        },
        {
          name: "GeneticVariantFunctionalCategoryUTR3",
          value: 0,
        },
        {
          name: "GeneticVariantFunctionalCategoryUTR5",
          value: 0,
        },
        {
          name: "GeneticVariantFunctionalCategoryFrameshift",
          value: 0,
        },
        {
          name: "GeneticVariantFunctionalCategoryIntron",
          value: 0,
        },
        {
          name: "GeneticVariantFunctionalCategoryMissense",
          value: 0,
        },
        {
          name: "GeneticVariantFunctionalCategoryNearGene3",
          value: 0,
        },
        {
          name: "GeneticVariantFunctionalCategoryNearGene5",
          value: 0,
        },
        {
          name: "GeneticVariantFunctionalCategoryNonsense",
          value: 0,
        },
        {
          name: "GeneticVariantFunctionalCategorySplice3",
          value: 0,
        },
        {
          name: "GeneticVariantFunctionalCategoryStopLoss",
          value: 0,
        },
        {
          name: "GeneticVariantFunctionalCategoryUnknown",
          value: 0,
        },
        {
          name: "GeneticVariantFunctionalCDSIndel",
          value: 0,
        },
        {
          name: "GeneticVariantFunctionalCategoryCDSReference",
          value: 0,
        },
        {
          name: "GeneticVariantFunctionalCategoryncRNA",
          value: 0,
        },
      ],
    },
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
                ],
                property: "detectedProtein",
              },
            ],
            value: "bio/P53_HUMAN",
          },
        ],
      },
      wantArray: [],
    },
  ];
  for (const c of cases) {
    const varTypeAssoc = getVarTypeAssoc(c.data);
    try {
      expect(varTypeAssoc).toEqual(c.wantArray);
    } catch (e) {
      console.log(
        "Got different variant type association array than expected for query data"
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
    {
      data: dataP53 as GraphNodes,
      wantArray: [
        {
          name: "ClinSigConflictingPathogenicity",
          value: 1146,
        },
        {
          name: "ClinSigUncertain",
          value: 1184,
        },
        {
          name: "ClinSigPathogenic",
          value: 560,
        },
        {
          name: "ClinSigBenign",
          value: 58,
        },
        {
          name: "ClinSigAffects",
          value: 0,
        },
        {
          name: "ClinSigAssociation",
          value: 0,
        },
        {
          name: "ClinSigAssociationNotFound",
          value: 0,
        },
        {
          name: "ClinSigBenignLikelyBenign",
          value: 0,
        },
        {
          name: "ClinSigDrugResponse",
          value: 0,
        },
        {
          name: "ClinSigHistocompatability",
          value: 0,
        },
        {
          name: "ClinSigLikelyBenign",
          value: 0,
        },
        {
          name: "ClinSigLikelyPathogenic",
          value: 0,
        },
        {
          name: "ClinSigNotProvided",
          value: 0,
        },
        {
          name: "ClinSigOther",
          value: 0,
        },
        {
          name: "ClinSigPathogenicLikelyPathogenic",
          value: 0,
        },
        {
          name: "ClinSigProtective",
          value: 0,
        },
        {
          name: "ClinSigRiskFactor",
          value: 0,
        },
        {
          name: "ClinSigUnknown",
          value: 0,
        },
        {
          name: "ClinSigUntested",
          value: 0,
        },
      ],
    },
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
                ],
                property: "detectedProtein",
              },
            ],
            value: "bio/P53_HUMAN",
          },
        ],
      },
      wantArray: [],
    },
  ];
  for (const c of cases) {
    const varSigAssoc = getVarSigAssoc(c.data);
    try {
      expect(varSigAssoc).toEqual(c.wantArray);
    } catch (e) {
      console.log(
        "Got different variant significance association array than expected for query data"
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
    {
      data: dataP53 as GraphNodes,
      wantArray: [
        {
          name: "RelationshipAssociationTypeAssociated",
          value: 10,
        },
        {
          name: "RelationshipAssociationTypeNotAssociated",
          value: 0,
        },
        {
          name: "RelationshipAssociationTypeAmbiguous",
          value: 0,
        },
      ],
    },
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
                ],
                property: "detectedProtein",
              },
            ],
            value: "bio/P53_HUMAN",
          },
        ],
      },
      wantArray: [],
    },
  ];
  for (const c of cases) {
    const chemGeneAssoc = getChemicalGeneAssoc(c.data);
    try {
      expect(chemGeneAssoc).toEqual(c.wantArray);
    } catch (e) {
      console.log(
        "Got different chemical gene association array than expected for query data"
      );
      throw e;
    }
  }
});
