# Data Commons JavaScript Client

JavaScript client for fetching Data Commons data as CSV, JSON, or GeoJSON.

## References

- [datacommons.org](https://datacommons.org)
- [Data Commons Documentation](https://docs.datacommons.org)
- [Data Commons Statistical Variable Explorer](https://datacommons.org/tools/statvar)
- [Data Commons Statistical Place Explorer](https://datacommons.org/place)
- [Data Commons Statistical Graph Browser](https://datacommons.org/browser)

## Usage

Install `@datacommonsorg/client`

```bash
npm i @datacommonsorg/client
```

Initialize client

```js
import { DataCommonsClient } from "@datacommonsorg/client";

const client = new DataCommonsClient();
```

### Getting data

`@datacommons/client` fetches Data Commons statistical variable observations about an entity.

[Data Commons](https://datacommons.org) tracks over 175k+ statistical variables, ranging from things like ["Total Population"](https://www.datacommons.org/tools/statvar#sv=Count_Person) to ["Total Number of Education Majors"](https://www.datacommons.org/tools/statvar#sv=Count_Person_BachelorOfEducationMajor). An "entity" is usally a geographic place like [The United States](https://datacommons.org/place/country/USA) or [California.](https://datacommons.org/place/geoId/06) A "variable observation" is the value of a variable for a particular entity (place) at a particular time. For example, [the total population of California in 2021 was 39237836](https://www.datacommons.org/tools/visualization#visType%3Dtimeline%26place%3DgeoId%2F06%26placeType%3DCounty%26sv%3D%7B%22dcid%22%3A%22Count_Person%22%7D) (according to census.gov)

Variables and entities are identified by [Data Commons Identifiers](https://docs.datacommons.org/glossary.html#dcid), or DCIDs.

To find the DCID of a entity or variable:

1. Browse all 175K+ variables with the [Data Commons Statistical Variable Explorer](https://datacommons.org/tools/statvar).
2. Search for entities and variables with the [Data Commons Search](https://datacommons.org/search) page.
3. Use the [Data Commons Graph Browser](https://datacommons.org/browser) to understand the relationship between entities.

### Data Requests

`@datacommonsorg/client`'s `DataCommonsClient` request parameters:

| Parameter           | Type     | Description                                                                                                                     |
| ------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------- |
| entities            | string[] | Entity DCIDs. Required if `parentEntity` and `childType` are empty. Example: `["country/USA", "country/IND"]`                   |
| parentEntity        | string   | Parent entity DCID. Required if `entities` is empty.                                                                            |
| childType           | string   | Child entity type. Required if `entities` is empty. Example: `"State"`                                                          |
| date?               | string   | \[optional\] Only return observations from this date. Example: `"2023"`                                                         |
| entityProps?        | string[] | \[optional\] Fetch these entity properties from the knowledge graph. Default: `["name", "isoCode"]`                             |
| variableProps?      | string[] | \[optional\] Fetch these variable properties from the knowledge graph. Default: `["name"]`                                      |
| perCapitaVariables? | string[] | \[optional\] Performs per-capita caluclation for all of these variables Must be a subset of `variables` param.                  |
| geoJsonProperty?    | string   | \[optional\] [getGeoJSON only] GeoJSON property name in the knowledge graph. Inferred if not provided.                          |
| rewind?             | boolean  | \[optional\] [getGeoJSON only] If true, returns "rewound" geometries that are opposite of the right-hand rule. Default: `true`. |

For example, to fetch the median household income for all states in the US:

```ts
{
  parentEntity: "country/USA",
  childType: "State",
  variables: ["Median_Income_Household"],
};
```

Or, for all counties in the US:

```ts
{
  parentEntity: "country/USA",
  childType: "County",
  variables: ["Median_Income_Household"],
};
```

Fetch the number of business majors per-capita in ([California](https://datacommons.org/place/geoId/06), [New York](https://datacommons.org/place/geoId/36), [Texas](https://datacommons.org/place/geoId/48)):

```ts
{
  entities: ["geoId/06", "geoId/36", "geoId/48"],
  variables: ["Count_Person_BachelorOfBusinessMajor"],
  perCapitaVariables: ["Count_Person_BachelorOfBusinessMajor"]
};
```

`@datacommonsorg/client` can fetch data as CSV, JSON, or GeoJSON

### Get CSV data

Fetch total population below the poverty level for each US State

```ts
const response = await client.getCsv({
  variables: ["Count_Person_BelowPovertyLevelInThePast12Months"],
  parentEntity: "country/USA",
  childType: "State",
});
```

```text
"Count_Person_BelowPovertyLevelInThePast12Months.date","Count_Person_BelowPovertyLevelInThePast12Months.name","Count_Person_BelowPovertyLevelInThePast12Months.unit","Count_Person_BelowPovertyLevelInThePast12Months.unitDisplayName","Count_Person_BelowPovertyLevelInThePast12Months.value","entity.isoCode","entity.name","entity.dcid"
"2021","Population Below Poverty Level Status in Past Year",null,null,769819,"US-AL","Alabama","geoId/01"
"2021","Population Below Poverty Level Status in Past Year",null,null,75016,"US-AK","Alaska","geoId/02"
"2021","Population Below Poverty Level Status in Past Year",null,null,934911,"US-AZ","Arizona","geoId/04"
"2021","Population Below Poverty Level Status in Past Year",null,null,468113,"US-AR","Arkansas","geoId/05"
"2021","Population Below Poverty Level Status in Past Year",null,null,4741175,"US-CA","California","geoId/06"
"2021","Population Below Poverty Level Status in Past Year",null,null,535976,"US-CO","Colorado","geoId/08"
"2021","Population Below Poverty Level Status in Past Year",null,null,351476,"US-CT","Connecticut","geoId/09"
"2021","Population Below Poverty Level Status in Past Year",null,null,109274,"US-DE","Delaware","geoId/10"
"2021","Population Below Poverty Level Status in Past Year",null,null,100618,"US-DC","District of Columbia","geoId/11"
"2021","Population Below Poverty Level Status in Past Year",null,null,2744612,"US-FL","Florida","geoId/12"
"2021","Population Below Poverty Level Status in Past Year",null,null,1441351,"US-GA","Georgia","geoId/13"
"2021","Population Below Poverty Level Status in Past Year",null,null,133740,"US-HI","Hawaii","geoId/15"
...
```

With per-capita calculation

```ts
const response = await client.getCsv({
  variables: ["Count_Person_BelowPovertyLevelInThePast12Months"],
  parentEntity: "country/USA",
  childType: "State",
  perCapitaVariables: ["Count_Person_BelowPovertyLevelInThePast12Months"],
});
```

```
"Count_Person_BelowPovertyLevelInThePast12Months.date","Count_Person_BelowPovertyLevelInThePast12Months.name","Count_Person_BelowPovertyLevelInThePast12Months.perCapita.date","Count_Person_BelowPovertyLevelInThePast12Months.perCapita.populationValue","Count_Person_BelowPovertyLevelInThePast12Months.perCapita.populationVariable","Count_Person_BelowPovertyLevelInThePast12Months.perCapita.value","Count_Person_BelowPovertyLevelInThePast12Months.unit","Count_Person_BelowPovertyLevelInThePast12Months.unitDisplayName","Count_Person_BelowPovertyLevelInThePast12Months.value","entity.isoCode","entity.name","entity.dcid"
"2021","Population Below Poverty Level Status in Past Year","2021",5039877,"Count_Person",0.15274559279918934,null,null,769819,"US-AL","Alabama","geoId/01"
"2021","Population Below Poverty Level Status in Past Year","2021",732673,"Count_Person",0.10238674006002678,null,null,75016,"US-AK","Alaska","geoId/02"
"2021","Population Below Poverty Level Status in Past Year","2021",7276316,"Count_Person",0.128486860658608,null,null,934911,"US-AZ","Arizona","geoId/04"
"2021","Population Below Poverty Level Status in Past Year","2021",3025891,"Count_Person",0.15470253224587402,null,null,468113,"US-AR","Arkansas","geoId/05"
"2021","Population Below Poverty Level Status in Past Year","2021",39237836,"Count_Person",0.12083171457263851,null,null,4741175,"US-CA","California","geoId/06"
"2021","Population Below Poverty Level Status in Past Year","2021",5812069,"Count_Person",0.09221776272786851,null,null,535976,"US-CO","Colorado","geoId/08"
"2021","Population Below Poverty Level Status in Past Year","2021",3605597,"Count_Person",0.09748066686321294,null,null,351476,"US-CT","Connecticut","geoId/09"
"2021","Population Below Poverty Level Status in Past Year","2021",1003384,"Count_Person",0.10890546391012812,null,null,109274,"US-DE","Delaware","geoId/10"
"2021","Population Below Poverty Level Status in Past Year","2021",670050,"Count_Person",0.1501649130661891,null,null,100618,"US-DC","District of Columbia","geoId/11"
"2021","Population Below Poverty Level Status in Past Year","2021",21781128,"Count_Person",0.12600871727120835,null,null,2744612,"US-FL","Florida","geoId/12"
"2021","Population Below Poverty Level Status in Past Year","2021",10799566,"Count_Person",0.13346378919301016,null,null,1441351,"US-GA","Georgia","geoId/13"
"2021","Population Below Poverty Level Status in Past Year","2021",1441553,"Count_Person",0.09277494479911595,null,null,133740,"US-HI","Hawaii","geoId/15"
...
```

### Get JSON data ("Data Rows")

Get population per-capita below the poverty level for each US State

```ts
const response = await client.getDataRows({
  variables: ["Count_Person_BelowPovertyLevelInThePast12Months"],
  parentEntity: "country/USA",
  childType: "State",
  perCapitaVariables: ["Count_Person_BelowPovertyLevelInThePast12Months"],
});
```

```json
[
  {
    "entity.dcid": "geoId/01",
    "entity.name": "Alabama",
    "entity.isoCode": "US-AL",
    "Count_Person_BelowPovertyLevelInThePast12Months.value": 769819,
    "Count_Person_BelowPovertyLevelInThePast12Months.date": "2021",
    "Count_Person_BelowPovertyLevelInThePast12Months.unit": null,
    "Count_Person_BelowPovertyLevelInThePast12Months.unitDisplayName": null,
    "Count_Person_BelowPovertyLevelInThePast12Months.name": "Population Below Poverty Level Status in Past Year"
  },
  {
    "entity.dcid": "geoId/02",
    "entity.name": "Alaska",
    "entity.isoCode": "US-AK",
    "Count_Person_BelowPovertyLevelInThePast12Months.value": 75016,
    "Count_Person_BelowPovertyLevelInThePast12Months.date": "2021",
    "Count_Person_BelowPovertyLevelInThePast12Months.unit": null,
    "Count_Person_BelowPovertyLevelInThePast12Months.unitDisplayName": null,
    "Count_Person_BelowPovertyLevelInThePast12Months.name": "Population Below Poverty Level Status in Past Year"
  },
  {
    "entity.dcid": "geoId/04",
    "entity.name": "Arizona",
    "entity.isoCode": "US-AZ",
    "Count_Person_BelowPovertyLevelInThePast12Months.value": 934911,
    "Count_Person_BelowPovertyLevelInThePast12Months.date": "2021",
    "Count_Person_BelowPovertyLevelInThePast12Months.unit": null,
    "Count_Person_BelowPovertyLevelInThePast12Months.unitDisplayName": null,
    "Count_Person_BelowPovertyLevelInThePast12Months.name": "Population Below Poverty Level Status in Past Year"
  },
  ...
]
```

### Get GeoJSON data

Get GeoJSON for US States with population data

```ts
const response = await client.getGeoJSON({
  variables: ["Count_Person"],
  parentEntity: "country/USA",
  childType: "State",
});
```

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "entity.dcid": "geoId/01",
        "entity.name": "Alabama",
        "entity.isoCode": "US-AL",
        "Count_Person.value": 5074296,
        "Count_Person.date": "2022",
        "Count_Person.unit": null,
        "Count_Person.unitDisplayName": null,
        "Count_Person.name": "Total Population"
      },
      "geometry": {
        "type": "MultiPolygon",
        "coordinates": [
          [
            [
              [
                -88.327302,
                30.229882
              ],
              ...
            ]
          ],
          ...
        ]
      }
    },
    ...
  ]
}
```

## License

[Apache 2.0](./LICENSE)

## Support

For general questions or issues, please open an issue on our
[issues](https://github.com/datacommonsorg/website/issues) page. For all other
questions, please send an email to `support@datacommons.org`.
