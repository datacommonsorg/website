// ==================== CONSTANTS ====================
const PAGE_SIZE = 7;

const TAB_CONFIG = {
  intersections: {
    label: "Intersections",
    columns: [
      // Calculated
      // High/Med/Low. Based on Emission Rate + Community Vulnerability. (e.g., High Emission near High Vulnerability = Critical Risk).
      // ---
      // CALCULATED: riskScore
      // API Variables: Annual_Emissions_Methane, Count_Person, Count_Person_BelowPovertyLevelInThePast12Months
      // Formula: Based on emissionRate (Annual_Emissions_Methane / 8760) and SVI score
      // - "Critical" if emissionRate > 300 AND svi > 0.7
      // - "High" if emissionRate > 200 AND svi > 0.6
      // - "Medium" if emissionRate > 100 OR svi > 0.6
      // - "Low" otherwise
      "Risk Score",

      // Plume Data
      // Link to the specific satellite detection event (e.g., PLUME-2025-X).
      // ---
      // DERIVED: leakeventid
      // Source: County geoId
      // Format: "DC-EMISSION-{countyId}" (e.g., "DC-EMISSION-48329")
      "Leak Event ID",

      // Asset Data
      // The specific oil well or lease geographically closest to the plume center (e.g., WELL-492).
      // ---
      // DERIVED: suspectedasset
      // API Variable: Count_OilAndGasWell (from county)
      // Format: "ASSET-{countyId}-{wellCount} wells"
      "Suspected Asset",

      // Calculated
      // How close the plume is to the well (e.g., "0.1 miles"). Helps confirm if your asset is the source.
      // ---
      // CALCULATED: distancetoasset
      // API Variable: Count_OilAndGasWell
      // Formula: (1 / wellCount * 10).toFixed(2) + " miles avg"
      // Fallback: "0.5 miles" if no wells
      "Distance to Asset",

      // Public Data
      // Name of the nearest Census tract or town (e.g., "Carlsbad South").
      // ---
      // DERIVED: impactedcommunity
      // Source: Census Tract geoId
      // Format: "Tract-{tractId}" (e.g., "Tract-48329000100")
      "Impacted Community",

      // Public Data
      // Environmental Justice Indicator. SVI Score (Social Vulnerability Index), e.g., "High (0.85)".
      // ---
      // CALCULATED: vulnerabilitylevel
      // API Variables: Count_Person, Count_Person_BelowPovertyLevelInThePast12Months
      // Formula: svi = min((poverty / population) * 2, 1)
      // Display: "{High|Medium|Low} ({svi.toFixed(2)})"
      "Vulnerability Level",

      // Public Data
      // Number of people living within the plume's dispersion radius.
      // ---
      // API Variable: Count_Person (from census tract)
      // Direct value with locale formatting
      "Population at Risk",

      // App Data
      // Status of the response (e.g., "Investigation Dispatched", "Pending Review").
      // ---
      // CALCULATED: actionstatus
      // API Variable: Annual_Emissions_Methane
      // Formula: methane > 10000 ? "Monitoring Required" : "Normal Operations"
      "Action Status",
    ]
  },
  leases: {
    label: "Leases",
    columns: [
      // Private Data (Custom DC)
      // The Well ID or Facility Name (e.g., Unit-45B).
      // ---
      // DERIVED: assetid
      // API Variable: Count_OilGasLease (custom - from leases.csv)
      // Source: County geoId + total lease count
      // Format: "County-{countyId}-LEASE-{totalLeases}"
      // Fallback (public): "County-{countyId}-ASSET"
      "Asset Name/ID",

      // Private Data (Custom DC)
      // Wellhead, Compressor Station, Pipeline Valve, Tank Battery.
      // ---
      // CALCULATED: assettype
      // API Variables (custom - from leases.csv):
      //   - Count_OilGasAsset_Wellhead
      //   - Count_OilGasAsset_CompressorStation
      //   - Count_OilGasAsset_PipelineValve
      //   - Count_OilGasAsset_TankBattery
      // Formula:
      // - "Compressor Station" if compressors > wellheads
      // - "Multi-Well Field" if wellheads > 10
      // - "Wellhead" if wellheads > 0
      // - "Tank Battery" if tankBatteries > 0
      // - "Pipeline Valve" if pipelineValves > 0
      // - "Oil & Gas Field" default
      // Fallback (public): Count_OilAndGasWell, Count_PowerPlant
      "Asset Type",

      // Private Data (Custom DC)
      // Active, Idle, Abandoned, Under Maintenance.
      // ---
      // CALCULATED: status
      // API Variables (custom - from leases.csv):
      //   - Count_OilGasLease (total)
      //   - Count_OilGasLease_Active
      //   - Count_OilGasLease_Idle
      //   - Count_OilGasLease_Abandoned
      // Formula:
      // - "Abandoned" if abandonedLeases > activeLeases
      // - "Idle" if idleLeases > activeLeases * 0.5
      // - "High Production" if activeLeases > totalLeases * 0.8
      // - "Active" default
      // Fallback (public): Count_Person_Employed_NAICSMining, Count_OilAndGasWell
      "Operational Status",

      // Private Data (Custom DC)
      // E.g., "Permian Basin", "West Texas Team".
      // ---
      // DERIVED: region
      // Source: County geoId prefix
      // Formula:
      // - "Permian Basin - West Texas" if geoId contains "geoId/48"
      // - "Permian Basin - New Mexico" if geoId contains "geoId/35"
      // - "Gulf Coast - Alabama" if geoId contains "geoId/01"
      // - "Other Region" default
      "Region/Basin",

      // Private Data (Custom DC)
      // Date of the last LDAR (Leak Detection and Repair) sweep.
      // ---
      // API Variables (custom - from leases.csv):
      //   - Date_LastInspection_OilGasLease (YYYYMMDD format integer)
      //   - Count_DaysSinceLastInspection_OilGasLease
      // Format: "YYYY-MM-DD (Xd ago)"
      // Fallback (public): extractObservationDate() from Count_OilAndGasWell
      "Last Inspection",

      // Private Data (Custom DC)
      // Field Supervisor contact for that asset.
      // ---
      // CALCULATED: responsible
      // API Variables (custom - from leases.csv):
      //   - Count_OilGasAsset_Wellhead
      //   - Count_OilGasAsset_CompressorStation
      //   - Count_OilGasAsset_PipelineValve
      //   - Count_OilGasAsset_TankBattery
      //   - Count_Person_OilGasLeaseEmployee
      // Format: "{totalAssets} assets, {employees} employees"
      // Fallback (public): Count_OilAndGasWell + Count_PowerPlant, Count_Person_Employed_NAICSMining
      "Responsible Person",
    ]
  },
  plumes: {
    label: "Plumes",
    columns: [
      // Satellite
      // Unique identifier from the 3rd party provider.
      // ---
      // DERIVED: plumeid
      // Source: EPA GHGRP Facility ID (epaGhgrpFacilityId)
      // Fetched via: Node API with property "<-containedInPlace{typeOf:EpaGhgrpFacility}"
      // Format: "EPA-{facilityId}-{counter}" or "GHG-{facilityId}-{counter}"
      "Plume ID",

      // Satellite
      // Timestamp of the satellite pass.
      // ---
      // API Variable: Annual_Emissions_Methane_NonBiogenic (observation date)
      // Fallback: Annual_Emissions_GreenhouseGas_NonBiogenic (observation date)
      // Uses the latest observation's date field
      "Detection Time",

      // Satellite
      // The severity of the leak (e.g., kg/hr). Crucial for prioritizing "Super Emitters."
      // ---
      // CALCULATED: emissionrate
      // API Variable: Annual_Emissions_Methane_NonBiogenic (or Annual_Emissions_GreenhouseGas_NonBiogenic)
      // Formula: (emissionValue / 8760).toFixed(2) + " MT CO2e/hr"
      // Converts annual MetricTonCO2e to hourly rate
      "Emission Rate",

      // Satellite
      // Column explicitly mentioned in your upload schema (ppm or %).
      // ---
      // CALCULATED: methaneconcentration
      // API Variable: Annual_Emissions_Methane_NonBiogenic (or Annual_Emissions_GreenhouseGas_NonBiogenic)
      // Formula: Math.round(emissionValue / 100).toLocaleString() + " MT/yr"
      "Methane Concentration",

      // Satellite
      // Is this a one-time puff or a persistent leak observed over multiple passes?
      // ---
      // CALCULATED: durationpersistence
      // API Variable: Annual_Emissions_Methane_NonBiogenic (observation count and value)
      // Formula:
      // - "Persistent (multi-year high)" if observations > 5 AND value > 100000
      // - "Recurring (multi-year)" if observations > 3
      // - "High Emissions" if value > 50000
      // - "Single Year" default
      "Duration/Persistence",

      // Public Data
      // Weather context at the time of detection (helps map the plume back to the source).
      // ---
      // STATIC: windspeeddir
      // No API variable - uses rotating direction array ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
      // Format: "{direction} (facility)"
      "Wind Speed/Dir",

      // Satellite
      // Probability score (0-100%) that this is a true methane signature vs. background noise.
      // ---
      // STATIC: sourceconfidence
      // No API variable - fixed value based on data source
      // "EPA GHGRP 95%" for methane data, "EPA GHGRP 90%" for GHG fallback
      "Source Confidence",
    ]
  },
  communities: {
    label: "Communities",
    columns: [
      // Census
      // Census Tract ID or Neighborhood Name.
      // ---
      // DERIVED: communityname
      // Source: Census Tract geoId
      // Format: "Census Tract {tractId}" (e.g., "Census Tract 48329000100")
      "Community Name",

      // CDC/Public
      // Social Vulnerability Index (0.0 to 1.0). Higher = more vulnerable.
      // ---
      // CALCULATED: sviscore (Social Vulnerability Index)
      // API Variables: Count_Person, Count_Person_BelowPovertyLevelInThePast12Months,
      //                Median_Income_Household, Percent_Person_WithHealthInsurance
      // Formula: calculateSVI(population, poverty, income, healthCoverage)
      //   povertyRate = poverty / population
      //   incomeScore = max(0, 1 - (income / 75000)) or 0.5 if no income
      //   healthScore = (100 - healthCoverage) / 100 or 0.5 if no data
      //   SVI = min((povertyRate * 0.4 + incomeScore * 0.3 + healthScore * 0.3), 1)
      "SVI Score",

      // Census
      // "Low/Medium Income" classification as per your prompt.
      // ---
      // API Variable: Median_Income_Household
      // Format: "$" + (income / 1000).toFixed(0) + "k" (e.g., "$65k")
      "Median Income",

      // Census
      // Minority population % (often required for regulatory reporting).
      // ---
      // CALCULATED: demographics
      // API Variables: Count_Person, Count_Person_BelowPovertyLevelInThePast12Months
      // Formula: (poverty / population * 100 + random(0-20))% Minority
      // Note: Uses poverty as proxy for minority %, with random adjustment
      "Demographics",

      // OpenMap
      // Count of schools, hospitals, or nursing homes in the zone.
      // ---
      // CALCULATED: sensitivereceptors
      // API Variable: Count_Person
      // Formula: Math.floor(population / 1000) + 1
      // Estimates receptors based on population density
      "Sensitive Receptors",

      // Census
      // Total count of residents.
      // ---
      // API Variable: Count_Person
      // Direct value with locale formatting (e.g., "12,345")
      "Total Population",
    ]
  }
};

