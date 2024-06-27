# Curated Input for Bio index

This index has properties used by biomedical entities and follows the format of
[relation
expressions](https://docs.datacommons.org/api/rest/v2#relation-expressions).
Properties can be structured like:

- `prop`: this can match to either in or out properties
  - e.g., `virusHost` which will match both the 'in' and 'out' values for the
    property virusHost
- `->prop`: this matches to an 'out' property
  - e.g., `->phylum` which will match the 'out' values for the property phylum
- `<-prop`: this matches to an 'in' property
  - e.g., `<-virusGenus` which will match the 'in' values for the property virusGenus
- `<-prop1{typeOf:X}->prop2`: in this case, we will get all the 'in' values for
  prop1 that are of type X & then from those values, get all the 'out' values
  for prop2
  - e.g., `<-geneID{typeOf:DiseaseGeneAssociation}->diseaseOntologyID` which
    will first get all the DiseaseGeneAssociations that are 'in' values for the
    property geneID and then get all the 'out' values for the property
    diseaseOntologyID for those DiseaseGeneAssociations.
