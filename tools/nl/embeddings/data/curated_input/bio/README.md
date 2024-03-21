# Curated Input for Bio index

This index has properties used by biomedical entities and follows the format of [relation expressions](https://docs.datacommons.org/api/rest/v2#relation-expressions). Properties can be structured like:

- `prop`: this can match to either in or out properties
- `->prop`: this matches to an 'out' property
- `<-prop`: this matches to an 'in' property
- `<-prop1{typeOf:X}->prop2`: in this case, we will get all the 'in' values for prop1 that are of type X & then from those values, get all the 'out' values for prop2