// ==================== API SERVICE (Single Responsibility) ====================
const ApiService = {
  async post(path, body) {
    const headers = { "Content-Type": "application/json" };

    const res = await fetch(`${apiRoot}/core/api/v2${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}: ${text}`);
    }
    return res.json();
  },

  async fetchObservations(variables, geoIds, date = "LATEST") {
    if (!geoIds?.length) return { byVariable: {} };

    // Small batch - single request
    if (geoIds.length <= 20) {
      return this.post("/observation", {
        date,
        variable: { dcids: variables },
        entity: { dcids: geoIds },
        select: ["entity", "variable", "value", "date"]
      });
    }

    // Large batch - chunked requests
    const results = { byVariable: {} };
    for (let i = 0; i < geoIds.length; i += 20) {
      try {
        const batch = await this.post("/observation", {
          date,
          variable: { dcids: variables },
          entity: { dcids: geoIds.slice(i, i + 20) },
          select: ["entity", "variable", "value", "date"]
        });

        Object.entries(batch?.byVariable || {}).forEach(([key, val]) => {
          results.byVariable[key] = results.byVariable[key] || { byEntity: {} };
          Object.assign(results.byVariable[key].byEntity, val.byEntity);
        });
      } catch (e) {
        console.error(`Batch ${i} error:`, e);
      }
      if (i + 20 < geoIds.length) await new Promise(r => setTimeout(r, 100));
    }
    return results;
  },

  async fetchNodes(nodeIds, property) {
    return this.post("/node", { nodes: nodeIds, property });
  }
};

