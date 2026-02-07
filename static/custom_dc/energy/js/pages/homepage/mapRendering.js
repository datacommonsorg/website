const severityColors = {
  critical: '#FF4D4F',
  high: '#FFA115',
  medium: '#FFC350',
  monitored: '#52C41A'
};

// Dataset configurations
const datasets = {
  methane: {
    title: 'Methane detection intensity from public satellite data',
    variable: 'Annual_Emissions_GreenhouseGas_NonBiogenic',
    colors: '#E65100 #F57C00 #FF9800 #FFB74D #FFE082',
    childPlaceType: "State",
  },
  asset: {
    title: 'Private asset locations with regulatory overlap analysis',
    variable: 'Count_Asset_WithRegulatoryOverlap',
    colors: '#0D47A1 #1565C0 #1E88E5 #42A5F5 #90CAF9',
    childPlaceType: "State",
  },
  community: {
    title: 'Community vulnerability and risk factors',
    variable: 'Count_Person_BelowPovertyLevelInThePast12Months',
    colors: '#4A148C #6A1B9A #8E24AA #AB47BC #CE93D8',
    childPlaceType: "State",
  }
};

// Update dataset
function updateDataset(datasetId) {
  const dataset = datasets[datasetId];

  // Update subtitle
  document.getElementById('map-subtitle').textContent = dataset.title;

  // Update chips
  document.querySelectorAll('md-filter-chip').forEach(chip => {
    chip.selected = chip.dataset.dataset === datasetId;
  });

  $('#dcMap').attr('variable', dataset.variable);
  $('#dcMap').attr('colors', dataset.colors);
  $('#dcMap').attr('childPlaceType', dataset.childPlaceType);
  $('#dcMap').attr('header', dataset.title);
}

// Dataset chips
document.querySelectorAll('md-filter-chip').forEach(chip => {
  chip.addEventListener('click', function () {
    updateDataset(this.dataset.dataset);
  });
});

// Table tabs
document.querySelectorAll('.table-tab').forEach(tab => {
  tab.addEventListener('click', function () {
    document.querySelectorAll('.table-tab').forEach(t => t.classList.remove('active'));
    this.classList.add('active');
  });
});

// Initialize on load
$(document).ready(function () {
  document.getElementById('dcMap').setAttribute("apiRoot", apiRoot);

  updateDataset('methane');
});
