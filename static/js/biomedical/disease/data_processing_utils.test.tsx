import Enzyme from "enzyme";
import Adapter from "enzyme-adapter-react-16";

Enzyme.configure({ adapter: new Adapter() });

import { GraphNodes } from "../../shared/types";
import dataDOID2403 from "./data_DOID_8622.json";
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
          lowerInterval: 2.0119999999999996,
          name: "pRNA",
          score: 2.683,
          upperInterval: 3.354,
        },
        {
          lowerInterval: 1.5404999999999998,
          name: "hsa-miR-7704",
          score: 2.054,
          upperInterval: 2.5675,
        },
        {
          lowerInterval: 1.24,
          name: "18S_rRNA",
          score: 1.653,
          upperInterval: 2.066,
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
          name: "Prodromal Symptoms",
          oddsRatio: 17.8491,
        },
        {
          name: "Deafness",
          oddsRatio: 4.6819,
        },
        {
          name: "Travel-Related Illness",
          oddsRatio: 67.0496,
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
          clinicalPhaseNumber: 2,
          id: "CHEMBL2109225",
          name: "rubella virus vaccine live",
          node: "bio/CTD_CHEMBL2109225_DOID_8622",
        },
        {
          clinicalPhaseNumber: 2,
          id: "CHEMBL2109211",
          name: "measles virus vaccine live",
          node: "bio/CTD_CHEMBL2109211_DOID_8622",
        },
        {
          clinicalPhaseNumber: 2,
          id: "CHEMBL2109201",
          name: "mumps virus vaccine live",
          node: "bio/CTD_CHEMBL2109201_DOID_8622",
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
          node: "bio/CCiD_CHEMBL1091_DOID_8622",
          id: "CHEMBL1091",
          name: "hydrocortisone acetate",
          drugSource: "chembl",
        },
        {
          drugSource: "chembl",
          id: "CHEMBL977",
          name: "hydrocortisone hemisuccinate",
          node: "bio/CCiD_CHEMBL977_DOID_8622",
        },
        {
          node: "bio/CCiD_CHEMBL1200637_DOID_8622",
          id: "CHEMBL1200637",
          name: "dexamethasone sodium phosphate",
          drugSource: "wombat-pk",
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
    wantName: string;
  }[] = [
    {
      data: dataDOID2403 as GraphNodes,
      wantName: undefined,
    },
  ];
  for (const c of cases) {
    const diseaseName = getDiseaseCommonName(c.data);
    try {
      expect(diseaseName).toEqual(c.wantName);
    } catch (e) {
      console.log(
        "Got different disease common names than expected for query data"
      );
      throw e;
    }
  }
});