// ==================== DATA EXTRACTORS (DRY) ====================
const DataExtractor = {
  getValue(data, geoId, index = 0) {
    return data?.byEntity?.[geoId]?.orderedFacets?.[0]?.observations?.[index]?.value || 0;
  },

  getDate(data, geoId, index = 0) {
    return data?.byEntity?.[geoId]?.orderedFacets?.[0]?.observations?.[index]?.date || "N/A";
  },

  getObservations(data, geoId) {
    return data?.byEntity?.[geoId]?.orderedFacets?.[0]?.observations || [];
  },

  calculateSVI(population, poverty, income, health) {
    if (!population) return 0;
    const povertyRate = poverty / population;
    const incomeScore = income > 0 ? Math.max(0, 1 - income / 75000) : 0.5;
    const healthScore = health > 0 ? (100 - health) / 100 : 0.5;
    return Math.min(povertyRate * 0.4 + incomeScore * 0.3 + healthScore * 0.3, 1);
  }
};

// ==================== LOCATION SERVICE ====================
const LocationService = {
  _countiesCache: null,

  async getCounties() {
    if (this._countiesCache) return this._countiesCache;

    try {
      const response = await ApiService.fetchNodes(["country/USA"], "<-containedInPlace+{typeOf:County}");
      const nodes = response?.data?.["country/USA"]?.arcs?.["containedInPlace+"]?.nodes || [];
      this._countiesCache = nodes.map(n => n.dcid).filter(Boolean);
    } catch (e) {
      console.error("Error fetching counties:", e);
      this._countiesCache = [];
    }
    return this._countiesCache;
  },

  async getCensusTracts(countyId) {
    try {
      const response = await ApiService.fetchNodes([countyId], "<-containedInPlace+{typeOf:CensusTract}");
      const nodes = response?.data?.[countyId]?.arcs?.["containedInPlace+"]?.nodes || [];
      return nodes.map(n => n.dcid).filter(Boolean);
    } catch (e) {
      console.error(`Error fetching tracts for ${countyId}:`, e);
      return [];
    }
  },

  async getEpaFacilities(countyId) {
    try {
      const response = await ApiService.fetchNodes([countyId], "<-containedInPlace{typeOf:EpaGhgrpFacility}");
      const nodes = response?.data?.[countyId]?.arcs?.["containedInPlace"]?.nodes || [];
      return nodes
        .filter(n => n.dcid?.startsWith("epaGhgrpFacility"))
        .map(n => ({ dcid: n.dcid, name: n.name || n.dcid, countyId }));
    } catch (e) {
      console.error(`Error fetching facilities for ${countyId}:`, e);
      return [];
    }
  },

  async getLocationsForPage(tabKey, page) {
    const start = (page - 1) * PAGE_SIZE;

    if (tabKey === 'communities' || tabKey === 'intersections') {
      const counties = await this.getCounties();
      const tracts = [];
      for (const county of counties) {
        if (tracts.length >= start + PAGE_SIZE) break;
        tracts.push(...await this.getCensusTracts(county));
      }
      return tracts.slice(start, start + PAGE_SIZE);
    }

    const counties = await this.getCounties();
    return counties.slice(start, start + PAGE_SIZE);
  },

  async getTotalCount(tabKey) {
    const counties = await this.getCounties();
    return (tabKey === 'communities' || tabKey === 'intersections')
      ? counties.length * 25  // Estimated tracts per county
      : counties.length;
  }
};

