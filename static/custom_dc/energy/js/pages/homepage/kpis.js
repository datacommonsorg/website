const KPI_WIDGET_METRICS = {
  plumeAssetIntersections: {
    name: 'Count_Person_IsInternetUser_PerCapita',
    threasholds: {
      low: 80,
      high: 96,
    },
  },
  asssetsNearCommunities: {
    name: 'Count_Person_BelowPovertyLevelInThePast12Months',
    threasholds: {
      low: 25000000,
      high: 30000000,
    },
  },
  highRiskIssues: {
    name: 'Count_Person_HighRiskIssues',
    threasholds: {
      low: 5000,
      high: 8000,
    }
  }
}

const KpiApiService = {
  async doGet(metric) {
    const headers = { "Content-Type": "application/json" };

    const res = await fetch(`${apiRoot}/api/observations/point?entities=country%2FUSA&variables=${metric}`, {
      method: "GET",
      headers,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}: ${text}`);
    }

    const metricData = (await res.json())?.data[metric]
    return metricData['country/USA']?.value;
  },

  async fetchAllKpisData() {
    const allKpisData = {};

    for ([elId, metric] of Object.entries(KPI_WIDGET_METRICS)) {
      allKpisData[elId] = await this.doGet(metric.name);
    }
    return allKpisData;
  }
}

$(document).ready(function () {
  // Apply apiRoot to every DC widget (important for custom DC)
  const dcWidgets = [
    "plumeAssetIntersections", "asssetsNearCommunities", "highRiskIssues",
  ].map((id) => document.getElementById(id));
  dcWidgets.forEach((el) => {
    // Data Commons web components support apiRoot as an advanced configuration attribute.
    el.setAttribute("apiRoot", apiRoot);
  });

  KpiApiService.fetchAllKpisData().then((allKpisData) => {
    Object.entries(allKpisData).forEach(([elId, value]) => {
      const icon = $(`#${elId}SeverityIcon`);
      const label = $(`#${elId}SeverityLabel`);

      let severity = 'low';
      if (value > KPI_WIDGET_METRICS[elId].threasholds.low && value <= KPI_WIDGET_METRICS[elId].threasholds.high) {
        severity = 'high';
      } else if (value > KPI_WIDGET_METRICS[elId].threasholds.high) {
        severity = 'critical';
      }

      icon.toggleClass(`kpi-icon-${severity}`);

      label.toggleClass(`kpi-severity-${severity}`);
      label.text(severity.toUpperCase());
    })
  }).catch((err) => console.error(err))
});
