import Enzyme from "enzyme";
import Adapter from "enzyme-adapter-react-16";

Enzyme.configure({ adapter: new Adapter() });

import { GraphNodes } from "../../shared/types";
import dataDOID2403 from "./data_DOID_2403.json";
import {
  getCompoundDiseaseContraindication,
  getCompoundDiseaseTreatment,
  getDiseaseCommonName,
  getDiseaseGeneAssociation,
  getDiseaseSymptomAssociation,
} from "./data_processing_utils";
import {
  CompoundDiseaseContraindicationData,
  CompoundDiseaseTreatmentData,
  DiseaseGeneAssociationData,
  DiseaseSymptomAssociationData,
} from "./types";

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

test("getDiseaseSymptomAssociation", () => {
  const cases: {
    data: GraphNodes;
    wantArray: DiseaseSymptomAssociationData[];
  }[] = [
    {
      data: dataDOID2403 as GraphNodes,
      wantArray: [
        {
          name: "Schoenlein-Henoch",
          oddsRatio: 3.7132,
        },
        {
          name: "Intellectual Disability",
          oddsRatio: 20.4461,
        },
        {
          name: "Fasciculation",
          oddsRatio: 16.1094,
        },
      ],
    },
  ];
  for (const c of cases) {
    const diseaseSymptomAssoc = getDiseaseSymptomAssociation(c.data);
    try {
      expect(diseaseSymptomAssoc).toEqual(c.wantArray);
    } catch (e) {
      console.log(
        "Got different disease symptom association array than expected for query data"
      );
      throw e;
    }
  }
});

test("getCompoundDiseaseTreatment", () => {
  const cases: {
    data: GraphNodes;
    wantArray: CompoundDiseaseTreatmentData[];
  }[] = [
    {
      data: dataDOID2403 as GraphNodes,
      wantArray: [
        {
          clinicalPhaseNumber: 4,
          id: "CHEMBL141",
          name: "lamivudine",
          node: "bio/CTD_CHEMBL141_DOID_2043",
        },
        {
          clinicalPhaseNumber: 4,
          id: "CHEMBL1201560",
          name: "peginterferon alfa-2a",
          node: "bio/CTD_CHEMBL1201560_DOID_2043",
        },
      ],
    },
  ];
  for (const c of cases) {
    const compoundDiseaseTreatment = getCompoundDiseaseTreatment(c.data);
    try {
      expect(compoundDiseaseTreatment).toEqual(c.wantArray);
    } catch (e) {
      console.log(
        "Got different chemical compound disease treatment array than expected for query data"
      );
      throw e;
    }
  }
});

test("getCompoundDiseaseContraindication", () => {
  const cases: {
    data: GraphNodes;
    wantArray: CompoundDiseaseContraindicationData[];
  }[] = [
    {
      data: dataDOID2403 as GraphNodes,
      wantArray: [
        {
          node: "bio/CCiD_CHEMBL1200733_DOID_2043",
          id: "CHEMBL1200733",
          name: "desflurane",
          drugSource: "chembl",
        },
        {
          node: "bio/CCiD_CHEMBL960_DOID_2043",
          id: "CHEMBL960",
          name: "leflunomide",
          drugSource: "drug matrix",
        },
      ],
    },
  ];
  for (const c of cases) {
    const compoundDiseaseContraindication = getCompoundDiseaseContraindication(
      c.data
    );
    try {
      expect(compoundDiseaseContraindication).toEqual(c.wantArray);
    } catch (e) {
      console.log(
        "Got different chemical compound disease contraindication array than expected for query data"
      );
      throw e;
    }
  }
});

test("getDiseaseCommonName", () => {
  const cases: {
    data: GraphNodes;
    wantArray: string;
  }[] = [
    {
      data: dataDOID2403 as GraphNodes,
      wantArray: "Hepatitis B",
    },
  ];
  for (const c of cases) {
    const diseaseName = getDiseaseCommonName(c.data);
    try {
      expect(diseaseName).toEqual(c.wantArray);
    } catch (e) {
      console.log(
        "Got different disease common names than expected for query data"
      );
      throw e;
    }
  }
});