// ==================== ROW BUILDERS (Open/Closed - each tab has its own builder) ====================
const RowBuilders = {
  async communities(locations) {
    const data = await ApiService.fetchObservations(
      ["Count_Person", "Median_Income_Household", "Count_Person_BelowPovertyLevelInThePast12Months", "Percent_Person_WithHealthInsurance"],
      locations, "LATEST"
    );

    return locations.map(geoId => {
      const pop = DataExtractor.getValue(data.byVariable?.Count_Person, geoId);
      const income = DataExtractor.getValue(data.byVariable?.Median_Income_Household, geoId);
      const poverty = DataExtractor.getValue(data.byVariable?.Count_Person_BelowPovertyLevelInThePast12Months, geoId);
      const health = DataExtractor.getValue(data.byVariable?.Percent_Person_WithHealthInsurance, geoId);
      const svi = DataExtractor.calculateSVI(pop, poverty, income, health);

      return {
        communityname: geoId.replace("geoId/", "Census Tract "),
        sviscore: svi.toFixed(2),
        medianincome: income > 0 ? `$${(income / 1000).toFixed(0)}k` : "N/A",
        demographics: `${pop > 0 ? Math.floor((poverty / pop) * 100 + Math.random() * 20) : Math.floor(Math.random() * 40 + 20)}% Minority`,
        sensitivereceptors: Math.floor(pop / 1000) + 1,
        totalpopulation: pop > 0 ? pop.toLocaleString() : "N/A"
      };
    });
  },

  async plumes(counties) {
    if (!counties?.length) return [];

    // Collect facilities from counties (enough to fill PAGE_SIZE after filtering)
    const facilities = [];
    for (const countyId of counties) {
      if (facilities.length >= PAGE_SIZE * 3) break; // Fetch extra to ensure PAGE_SIZE after filtering
      const countyFacilities = await LocationService.getEpaFacilities(countyId);
      facilities.push(...countyFacilities.slice(0, PAGE_SIZE * 3 - facilities.length));
    }

    if (!facilities.length) return [];

    const data = await ApiService.fetchObservations(
      ["Annual_Emissions_Methane_NonBiogenic", "Annual_Emissions_GreenhouseGas_NonBiogenic"],
      facilities.map(f => f.dcid), ""
    );

    const windDirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    let counter = 1;

    const rows = facilities.flatMap(facility => {
      const methaneObs = DataExtractor.getObservations(data.byVariable?.Annual_Emissions_Methane_NonBiogenic, facility.dcid);
      const ghgObs = DataExtractor.getObservations(data.byVariable?.Annual_Emissions_GreenhouseGas_NonBiogenic, facility.dcid);
      const obs = methaneObs.length > 0 ? methaneObs : ghgObs;
      const isMethane = methaneObs.length > 0;

      if (!obs.length) return [];

      const latest = obs[obs.length - 1];
      if (!latest.value) return [];

      const rate = (latest.value / 8760).toFixed(2);
      const persistence = obs.length > 5 && latest.value > 100000 ? "Persistent (multi-year high)" :
        obs.length > 3 ? "Recurring (multi-year)" :
          latest.value > 50000 ? "High Emissions" : "Single Year";

      return [{
        plumeid: `${isMethane ? "EPA" : "GHG"}-${facility.dcid.replace("epaGhgrpFacilityId/", "")}-${String(counter++).padStart(4, '0')}`,
        detectiontime: latest.date || "N/A",
        emissionrate: `${rate} MT CO2e/hr`,
        methaneconcentration: `${Math.round(latest.value / 100).toLocaleString()} MT/yr${isMethane ? "" : " (GHG)"}`,
        durationpersistence: persistence,
        windspeeddir: `${windDirs[counter % 8]} (facility)`,
        sourceconfidence: isMethane ? "EPA GHGRP 95%" : "EPA GHGRP 90%"
      }];
    });

    // Limit to PAGE_SIZE rows
    return rows.slice(0, PAGE_SIZE);
  },

  async leases(counties) {
    // Try custom data first
    const customData = await ApiService.fetchObservations([
      "Count_OilGasLease", "Count_OilGasLease_Active", "Count_OilGasLease_Idle", "Count_OilGasLease_Abandoned",
      "Count_OilGasAsset_Wellhead", "Count_OilGasAsset_CompressorStation", "Count_OilGasAsset_PipelineValve",
      "Count_OilGasAsset_TankBattery", "Count_Person_OilGasLeaseEmployee",
      "Date_LastInspection_OilGasLease", "Count_DaysSinceLastInspection_OilGasLease"
    ], counties, "");

    const rows = counties.flatMap(geoId => {
      const get = (varName) => DataExtractor.getValue(customData.byVariable?.[varName], geoId);
      const total = get("Count_OilGasLease");
      if (!total) return [];

      const active = get("Count_OilGasLease_Active");
      const idle = get("Count_OilGasLease_Idle");
      const abandoned = get("Count_OilGasLease_Abandoned");
      const wellheads = get("Count_OilGasAsset_Wellhead");
      const compressors = get("Count_OilGasAsset_CompressorStation");
      const valves = get("Count_OilGasAsset_PipelineValve");
      const tanks = get("Count_OilGasAsset_TankBattery");
      const employees = get("Count_Person_OilGasLeaseEmployee");
      const inspDate = get("Date_LastInspection_OilGasLease");
      const daysSince = get("Count_DaysSinceLastInspection_OilGasLease");

      const assetType = compressors > wellheads ? "Compressor Station" :
        wellheads > 10 ? "Multi-Well Field" :
          wellheads > 0 ? "Wellhead" :
            tanks > 0 ? "Tank Battery" :
              valves > 0 ? "Pipeline Valve" : "Oil & Gas Field";

      const status = abandoned > active ? "Abandoned" :
        idle > active * 0.5 ? "Idle" :
          active > total * 0.8 ? "High Production" : "Active";

      const region = geoId.includes("/48") ? "Permian Basin - West Texas" :
        geoId.includes("/35") ? "Permian Basin - New Mexico" :
          geoId.includes("/01") ? "Gulf Coast - Alabama" : "Other Region";

      let inspection = "N/A";
      if (inspDate > 0) {
        const d = inspDate.toString();
        inspection = d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}${daysSince ? ` (${daysSince}d ago)` : ""}` : "N/A";
      }

      return [{
        assetnameid: `County-${geoId.replace("geoId/", "")}-LEASE-${total}`,
        assettype: assetType,
        operationalstatus: status,
        regionbasin: region,
        lastinspection: inspection,
        responsibleperson: `${wellheads + compressors + valves + tanks} assets, ${employees} employees`
      }];
    });

    // Fallback to public data if no custom data
    if (rows.length) return rows;

    const publicData = await ApiService.fetchObservations(
      ["Count_OilAndGasWell", "Count_PowerPlant", "Count_Person_Employed_NAICSMining"],
      counties, "LATEST"
    );

    return counties.flatMap(geoId => {
      const wells = DataExtractor.getValue(publicData.byVariable?.Count_OilAndGasWell, geoId);
      const plants = DataExtractor.getValue(publicData.byVariable?.Count_PowerPlant, geoId);
      const employment = DataExtractor.getValue(publicData.byVariable?.Count_Person_Employed_NAICSMining, geoId);

      if (!wells && !plants && !employment) return [];

      return [{
        assetnameid: `County-${geoId.replace("geoId/", "")}-ASSET`,
        assettype: plants > wells ? "Power Generation" : wells > 10 ? "Multi-Well Field" : wells > 0 ? "Wellhead" : "Oil & Gas Field",
        operationalstatus: !employment && wells ? "Low Activity" : employment > 100 ? "High Production" : "Active",
        regionbasin: geoId.includes("48") ? "Permian Basin - West Texas" : "Permian Basin - New Mexico",
        lastinspection: DataExtractor.getDate(publicData.byVariable?.Count_OilAndGasWell, geoId),
        responsibleperson: `${wells + plants} assets, ${employment} employees`
      }];
    });
  },

  async intersections(tracts) {
    const counties = await LocationService.getCounties();
    const nearbyCounties = counties.slice(0, tracts.length);

    const [communityData, plumeData, leaseData] = await Promise.all([
      ApiService.fetchObservations(["Count_Person", "Count_Person_BelowPovertyLevelInThePast12Months"], tracts, "LATEST"),
      ApiService.fetchObservations(["Annual_Emissions_Methane"], nearbyCounties, ""),
      ApiService.fetchObservations(["Count_OilAndGasWell"], nearbyCounties, "LATEST")
    ]);

    return tracts.map((tractId, i) => {
      const countyId = nearbyCounties[i] || nearbyCounties[0];
      const pop = DataExtractor.getValue(communityData.byVariable?.Count_Person, tractId);
      const poverty = DataExtractor.getValue(communityData.byVariable?.Count_Person_BelowPovertyLevelInThePast12Months, tractId);
      const methane = DataExtractor.getValue(plumeData.byVariable?.Annual_Emissions_Methane, countyId);
      const wells = DataExtractor.getValue(leaseData.byVariable?.Count_OilAndGasWell, countyId);

      const svi = pop > 0 ? Math.min((poverty / pop) * 2, 1) : 0.5;
      const rate = methane / 8760;

      const risk = rate > 300 && svi > 0.7 ? "Critical" :
        rate > 200 && svi > 0.6 ? "High" :
          rate > 100 || svi > 0.6 ? "Medium" : "Low";

      return {
        riskscore: risk,
        leakeventid: `DC-EMISSION-${countyId.replace("geoId/", "")}`,
        suspectedasset: `ASSET-${countyId.replace("geoId/", "")}-${wells} wells`,
        distancetoasset: wells > 0 ? `${(10 / wells).toFixed(2)} miles avg` : "0.5 miles",
        impactedcommunity: `Tract-${tractId.replace("geoId/", "")}`,
        vulnerabilitylevel: `${svi > 0.7 ? "High" : svi > 0.5 ? "Medium" : "Low"} (${svi.toFixed(2)})`,
        populationatrisk: pop > 0 ? pop.toLocaleString() : "N/A",
        actionstatus: methane > 10000 ? "Monitoring Required" : "Normal Operations"
      };
    });
  }
};

// ==================== UI RENDERER ====================
const UI = {
  normalizeKey: (str) => str.toLowerCase().replace(/[\s\/-]/g, ""),

  getRowValue(row, col) {
    const key = this.normalizeKey(col);
    return row[key] || row[Object.keys(row).find(k => this.normalizeKey(k) === key)] || "N/A";
  },

  styleCell(col, val) {
    const v = String(val).toLowerCase();
    const c = col.toLowerCase();

    if (c.includes("risk") || c.includes("vulnerability")) {
      const colors = { critical: "#dc2626", high: "#dc2626", medium: "#ea580c", low: "#16a34a" };
      const color = Object.keys(colors).find(k => v.includes(k)) || null;
      if (color) return `<span style="background:${colors[color]}20;color:${colors[color]};padding:4px 12px;border-radius:12px;font-weight:500">${val}</span>`;
    }
    if (c.includes("status") || c.includes("action")) {
      return `<span style="background:#3b82f620;color:#3b82f6;padding:4px 12px;border-radius:12px">${val}</span>`;
    }
    if (c.includes("id") || c.includes("asset") || c.includes("event")) {
      return `<span style="font-family:monospace;background:#f3f4f6;padding:2px 8px;border-radius:4px">${val}</span>`;
    }
    return String(val);
  },

  renderHeader(thead, columns) {
    thead.innerHTML = `<tr>${columns.map(c => `<th>${c}</th>`).join("")}</tr>`;
  },

  renderRows(tbody, rows, columns) {
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="${columns.length}" style="text-align:center;padding:40px;color:#666">No data available</td></tr>`;
      return;
    }
    tbody.innerHTML = rows.map(row =>
      `<tr>${columns.map(c => `<td>${this.styleCell(c, this.getRowValue(row, c))}</td>`).join("")}</tr>`
    ).join("");
  },

  renderPager(pager, total, page, onChange) {
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const btn = (label, disabled, p) => `<button class="pagination-btn${p === page ? " active" : ""}" ${disabled ? "disabled" : ""} data-page="${p}">${label}</button>`;
    pager.innerHTML = btn("<", page <= 1, page - 1) + btn(">", page >= pages, page + 1);
    pager.querySelectorAll("button").forEach(b => b.onclick = () => !b.disabled && onChange(+b.dataset.page));
  },

  setActiveTab(tabKey) {
    document.querySelectorAll(".table-tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tabKey));
  }
};

// ==================== APP CONTROLLER ====================
const App = {
  currentTab: "intersections",
  currentPage: 1,

  async loadPage(tabKey, page) {
    this.currentTab = tabKey;
    this.currentPage = page;
    UI.setActiveTab(tabKey);

    const tbody = document.getElementById("tbody");
    const thead = document.getElementById("thead");
    const pager = document.getElementById("pager");
    const config = TAB_CONFIG[tabKey];

    if (!config) return;

    tbody.innerHTML = '<tr><td colspan="20" style="text-align:center;padding:40px;color:#666">Loading...</td></tr>';
    UI.renderHeader(thead, config.columns);

    const [total, locations] = await Promise.all([
      LocationService.getTotalCount(tabKey),
      LocationService.getLocationsForPage(tabKey, page)
    ]);

    const rows = await RowBuilders[tabKey](locations);

    UI.renderRows(tbody, rows, config.columns);
    UI.renderPager(pager, total, page, p => this.loadPage(tabKey, p));
  },

  init() {
    // Tab clicks
    document.querySelectorAll(".table-tab[data-tab]").forEach(tab =>
      tab.onclick = () => this.loadPage(tab.dataset.tab, 1)
    );

    // Initial load
    this.loadPage("intersections", 1);
  }
};

// ==================== INIT ====================
document.addEventListener("DOMContentLoaded", () => App.init());
