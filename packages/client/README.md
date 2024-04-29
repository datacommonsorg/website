# Data Commons JavaScript Client

JavaScript client for fetching Data Commons data as CSV, JSON, or GeoJSON.

## References

- [datacommons.org](https://datacommons.org)
- [Data Commons Documentation](https://docs.datacommons.org)
- [Data Commons Statistical Variable Explorer](https://datacommons.org/tools/statvar)
- [Data Commons Statistical Place Explorer](https://datacommons.org/place)
- [Data Commons Statistical Knowledge Graph](https://datacommons.org/browser)

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
3. Use the [Data Commons Knowledge Graph](https://datacommons.org/browser) to understand the relationship between entities.

### Data Requests

`@datacommonsorg/client`'s `DataCommonsClient` request parameters:

| Parameter           | Type     | Description                                                                                                                                                                                                             |
| ------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| entities            | string[] | Entity DCIDs. Required if `parentEntity` and `childType` are empty. Example: `["country/USA", "country/IND"]`                                                                                                           |
| parentEntity        | string   | Parent entity DCID. Required if `entities` is empty.                                                                                                                                                                    |
| childType           | string   | Child entity type. Required if `entities` is empty. Example: `"State"`                                                                                                                                                  |
| date?               | string   | \[optional\] [getDataRow, getCsv, and getGeoJSON only] Only return observations from exactly this date. Example: `"2023"` would return return observations from `2023` but not `2022`, `2024` or dates like `2023-06-1` |
| startDate?          | string   | \[optional\] [getDataRowSeries and getCsvSeries only] Only return observations equal to or after this date. Example: `"2015"`                                                                                           |
| endDate?            | string   | \[optional\] [getDataRowSeries and getCsvSeries only] Only return observations equal to or before this date. Example: `"2020"`                                                                                          |
| entityProps?        | string[] | \[optional\] Fetch these entity properties from the knowledge graph. Default: `["name", "isoCode"]`                                                                                                                     |
| variableProps?      | string[] | \[optional\] Fetch these variable properties from the knowledge graph. Default: `["name"]`                                                                                                                              |
| perCapitaVariables? | string[] | \[optional\] Performs per-capita caluclation for all of these variables Must be a subset of `variables` param.                                                                                                          |
| geoJsonProperty?    | string   | \[optional\] [getGeoJSON only] GeoJSON property name in the knowledge graph. Inferred if not provided.                                                                                                                  |
| rewind?             | boolean  | \[optional\] [getGeoJSON only] If true, returns "rewound" geometries that are opposite of the right-hand rule. Default: `true`.                                                                                         |
| fieldDelimiter?     | string   | \[optional\] Delimiter for column header fields. Example, if fieldDelimiter = ".", entity value header will be "entity.value". Default: `.`.                                                                            |

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

`@datacommonsorg/client` can fetch data as CSV, JSON, or GeoJSON.

### `DataCommonsClient` data fetch methods

`DataCommonsClient` fetches either single data observations (`getCsv`, `getDataRows`, `getGeoJson`) or all data observations (`getCsvSeries`, `getDataRowSeries`) about a set of variables and places.

| Method                     | Output                                                                                       | Description                                                                                                                                                                                                                |
| -------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| getCsv                     | `string`                                                                                     | CSV string with most recent data observations for the specified entities and variables. Each result row describes a single entity and single variable observation.                                                         |
| getCsvGroupedByEntity      | `string`                                                                                     | CSV string with the most recent data observations for the specified entities and variables. Results are grouped by entity, with a single entity and all requested variable observations for that entity on a single row.   |
| getCsvSeries               | `string`                                                                                     | CSV string with all data observations for the specified entities and variables                                                                                                                                             |
| getDataRows                | [DataRow\[\]](src/data_commons_client_types.ts)                                              | Data row objects with most recent data observations for the specified entities and variables. Each result row describes a single entity and single variable observation.                                                   |
| getDataRowsGroupedByEntity | [EntityGroupedDataRow\[\]](src/data_commons_client_types.ts)                                 | Data row objects with most recent data observations for the specified entities and variables. Results are grouped by entity, with a single entity and all requested variable observations for that entity on a single row. |
| getDataRowSeries           | `Record<string, string \| number \| boolean \| null>[]`                                      | Data row objects with all data observations for the specified entities and variables                                                                                                                                       |
| getGeoJson                 | Promise<[FeatureCollection](https://www.jsdocs.io/package/@types/geojson#FeatureCollection)> | GeoJSON feature collection with place geometries and most recent data observations for the specified entities and variables                                                                                                |

### Get CSV data (most recent observations)

Fetch total population below the poverty level for each US State

```ts
const response = await client.getCsv({
  variables: ["Count_Person_BelowPovertyLevelInThePast12Months"],
  parentEntity: "country/USA",
  childType: "State",
});
```

```text
"entity.dcid","entity.properties.isoCode","entity.properties.name","variable.dcid","variable.observation.date","variable.observation.value","variable.properties.name"
"geoId/01","US-AL","Alabama","Count_Person_BelowPovertyLevelInThePast12Months","2022",768897,"Population Below Poverty Level Status in Past Year"
"geoId/02","US-AK","Alaska","Count_Person_BelowPovertyLevelInThePast12Months","2022",75227,"Population Below Poverty Level Status in Past Year"
"geoId/04","US-AZ","Arizona","Count_Person_BelowPovertyLevelInThePast12Months","2022",916876,"Population Below Poverty Level Status in Past Year"
"geoId/05","US-AR","Arkansas","Count_Person_BelowPovertyLevelInThePast12Months","2022",475729,"Population Below Poverty Level Status in Past Year"
"geoId/06","US-CA","California","Count_Person_BelowPovertyLevelInThePast12Months","2022",4685272,"Population Below Poverty Level Status in Past Year"
"geoId/08","US-CO","Colorado","Count_Person_BelowPovertyLevelInThePast12Months","2022",540105,"Population Below Poverty Level Status in Past Year"
"geoId/09","US-CT","Connecticut","Count_Person_BelowPovertyLevelInThePast12Months","2022",355692,"Population Below Poverty Level Status in Past Year"
"geoId/10","US-DE","Delaware","Count_Person_BelowPovertyLevelInThePast12Months","2022",107790,"Population Below Poverty Level Status in Past Year"
"geoId/11","US-DC","District of Columbia","Count_Person_BelowPovertyLevelInThePast12Months","2022",98039,"Population Below Poverty Level Status in Past Year"
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
"entity.dcid","entity.properties.isoCode","entity.properties.name","variable.dcid","variable.perCapita.dcid","variable.perCapita.observation.date","variable.perCapita.observation.value","variable.perCapita.properties.name","variable.perCapita.perCapitaValue","variable.observation.date","variable.observation.value","variable.properties.name"
"geoId/01","US-AL","Alabama","Count_Person_BelowPovertyLevelInThePast12Months","Count_Person","2022",5074296,"Total Population",0.15152781784901787,"2022",768897,"Population Below Poverty Level Status in Past Year"
"geoId/02","US-AK","Alaska","Count_Person_BelowPovertyLevelInThePast12Months","Count_Person","2022",733583,"Total Population",0.10254736001243213,"2022",75227,"Population Below Poverty Level Status in Past Year"
"geoId/04","US-AZ","Arizona","Count_Person_BelowPovertyLevelInThePast12Months","Count_Person","2022",7359197,"Total Population",0.12458913655932842,"2022",916876,"Population Below Poverty Level Status in Past Year"
"geoId/05","US-AR","Arkansas","Count_Person_BelowPovertyLevelInThePast12Months","Count_Person","2022",3045637,"Total Population",0.15620016436627215,"2022",475729,"Population Below Poverty Level Status in Past Year"
"geoId/06","US-CA","California","Count_Person_BelowPovertyLevelInThePast12Months","Count_Person","2022",39029342,"Total Population",0.12004486265743347,"2022",4685272,"Population Below Poverty Level Status in Past Year"
"geoId/08","US-CO","Colorado","Count_Person_BelowPovertyLevelInThePast12Months","Count_Person","2022",5839926,"Total Population",0.09248490477447831,"2022",540105,"Population Below Poverty Level Status in Past Year"
"geoId/09","US-CT","Connecticut","Count_Person_BelowPovertyLevelInThePast12Months","Count_Person","2022",3626205,"Total Population",0.09808932478996638,"2022",355692,"Population Below Poverty Level Status in Past Year"
"geoId/10","US-DE","Delaware","Count_Person_BelowPovertyLevelInThePast12Months","Count_Person","2022",1018396,"Total Population",0.10584291375849866,"2022",107790,"Population Below Poverty Level Status in Past Year"
"geoId/11","US-DC","District of Columbia","Count_Person_BelowPovertyLevelInThePast12Months","Count_Person","2022",671803,"Total Population",0.14593415033871537,"2022",98039,"Population Below Poverty Level Status in Past Year"
...
```

### Get CSV data grouped by entity

Combines all observations about an entity to a single row

```ts
const response = await client.getCsvGroupedByEntity({
  variables: [
    "Count_CriminalActivities_CombinedCrime",
    "Count_Person_BelowPovertyLevelInThePast12Months",
  ],
  entities: [
    "geoId/0644000", // Los Angeles
    "geoId/0667000", // San Francisco
    "geoId/0664000", // Sacramento
    "geoId/0666000", // San Diego
    "geoId/0627000", // Fresno
    "geoId/0668000", // San Jose
    "geoId/0653000", // Oakland
  ],
});
```

```text
"entity.dcid","entity.properties.name","variables.Count_CriminalActivities_CombinedCrime.dcid","variables.Count_CriminalActivities_CombinedCrime.observation.date","variables.Count_CriminalActivities_CombinedCrime.observation.value","variables.Count_CriminalActivities_CombinedCrime.properties.name","variables.Count_Person_BelowPovertyLevelInThePast12Months.dcid","variables.Count_Person_BelowPovertyLevelInThePast12Months.observation.date","variables.Count_Person_BelowPovertyLevelInThePast12Months.observation.value","variables.Count_Person_BelowPovertyLevelInThePast12Months.properties.name"
"geoId/0627000","Fresno","Count_CriminalActivities_CombinedCrime","2018",21004,"Criminal Activities","Count_Person_BelowPovertyLevelInThePast12Months","2022",117570,"Population Below Poverty Level Status in Past Year"
"geoId/0644000","Los Angeles","Count_CriminalActivities_CombinedCrime","2019",126776,"Criminal Activities","Count_Person_BelowPovertyLevelInThePast12Months","2022",633702,"Population Below Poverty Level Status in Past Year"
"geoId/0653000","Oakland","Count_CriminalActivities_CombinedCrime","2019",33595,"Criminal Activities","Count_Person_BelowPovertyLevelInThePast12Months","2022",57247,"Population Below Poverty Level Status in Past Year"
"geoId/0664000","Sacramento","Count_CriminalActivities_CombinedCrime","2019",19756,"Criminal Activities","Count_Person_BelowPovertyLevelInThePast12Months","2022",76325,"Population Below Poverty Level Status in Past Year"
"geoId/0666000","San Diego","Count_CriminalActivities_CombinedCrime","2019",32478,"Criminal Activities","Count_Person_BelowPovertyLevelInThePast12Months","2022",152819,"Population Below Poverty Level Status in Past Year"
"geoId/0667000","San Francisco","Count_CriminalActivities_CombinedCrime","2019",54988,"Criminal Activities","Count_Person_BelowPovertyLevelInThePast12Months","2022",87849,"Population Below Poverty Level Status in Past Year"
"geoId/0668000","San Jose","Count_CriminalActivities_CombinedCrime","2019",29858,"Criminal Activities","Count_Person_BelowPovertyLevelInThePast12Months","2022",78699,"Population Below Poverty Level Status in Past Year"
```

### Get CSV data (all observations)

Fetch combined criminal activity for California cities

```ts
const response = await client.getCsvSeries({
  variables: ["Count_CriminalActivities_CombinedCrime"],
  entities: [
    "geoId/0644000", // Los Angeles
    "geoId/0667000", // San Francisco
    "geoId/0664000", // Sacramento
    "geoId/0666000", // San Diego
    "geoId/0627000", // Fresno
    "geoId/0668000", // San Jose
    "geoId/0653000", // Oakland
  ],
  perCapitaVariables: ["Count_CriminalActivities_CombinedCrime"],
});
```

```text
"entity.dcid","entity.properties.name","variable.dcid","variable.perCapita.dcid","variable.perCapita.observation.date","variable.perCapita.observation.value","variable.perCapita.properties.name","variable.perCapita.perCapitaValue","variable.observation.date","variable.observation.value","variable.properties.name"
"geoId/0627000","Fresno","Count_CriminalActivities_CombinedCrime","Count_Person","2022",545567,"Total Population",0.04593752921272731,"2008",25062,"Criminal Activities"
"geoId/0627000","Fresno","Count_CriminalActivities_CombinedCrime","Count_Person","2022",545567,"Total Population",0.044207219278292124,"2009",24118,"Criminal Activities"
"geoId/0627000","Fresno","Count_CriminalActivities_CombinedCrime","Count_Person","2022",545567,"Total Population",0.05066472128996072,"2010",27641,"Criminal Activities"
"geoId/0627000","Fresno","Count_CriminalActivities_CombinedCrime","Count_Person","2022",545567,"Total Population",0.05218790725978661,"2011",28472,"Criminal Activities"
"geoId/0627000","Fresno","Count_CriminalActivities_CombinedCrime","Count_Person","2022",545567,"Total Population",0.05245735170932259,"2012",28619,"Criminal Activities"
"geoId/0627000","Fresno","Count_CriminalActivities_CombinedCrime","Count_Person","2022",545567,"Total Population",0.04641043171599455,"2013",25320,"Criminal Activities"
"geoId/0627000","Fresno","Count_CriminalActivities_CombinedCrime","Count_Person","2022",545567,"Total Population",0.04351802803322048,"2014",23742,"Criminal Activities"
"geoId/0627000","Fresno","Count_CriminalActivities_CombinedCrime","Count_Person","2022",545567,"Total Population",0.0453326539178506,"2015",24732,"Criminal Activities"
"geoId/0627000","Fresno","Count_CriminalActivities_CombinedCrime","Count_Person","2022",545567,"Total Population",0.0439707680266585,"2016",23989,"Criminal Activities"
"geoId/0627000","Fresno","Count_CriminalActivities_CombinedCrime","Count_Person","2022",545567,"Total Population",0.04291131978290476,"2017",23411,"Criminal Activities"
"geoId/0627000","Fresno","Count_CriminalActivities_CombinedCrime","Count_Person","2022",545567,"Total Population",0.03849939604118284,"2018",21004,"Criminal Activities"
"geoId/0644000","Los Angeles","Count_CriminalActivities_CombinedCrime","Count_Person","2022",3822238,"Total Population",0.03383907543172351,"2008",129341,"Criminal Activities"
"geoId/0644000","Los Angeles","Count_CriminalActivities_CombinedCrime","Count_Person","2022",3822238,"Total Population",0.03136146937998105,"2009",119871,"Criminal Activities"
"geoId/0644000","Los Angeles","Count_CriminalActivities_CombinedCrime","Count_Person","2022",3822238,"Total Population",0.029440605216106374,"2010",112529,"Criminal Activities"
"geoId/0644000","Los Angeles","Count_CriminalActivities_CombinedCrime","Count_Person","2022",3822238,"Total Population",0.028190552236673907,"2011",107751,"Criminal Activities"
"geoId/0644000","Los Angeles","Count_CriminalActivities_CombinedCrime","Count_Person","2022",3822238,"Total Population",0.028069157388943337,"2012",107287,"Criminal Activities"
"geoId/0644000","Los Angeles","Count_CriminalActivities_CombinedCrime","Count_Person","2022",3822238,"Total Population",0.02715634138952101,"2013",103798,"Criminal Activities"
"geoId/0644000","Los Angeles","Count_CriminalActivities_CombinedCrime","Count_Person","2022",3822238,"Total Population",0.027064510373242062,"2014",103447,"Criminal Activities"
"geoId/0644000","Los Angeles","Count_CriminalActivities_CombinedCrime","Count_Person","2022",3822238,"Total Population",0.0313402776069936,"2015",119790,"Criminal Activities"
"geoId/0644000","Los Angeles","Count_CriminalActivities_CombinedCrime","Count_Person","2022",3822238,"Total Population",0.03380454069055878,"2016",129209,"Criminal Activities"
"geoId/0644000","Los Angeles","Count_CriminalActivities_CombinedCrime","Count_Person","2022",3822238,"Total Population",0.03493738485149277,"2017",133539,"Criminal Activities"
"geoId/0644000","Los Angeles","Count_CriminalActivities_CombinedCrime","Count_Person","2022",3822238,"Total Population",0.03480866445260604,"2018",133047,"Criminal Activities"
"geoId/0644000","Los Angeles","Count_CriminalActivities_CombinedCrime","Count_Person","2022",3822238,"Total Population",0.0331680026204543,"2019",126776,"Criminal Activities"
"geoId/0653000","Oakland","Count_CriminalActivities_CombinedCrime","Count_Person","2022",430553,"Total Population",0.06896247384178023,"2008",29692,"Criminal Activities"
...
```

### Get Data Rows (JSON, most recent observations)

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
    "entity": {
      "dcid": "geoId/01",
      "properties": {
        "name": "Alabama",
        "isoCode": "US-AL"
      }
    },
    "variable": {
      "dcid": "Count_Person_BelowPovertyLevelInThePast12Months",
      "properties": {
        "name": "Population Below Poverty Level Status in Past Year"
      },
      "observation": {
        "date": "2022",
        "value": 768897,
        "metadata": {
          "unit": null,
          "unitDisplayName": null
        }
      },
      "perCapita": {
        "dcid": "Count_Person",
        "properties": {
          "name": "Total Population"
        },
        "observation": {
          "date": "2022",
          "value": 5074296,
          "metadata": {}
        },
        "perCapitaValue": 0.15152781784901787
      }
    }
  },
  {
    "entity": {
      "dcid": "geoId/02",
      "properties": {
        "name": "Alaska",
        "isoCode": "US-AK"
      }
    },
    "variable": {
      "dcid": "Count_Person_BelowPovertyLevelInThePast12Months",
      "properties": {
        "name": "Population Below Poverty Level Status in Past Year"
      },
      "observation": {
        "date": "2022",
        "value": 75227,
        "metadata": {
          "unit": null,
          "unitDisplayName": null
        }
      },
      "perCapita": {
        "dcid": "Count_Person",
        "properties": {
          "name": "Total Population"
        },
        "observation": {
          "date": "2022",
          "value": 733583,
          "metadata": {}
        },
        "perCapitaValue": 0.10254736001243213
      }
    }
  },
  {
    "entity": {
      "dcid": "geoId/04",
      "properties": {
        "name": "Arizona",
        "isoCode": "US-AZ"
      }
    },
    "variable": {
      "dcid": "Count_Person_BelowPovertyLevelInThePast12Months",
      "properties": {
        "name": "Population Below Poverty Level Status in Past Year"
      },
      "observation": {
        "date": "2022",
        "value": 916876,
        "metadata": {
          "unit": null,
          "unitDisplayName": null
        }
      },
      "perCapita": {
        "dcid": "Count_Person",
        "properties": {
          "name": "Total Population"
        },
        "observation": {
          "date": "2022",
          "value": 7359197,
          "metadata": {}
        },
        "perCapitaValue": 0.12458913655932842
      }
    }
  },
  ...
]
```

### Get Data Rows grouped by entity

Combines all observations about an entity to a single row

```ts
const response = await client.getDataRowsGroupedByEntity({
  variables: [
    "Count_CriminalActivities_CombinedCrime",
    "Count_Person_BelowPovertyLevelInThePast12Months",
  ],
  entities: [
    "geoId/0644000", // Los Angeles
    "geoId/0667000", // San Francisco
    "geoId/0664000", // Sacramento
    "geoId/0666000", // San Diego
    "geoId/0627000", // Fresno
    "geoId/0668000", // San Jose
    "geoId/0653000", // Oakland
  ],
});
```

```json
[
  {
    "entity": {
      "dcid": "geoId/0627000",
      "properties": {
        "name": "Fresno",
        "isoCode": null
      }
    },
    "variables": {
      "Count_CriminalActivities_CombinedCrime": {
        "dcid": "Count_CriminalActivities_CombinedCrime",
        "properties": {
          "name": "Criminal Activities"
        },
        "observation": {
          "date": "2018",
          "value": 21004,
          "metadata": {
            "unit": null,
            "unitDisplayName": null
          }
        }
      },
      "Count_Person_BelowPovertyLevelInThePast12Months": {
        "dcid": "Count_Person_BelowPovertyLevelInThePast12Months",
        "properties": {
          "name": "Population Below Poverty Level Status in Past Year"
        },
        "observation": {
          "date": "2022",
          "value": 117570,
          "metadata": {
            "unit": null,
            "unitDisplayName": null
          }
        }
      }
    }
  },
  {
    "entity": {
      "dcid": "geoId/0644000",
      "properties": {
        "name": "Los Angeles",
        "isoCode": null
      }
    },
    "variables": {
      "Count_CriminalActivities_CombinedCrime": {
        "dcid": "Count_CriminalActivities_CombinedCrime",
        "properties": {
          "name": "Criminal Activities"
        },
        "observation": {
          "date": "2019",
          "value": 126776,
          "metadata": {
            "unit": null,
            "unitDisplayName": null
          }
        }
      },
      "Count_Person_BelowPovertyLevelInThePast12Months": {
        "dcid": "Count_Person_BelowPovertyLevelInThePast12Months",
        "properties": {
          "name": "Population Below Poverty Level Status in Past Year"
        },
        "observation": {
          "date": "2022",
          "value": 633702,
          "metadata": {
            "unit": null,
            "unitDisplayName": null
          }
        }
      }
    }
  },
  {
    "entity": {
      "dcid": "geoId/0653000",
      "properties": {
        "name": "Oakland",
        "isoCode": null
      }
    },
    "variables": {
      "Count_CriminalActivities_CombinedCrime": {
        "dcid": "Count_CriminalActivities_CombinedCrime",
        "properties": {
          "name": "Criminal Activities"
        },
        "observation": {
          "date": "2019",
          "value": 33595,
          "metadata": {
            "unit": null,
            "unitDisplayName": null
          }
        }
      },
      "Count_Person_BelowPovertyLevelInThePast12Months": {
        "dcid": "Count_Person_BelowPovertyLevelInThePast12Months",
        "properties": {
          "name": "Population Below Poverty Level Status in Past Year"
        },
        "observation": {
          "date": "2022",
          "value": 57247,
          "metadata": {
            "unit": null,
            "unitDisplayName": null
          }
        }
      }
    }
  },
  ...
]
```

### Get Data Rows (all observations)

Fetch combined criminal activity for California cities

```ts
const response = await client.getDataRowSeries({
  variables: [
    "Count_CriminalActivities_CombinedCrime",
    "Count_Person_BelowPovertyLevelInThePast12Months",
  ],
  entities: [
    "geoId/0644000", // Los Angeles
    "geoId/0667000", // San Francisco
    "geoId/0664000", // Sacramento
    "geoId/0666000", // San Diego
    "geoId/0627000", // Fresno
    "geoId/0668000", // San Jose
    "geoId/0653000", // Oakland
  ],
});
```

```json
[
  {
    "entity": {
      "dcid": "geoId/0627000",
      "properties": {
        "name": "Fresno",
        "isoCode": null
      }
    },
    "variable": {
      "dcid": "Count_CriminalActivities_CombinedCrime",
      "properties": {
        "name": "Criminal Activities"
      },
      "observation": {
        "date": "2008",
        "value": 25062,
        "metadata": {
          "unit": null,
          "unitDisplayName": null
        }
      }
    }
  },
  {
    "entity": {
      "dcid": "geoId/0627000",
      "properties": {
        "name": "Fresno",
        "isoCode": null
      }
    },
    "variable": {
      "dcid": "Count_CriminalActivities_CombinedCrime",
      "properties": {
        "name": "Criminal Activities"
      },
      "observation": {
        "date": "2009",
        "value": 24118,
        "metadata": {
          "unit": null,
          "unitDisplayName": null
        }
      }
    }
  },
  {
    "entity": {
      "dcid": "geoId/0627000",
      "properties": {
        "name": "Fresno",
        "isoCode": null
      }
    },
    "variable": {
      "dcid": "Count_CriminalActivities_CombinedCrime",
      "properties": {
        "name": "Criminal Activities"
      },
      "observation": {
        "date": "2010",
        "value": 27641,
        "metadata": {
          "unit": null,
          "unitDisplayName": null
        }
      }
    }
  },
  {
    "entity": {
      "dcid": "geoId/0627000",
      "properties": {
        "name": "Fresno",
        "isoCode": null
      }
    },
    "variable": {
      "dcid": "Count_CriminalActivities_CombinedCrime",
      "properties": {
        "name": "Criminal Activities"
      },
      "observation": {
        "date": "2011",
        "value": 28472,
        "metadata": {
          "unit": null,
          "unitDisplayName": null
        }
      }
    }
  },
  {
    "entity": {
      "dcid": "geoId/0627000",
      "properties": {
        "name": "Fresno",
        "isoCode": null
      }
    },
    "variable": {
      "dcid": "Count_CriminalActivities_CombinedCrime",
      "properties": {
        "name": "Criminal Activities"
      },
      "observation": {
        "date": "2012",
        "value": 28619,
        "metadata": {
          "unit": null,
          "unitDisplayName": null
        }
      }
    }
  },
  ...
]
```

### Get GeoJSON data (most recent observations)

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
        "entity.properties.name": "Alabama",
        "entity.properties.isoCode": "US-AL",
        "variables.Count_Person.dcid": "Count_Person",
        "variables.Count_Person.properties.name": "Total Population",
        "variables.Count_Person.observation.date": "2022",
        "variables.Count_Person.observation.value": 5074296
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
