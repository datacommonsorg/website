import Enzyme from "enzyme";
import Adapter from "enzyme-adapter-react-16";

Enzyme.configure({ adapter: new Adapter() });

import { GraphNodes } from "../../shared/types";
import { DiseaseGeneAssociationData } from "./chart";
import dataDOID2403 from "./data_DOID_2403.json";
import { getDiseaseGeneAssociation } from "./data_processing_utils";

test("getDiseaseGeneAssociation", () => {
  const cases: {
    data: GraphNodes;
    wantArray: DiseaseGeneAssociationData[];
  }[] = [
    {
      data: dataDOID2403 as GraphNodes,
      wantArray: [
        {
          lowerInterval: 1.5154999999999998,
          name: "pRNA",
          score: 2.021,
          upperInterval: 2.5265,
        },
        {
          lowerInterval: 1.2605,
          name: "hsa_circ_002125",
          score: 1.681,
          upperInterval: 2.1015,
        },
        {
          lowerInterval: 0.9390000000000001,
          name: "hsa_circ_002059",
          score: 1.252,
          upperInterval: 1.565,
        },
        {
          lowerInterval: 2.238,
          name: "18S_rRNA",
          score: 2.984,
          upperInterval: 3.73,
        },
      ],
    },
  ];
  for (const c of cases) {
    const diseaseGeneAssoc = getDiseaseGeneAssociation(c.data);
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
