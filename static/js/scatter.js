/**
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* This script generates the menu, chart options, and chart for scatterplot.
 * TODO: Break this script up into smaller modules. */

import { getApiKey, getApiRoot, unzip } from "./util.js";

/* Clear url on page reload */
if (performance.navigation.type == 1) {
  // This page is reloaded
  window.location.href = window.location.href.split("/")[0];
}

$(function () {
  /****************************************************************************
   * GLOBAL VARIABLES
   ****************************************************************************/

  /* Map from subtype (smaller region) to objtype (larger region)
   * https://github.com/datacommonsorg/mixer/blob/master/type_relation.json */
  let containedInPlaceOptions = {
    CensusCoreBasedStatisticalArea: ["Country"],
    CensusCountyDivision: ["County", "State"],
    CensusTract: ["County", "State"],
    City: ["County", "State"],
    CongressionalDistrict: ["State"],
    County: ["State"],
    HighSchoolDistrict: ["State"],
    SchoolDistrict: ["County", "State"],
    State: ["Country"],
    StateComponent: ["State"],
  };

  let OPTION1 = ""; // currently selected x variable
  let OPTION2 = ""; // currently selected y variable
  let CURR_COUNTRY = "country/USA";

  let MIN_POP = 0; // min population
  let MAX_POP = 330000000; // max population ~ US population
  let PREV_DROPPED = 0; // number of datapoints previously dropped

  let ENCLOSING_AREA = ""; // a objtype (ex: geoId/06)
  let LOCATION_IN = ""; // a subtype (ex: village/town/...)
  let ALL = false; // true = plot all subtypes in a country (USA)

  /* Chart options */
  let PER_CAPITA = false;
  let SWAP = false;
  let LOGX = false;
  let LOGY = false;
  let ENABLE_REGRESSION = false;

  let THIRD_VAR = ""; // the third variable selected
  let CHOSEN_STATE = ""; // keeps track of the state chosen

  /* Keeps track of the two variables that are currently selected. */
  let CURR_CHECKED = { one: "", two: "" };

  /* Array to hold information to download csv */
  let DOWNLOAD_ARR = [];

  // objects containing parameters for the v and h axes
  let vObj = { title: "" };
  let hObj = { title: "" };

  /* Display the dropdown to select place types. */
  let elem = document.getElementById("place-types");
  configPlaceTypes(elem);

  /****************************************************************************
   * Download data as csv
   ****************************************************************************/

  /* Convert an array to csv. Credit: https://jsfiddle.net/jossef/m3rrLzk0/ */
  function exportToCsv(filename, rows) {
    let processRow = function (row) {
      let finalVal = "";
      for (let j = 0; j < row.length; j++) {
        let innerValue = !row[j] ? "" : row[j].toString();
        if (row[j] instanceof Date) {
          innerValue = row[j].toLocaleString();
        }
        let result = innerValue.replace(/"/g, '""');
        if (result.search(/("|,|\n)/g) >= 0) result = '"' + result + '"';
        if (j > 0) finalVal += ",";
        finalVal += result;
      }
      return finalVal + "\n";
    };
    let csvFile = "";
    for (let i = 0; i < rows.length; i++) {
      csvFile += processRow(rows[i]);
    }

    let blob = new Blob([csvFile], { type: "text/csv;charset=utf-8;" });
    if (navigator.msSaveBlob) {
      // IE 10+
      navigator.msSaveBlob(blob, filename);
    } else {
      let link = document.createElement("a");
      if (link.download !== undefined) {
        // feature detection
        // Browsers that support HTML5 download attribute
        let url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  }

  /* If the user wants to download the data as a csv */
  $("#download-csv").click(function () {
    if (DOWNLOAD_ARR.length > 0) {
      exportToCsv("data.csv", DOWNLOAD_ARR);
    }
  });

  /****************************************************************************
   * Check constraints and plot
   ****************************************************************************/

  /* If location + two variables are selected, get data and plot chart.*/
  function checkAndPlotData() {
    if (locationSelected() && selectedTwo()) {
      requestDataAndPlot();
    }
  }

  /**
   * If location + two variables are selected, plot chart.
   * Does not re-fetch the data.
   * @param{string} OPTION1
   * @param{string} OPTION2
   * @param{?object} geoDictX Contains values of x axis variable
   * @param{?object} geoDictY Contains values of y axis variable
   * @param{?object} geoDictPop Contains population count for all location
   * @param{?Array<string>} locations Array of locations to plot
   */
  function maybeDrawScatter(
    OPTION1,
    OPTION2,
    geoDictX,
    geoDictY,
    geoDictPop,
    locations
  ) {
    if (locationSelected() && selectedTwo()) {
      drawScatter(OPTION1, OPTION2, geoDictX, geoDictY, geoDictPop, locations);
    }
  }

  /* Resets the chart */
  function resetChart() {
    LOCATION_IN = "";
    ENCLOSING_AREA = "";
    ENCLOSING_AREA = "";
    CHOSEN_STATE = "";
    ALL = false;
    $("#place-types").val("");
    drawScatter(OPTION1, OPTION2, {}, {}, {}, []);
  }

  /* Returns true if user selected valid locations */
  function locationSelected() {
    return ALL || (LOCATION_IN.length > 0 && ENCLOSING_AREA.length > 0);
  }

  /* Returns true if two variables are selected */
  function selectedTwo() {
    return CURR_CHECKED["one"] !== "" && CURR_CHECKED["two"] !== "";
  }

  /* Returns true if user selects a third variable */
  function selectedThird(evt) {
    return (
      selectedTwo() &&
      evt.target !== CURR_CHECKED["one"] &&
      evt.target !== CURR_CHECKED["two"]
    );
  }

  /****************************************************************************
   * Create the dropdown menus
   * Note: placeObject.json contains the object with the following format:
   *      CURR_COUNTRY: state1: county1: [city1, city2, city3, ...]
   ****************************************************************************/

  /**
   * Create an option for dropdown menu
   * @param {?object} dropdownOptions Dropdown options
   * @param {string} text Text of the dropdown option with geoId removed
   * @param {string} value Value of the dropdown option with geoId
   */
  function createOption(dropdownOptions, text, value) {
    let opt = document.createElement("option");
    opt.value = value;
    if (text.includes("geoId")) {
      // remove geoId suffix
      let arr = text.split("geoId/");
      opt.text = arr[0];
    } else {
      opt.text = text;
    }
    dropdownOptions.options.add(opt);
  }

  /**
   * Create the list of dropdown options
   * @param {?Array<string>} optionsArray Array of keys
   * @param {?object} dropdownOptions Dropdown options
   */
  function createOptions(optionsArray, dropdownOptions) {
    if (typeof optionsArray !== "undefined") {
      for (let i = 0; i < optionsArray.length; i++) {
        createOption(dropdownOptions, optionsArray[i], optionsArray[i]);
      }
    }
  }

  /**
   * Populate dropdown of place type (subtype) options.
   * @param{?object} placeTypes The place-type element
   */
  function configPlaceTypes(placeTypes) {
    placeTypes.options.length = 0;
    createOption(placeTypes, "Select a place type", "");
    let keys = Object.keys(containedInPlaceOptions);
    createOptions(keys, placeTypes);
  }

  /* Populate dropdown of state options. */
  $("#place-types").click(function () {
    let stateTypeElem = document.getElementById("place-types-states");
    let countyTypeElem = document.getElementById("place-types-counties");
    $.get("data/placeObject.json", function (nestedLocations) {
      stateTypeElem.options.length = 0;
      countyTypeElem.options.length = 0;
      createOption(stateTypeElem, "Select a state", "");
      let stateTypeElemkeys = Object.keys(nestedLocations[CURR_COUNTRY]).sort();
      stateTypeElemkeys.unshift(CURR_COUNTRY);
      createOptions(stateTypeElemkeys, stateTypeElem);
    });
  });

  /* Populate dropdown of county options. */
  $("#place-types-states").change(function () {
    let stateTypeElem = document.getElementById("place-types-states");
    let countyTypeElem = document.getElementById("place-types-counties");
    $.get("data/placeObject.json", function (nestedLocations) {
      countyTypeElem.options.length = 0;
      createOption(countyTypeElem, "Select a county (optional)", "");

      // if a state is selected, create counties dropdown
      if (
        stateTypeElem.value.length > 0 &&
        stateTypeElem.value !== CURR_COUNTRY
      ) {
        let countyTypeElemkeys = Object.keys(
          nestedLocations[CURR_COUNTRY][stateTypeElem.value]
        ).sort();
        createOptions(countyTypeElemkeys, countyTypeElem);
      } else {
        createOptions([], countyTypeElem);
      }
    });
  });

  /****************************************************************************
   * Update dropdown menus on change, draw chart if valid
   ****************************************************************************/

  /* When user selects a place type, control the visibility of state and county
   * dropdowns. */
  $("#place-types").change(function () {
    let chosenPlaceType = $(this).val(); // ex: 'Town'
    let arrOptions = containedInPlaceOptions[chosenPlaceType];

    // If user goes back to 'Select place type', clear the chart
    if (chosenPlaceType === "") {
      document.getElementById("enclosing").style.visibility = "hidden";
      document.getElementById("place-types-states").style.visibility = "hidden";
      document.getElementById("place-types-counties").style.visibility =
        "hidden";
      resetChart();

      // If user selects a place type with only country as the enclosing area
      // ('CensusCoreBasedStatisticalArea', 'CommutingZone', 'State'),
      // don't display state or counties.
    } else if (arrOptions.length === 1 && arrOptions[0] === "Country") {
      document.getElementById("enclosing").style.visibility = "hidden";
      document.getElementById("place-types-states").style.visibility = "hidden";
      document.getElementById("place-types-counties").style.visibility =
        "hidden";
      LOCATION_IN = chosenPlaceType;
      ALL = true;
      checkAndPlotData();

      // User selects a place type with additional enclosing areas
    } else if (arrOptions.length > 0) {
      document.getElementById("enclosing").style.visibility = "visible";
      document.getElementById("place-types-states").style.visibility =
        "visible";
      document.getElementById("place-types-counties").style.visibility =
        "hidden";
      LOCATION_IN = chosenPlaceType;
      ALL = false;
    }
  });

  /* When user selects a state, control the visibility of county dropdown. */
  $("#place-types-states").change(function () {
    let chosenState = $(this).val();
    let arrOptions = containedInPlaceOptions[LOCATION_IN];
    ALL = false;

    // No state chosen: hide county
    if (chosenState === "") {
      document.getElementById("place-types-counties").style.visibility =
        "hidden";
      ENCLOSING_AREA = "";
      CHOSEN_STATE = "";
    } else if (chosenState === CURR_COUNTRY) {
      document.getElementById("place-types-counties").style.visibility =
        "hidden";
      CHOSEN_STATE = chosenState;
      ENCLOSING_AREA = chosenState;
    } else {
      // State chosen: if the placetype also includes county, make that visible
      // If it includes a county, keep track of the state
      CHOSEN_STATE = chosenState;
      ENCLOSING_AREA = chosenState;
      if (arrOptions.includes("County")) {
        document.getElementById("place-types-counties").style.visibility =
          "visible";
      } else {
        document.getElementById("place-types-counties").style.visibility =
          "hidden";
      }
    }
    checkAndPlotData();
  });

  /* If a county is chosen, plot it */
  $("#place-types-counties").change(function () {
    let chosenCounty = $(this).val();
    if (chosenCounty === "") {
      ENCLOSING_AREA = CHOSEN_STATE;
    } else {
      ENCLOSING_AREA = chosenCounty;
    }
    checkAndPlotData();
  });

  /****************************************************************************
   * Functions to clean and parse strings for plot and dialog box labels and
   * extract popType, measuredProp, and PVs
   ****************************************************************************/

  /**
   * For long strings:
   * "Person,count,educationalAttainment,12ThGradeNoDiploma,age,Years25Onwards",
   * --->  "educationalAttainment 12ThGradeNoDiploma,age Years25Onwards"
   * For short strings:
   * "Person,count", --->  "Person,count"
   * @param{string} option
   * @return{string}
   */
  function cleanedLabelNoUnits(option) {
    let arr = option.split(/[ ,]+/);
    let str = "";
    if (arr.length === 2) {
      let arrType = arr[0].split("-"); // remove the "checkbox-"
      if (arrType.length > 1) {
        str = arrType[arrType.length - 1] + " " + arr[1];
      } else {
        str = arr[0] + " " + arr[1];
      }
    }
    if (arr.length > 2) {
      for (let i = 2; i < arr.length; i++) {
        if (i % 2 !== 0) {
          str += arr[i] + ",";
        } else {
          str += arr[i] + " ";
        }
      }
    }
    return str.replace(/,\s*$/, ""); // strip last comma if present
  }

  /**
   * Assumes units is the second word in the string.
   * "Person count gender Female" --> Female (count)
   * "Person age" --> Person (age)
   * @param{string} option
   * @return{string}
   */
  function cleanedLabel(option) {
    let arr = option.split(/[ ,]+/);
    let str = "";
    if (arr.length === 2) {
      str = arr[0] + " " + arr[1];
    }
    if (arr.length > 2) {
      for (let i = 2; i < arr.length; i++) {
        if (i % 2 !== 0) {
          str += arr[i] + ",";
        } else {
          str += arr[i] + " ";
        }
      }
      str = str.replace(/,\s*$/, "");
      str += " (" + arr[1] + ")"; // format unit
    }
    return str;
  }

  /* Get measured property from an OPTION string. Example:
   * "Person, count, gender, Female" -> count */
  function getMeasuredProp(str) {
    let arr = str.split(/[ ,]+/);
    return arr[1];
  }

  /* Get population type from an OPTION string. Example:
   * "CriminalActivities,count,crimeType,FBI_Violent" -> CriminalActivities */
  function getPopType(str) {
    let arr = str.split(/[ ,]+/);
    return arr[0];
  }

  /**
   * Get an array containing objects with property values
   * Ignore the first two strings (Population type, measured property)
   * @param{?Array<string>} arr OPTION split up as an array of strings
   * @return{?Array<?object>} pv An array of property value pairs
   */
  function getPropValArr(arr) {
    let pv = [];
    if (arr.length > 2) {
      let i = 2;
      while (i < arr.length) {
        let obj = { property: arr[i], value: arr[i + 1] };
        pv.push(obj);
        i += 2;
      }
    }
    return pv;
  }

  /****************************************************************************
   * menu.js (Most of it is taken from GNI code)
   ****************************************************************************/

  let allCategories = [
    "Demographics",
    "Health",
    "Economics",
    "Business",
    "Crime",
    "Education",
    "Employment",
    "Housing",
  ];

  let evtmap = {};

  let exploreMenu = {
    initialize: function (json, urlParams) {
      let categoryList = [];
      let menuContainer = document.querySelector("#drill");
      let selectedOptionList = urlParams.ptpv ? urlParams.ptpv.split("|") : [];
      let clean = (str) => {
        return str.replace(" ", "-");
      };

      let place_types = new Set();
      if ("place" in urlParams) {
        for (let dcid of urlParams["place"].split(",")) {
          let pt = dcidToPlaceType(dcid);
          if (pt) {
            place_types.add(pt);
          }
        }
      }

      for (let it of allCategories) {
        if (it in json) {
          categoryList.push(json[it]);
        }
      }
      let traverse = (node, parentElement) => {
        let showIfSelectedOption = (argString) => {
          if (selectedOptionList.includes(argString)) {
            let ulParent = parentElement.closest(".unordered-list");
            while (ulParent !== null) {
              ulParent.classList.remove("hidden");
              ulParent.classList.remove("collapsed");
              ulParent = ulParent.parentElement.closest(".unordered-list");
            }
            document
              .getElementById(`checkbox-${argString}`)
              .classList.add("checked");
          }
        };
        let htmlString = "";
        if (node.type.toLowerCase() === "property") {
          if (
            place_types.size > 0 &&
            node["placeTypes"] &&
            node["placeTypes"].length > 0
          ) {
            let validNode = false;
            for (let p of place_types) {
              if (node["placeTypes"].includes(p)) {
                validNode = true;
                break;
              }
            }
            if (!validNode) {
              return;
            }
          }

          // Create li element
          let listItem = document.createElement("li");
          listItem.classList.add("parent");
          listItem.id = clean(node.title);

          if (node.children.length > 0) {
            htmlString = `<span class=${node.argString}>${node.title}`;
            if (node.count > 1) {
              htmlString += `<sup>(${node.count})</sup>`;
            }
            htmlString += `<a id="${node.argString}" class="expand-link" data-argstring="${node.argString}">
                <img class="right-caret" width="12px" src="images/right-caret-light.png" />
                </a>
                </span>`;
          } else {
            htmlString = `<span>${node.title}</span>`;
          }
          listItem.innerHTML = htmlString;

          // Append to parent container
          parentElement.appendChild(listItem);

          // Create and append ul element that will contain children
          let unorderedListItem = document.createElement("ul");
          unorderedListItem.classList.add("unordered-list");
          unorderedListItem.classList.add("hidden");
          unorderedListItem.classList.add("collapsed");
          parentElement.appendChild(unorderedListItem);

          // Traverse children
          let children2 = node.children;
          children2.sort((a, b) => a["num"] - b["num"]);
          children2.forEach((child) => {
            traverse(child, unorderedListItem);
          });
        } else if (node.type.toLowerCase() === "value") {
          // Create li element
          let listItem = document.createElement("li");
          listItem.classList.add("value");
          listItem.id = clean(node.title);

          htmlString = `<span>
            <a id="${node.argString}" class="value-link" data-argstring="${node.argString}">
              ${node.title}
              <button id="checkbox-${node.argString}" class="checkbox"></button>
            </a>
          </span>`;
          if (node.children.length > 0) {
            htmlString += `<sup>(${node.count})</sup>`;
            htmlString += `<a class="expand-link">
                      <img class="right-caret" width="12px" src="images/right-caret-light.png" />
                     </a>`;
          }
          listItem.innerHTML = htmlString;

          // Append to parent container
          parentElement.appendChild(listItem);

          // If this is a selected option, show the tree leading up to here
          showIfSelectedOption(node.argString);

          // Create and append ul element that will contain children
          let unorderedListItem = document.createElement("ul");
          unorderedListItem.classList.add("unordered-list");
          unorderedListItem.classList.add("hidden");
          unorderedListItem.classList.add("collapsed");
          parentElement.appendChild(unorderedListItem);

          // Traverse children
          node.children.forEach((child) => {
            traverse(child, unorderedListItem);
          });
        }
      };

      let toggleChildren = (evt) => {
        // Show children
        let children = evt.target.closest("li").nextSibling;
        if (children) {
          children.classList.toggle("hidden");
          setTimeout(() => {
            children.classList.toggle("collapsed");
          }, 0);
        }
        evt.currentTarget
          .querySelector(".right-caret")
          .classList.toggle("transform-up");
      };

      /* Change the text in the dialog. */
      function changeText(name, id) {
        document.getElementById(id).innerHTML = name;
      }

      /**
       * Dialog is from jQuery UI
       * Keep track of which menu items are checked in a dialog.
       * The dialog is opened when a third variable is selected.
       * The user chooses which variable to replace.
       * If you uncheck a box, it does nothing.
       * Then clean up any checked boxes and close the dialog.
       */
      function openDialog() {
        document.getElementById("dialog").style.visibility = "visible";
        $("#dialog")
          .dialog()
          .find(":checkbox")
          .unbind("change")
          .bind("change", function (e) {
            if (this.checked) {
              // if a third option was selected and only one other dialog
              // checkbox was selected, swap third with selected element
              if (
                THIRD_VAR !== "" &&
                document.getElementById("one").checked !==
                  document.getElementById("two").checked
              ) {
                replaceVariable(e.target.id);

                // close dialog and uncheck all in dialog
                $("#one").removeAttr("checked"); // jq 1.6+
                $("#two").removeAttr("checked");
                $(this).closest(".ui-dialog-content").dialog("close");
                document.getElementById("dialog").style.visibility = "hidden";

                checkAndPlotData();
              }
            }
          });
      }

      /* When different menu items are checked, update OPTION1 and OPTION2 */
      function updateOptions() {
        if (CURR_CHECKED["one"] !== "") {
          let str1 = CURR_CHECKED["one"].id;
          str1 = str1.split("-")[1]; // discard first item that is 'checkbox-'
          let arr1 = str1.split(",");
          OPTION1 = arr1.join(" ");
        }
        if (CURR_CHECKED["two"] !== "") {
          let str2 = CURR_CHECKED["two"].id;
          str2 = str2.split("-")[1];
          let arr2 = str2.split(",");
          OPTION2 = arr2.join(" ");
        }
      }

      /**
       * Replace a variable in dialog box.
       * THIRD_VAR is a string like this:
       * "checkbox-Person,count,placeOfBirth,BornInOtherStateInTheUnitedStates"
       * @param{string} id The id is either "one" or "two"
       */
      function replaceVariable(id) {
        let toBeReplaced = CURR_CHECKED[id];
        toBeReplaced.classList.toggle("checked");

        // remove variable from left side menu and remove from url
        togglePV(toBeReplaced.id.split("-")[1], id);

        CURR_CHECKED[id] = THIRD_VAR;
        let label = cleanedLabelNoUnits(THIRD_VAR.id);
        changeText(label, "var-" + id); // update the appropriate dialog box

        THIRD_VAR.classList.toggle("checked"); // update menu with new variable
        THIRD_VAR = ""; // reset

        updateOptions();
      }

      /* Called when an item in the menu is selected.
       * Keep track of the two variables selected by updating CURR_CHECKED
       * If user tries to select a third variable, a dialog pops allowing them
       * to swap out a previously selected variable */
      let toggleChartPOV = (evt) => {
        if (evt.target.classList.contains("checkbox")) {
          // third variable selected
          if (selectedThird(evt)) {
            THIRD_VAR = evt.target;
            let label = cleanedLabelNoUnits(evt.target.id);
            changeText(label, "new-selection"); // add to dialog box
            openDialog(); // togglePv is called here

            // user is picking the first two variables
          } else {
            // false = unchecked, true = checked
            let toggleVal = evt.target.classList.toggle("checked");

            // if checked, add to CURR_CHECKED
            if (toggleVal) {
              if (CURR_CHECKED["one"] === "") {
                CURR_CHECKED["one"] = evt.target;
                let label = cleanedLabelNoUnits(evt.target.id);
                changeText(label, "var-one");
              } else if (CURR_CHECKED["two"] === "") {
                CURR_CHECKED["two"] = evt.target;
                let label = cleanedLabelNoUnits(evt.target.id);
                changeText(label, "var-two");
              } else {
                // CURR_CHECKED has two variables selected, do nothing
              }
              updateOptions();
              checkAndPlotData();

              // if unchecked, remove from dialog, menu, and OPTIONs
            } else {
              if (CURR_CHECKED["one"] === evt.target) {
                CURR_CHECKED["one"] = "";
                changeText("", "var-one");
              }
              if (CURR_CHECKED["two"] === evt.target) {
                CURR_CHECKED["two"] = "";
                changeText("", "var-two");
              }
              updateOptions();
              if (locationSelected()) {
                // clear chart if <2 variables
                drawScatter(OPTION1, OPTION2, {}, {}, {}, []);
              }
            }
          }
          evtmap[evt.currentTarget.dataset.argstring] = evt;
          // update menu and url
          togglePV(evt.currentTarget.dataset.argstring, "");
        }
      };

      categoryList.forEach((category) => {
        if (category) {
          traverse(category, menuContainer);
        }
      });

      document.querySelectorAll(".expand-link").forEach((item) => {
        item.addEventListener("click", toggleChildren);
      });

      document.querySelectorAll(".checkbox").forEach((item) => {
        item.addEventListener("change", toggleChartPOV);
      });

      document.querySelectorAll(".value-link").forEach((item) => {
        item.addEventListener("click", toggleChartPOV);
      });
    },
  };

  /****************************************************************************
   * main.js (also taken from GNI code) - draws the Tree
   ********************************s*******************************************/

  /* Draw explore menu */

  // jsonObject is the obj from hierarchy.js
  function drawExploreMenu(jsonObject, urlargs) {
    document.querySelector("#drill").innerHTML = "";
    exploreMenu.initialize(jsonObject, urlargs);
  }

  /**
   * Add or remove from url upon selection of menu item
   * Call togglePV every time you check AND UNCHECK an item
   * @param{string} argStr The string of what was checked/unchecked
   * @param{string} id The id "one" or "two" of what was checked/unchecked
   */
  function togglePV(argStr, id) {
    let vars = {}; // what was previously in the url
    let ptpv = [];
    // If what was checked is present in the url, remove it, else, add it,
    if ("ptpv" in vars) {
      ptpv = vars["ptpv"].split("|");

      if (ptpv.includes(argStr)) {
        ptpv.splice(ptpv.indexOf(argStr), 1);
      } else {
        ptpv.push(argStr);
      }
      // Not already in url, just add it
    } else {
      ptpv.push(argStr);
    }

    if (ptpv.length == 0) {
      delete vars["ptpv"];
    } else {
      vars["ptpv"] = ptpv.join("|");
    }
    let newUrl = "#&";

    for (const k in vars) {
      if (vars[k].length > 0) {
        newUrl += "&" + k + "=" + vars[k];
      }
    }
    window.location.href = newUrl;
  }

  $.getJSON("data/hierarchy.json", function (hierarchy) {
    drawExploreMenu(hierarchy[0], []);
  });

  /****************************************************************************
   * Get data from API + format data
   ****************************************************************************/

  /* Start the loading spinner and gray out the background. */
  function loadSpinner() {
    $("#screen").addClass("visible");
  }

  /* Remove the spinner and gray background. */
  function removeSpinner() {
    $("#screen").removeClass("visible");
  }

  /**
   * Send request to DataCommons REST api endpoint and get result payload.
   * @param {string} reqUrl The request url with parameters.
   * @param {boolean} isZip Whether to unzip the payload.
   * @param {boolean=} isGet If it is a 'GET' request.
   * @param {!object=} data Request data.
   * @param {function(?object)} dataCallback
   * @param {function(?object)} errorCallback
   */
  function sendRequest(
    reqUrl,
    isZip,
    isGet = true,
    data = {},
    dataCallback = function () {},
    errorCallback = function () {}
  ) {
    const request = new XMLHttpRequest();
    let jsonString = null;
    if (isGet) {
      request.open("GET", getApiRoot() + reqUrl + `&key=${getApiKey()}`, true);
    } else {
      request.open("POST", getApiRoot() + reqUrl + `?key=${getApiKey()}`, true);
    }

    request.onload = function (e) {
      if (request.status === 200) {
        if (isZip) {
          let s = JSON.parse(request.responseText)["payload"];
          if (s) {
            jsonString = unzip(s);
          } else {
            dataCallback(null);
          }
        } else {
          jsonString = JSON.parse(request.responseText)["payload"];
        }
        dataCallback(JSON.parse(jsonString));
      } else {
        console.log(request.status);
      }
    };

    request.onerror = function (e) {
      errorCallback(e);
    };

    request.send(JSON.stringify(data));
  }

  /**
   * Get object for API request
   * @param{string} inputPlaceType Example: state, city, census tract
   * @param{string} inputPopType Example: Person, Household, HousingUnit
   * @param{?object} inputPV Example: {property: 'gender', value: 'Female'}
   * @return{?object} This is the object used for a POST request
   */
  function getRequestData(inputPlaceType, inputPopType, inputPV) {
    let date = "2018";
    if (inputPopType == "MedicalConditionIncident") {
      date = "2020-05-11";
    } else if (inputPopType == "CriminalActivities") {
      date = "2017";
    }
    return {
      observationDate: date,
      placeType: inputPlaceType,
      populationType: inputPopType,
      pvs: inputPV,
      compress: true,
    };
  }

  /**
   * Create an object to store all the values at each location.
   * @param{?object} parsedData A JSON object with the data for each location
   * @param{string} optionStr One of the OPTIONs, a variable selected by user
   * @return{?object} geoDict An object containing info for a place
   *                          key = geoid without the 'geoid/' prefix
   *                          value = name and years + values
   * Example-                 01001:  name:  "Autauga County"
   *                                  value:   7560
   */
  function getGeoDict(parsedData, optionStr) {
    let optionMeasuredProp = getMeasuredProp(optionStr);
    let geoDict = {};
    let infoObj = {};

    for (let geoObj of parsedData) {
      let geoId = geoObj["place"].split("/")[1];
      infoObj["name"] = geoObj["name"];
      let observations = Object.values(geoObj["observations"]);

      for (let observation of observations) {
        // make sure the observation's measuredProp matches,
        if (observation["measuredProp"] === optionMeasuredProp) {
          for (let key in observation) {
            if (key.includes("Value")) {
              infoObj["value"] = observation[key];
              geoDict[geoId] = infoObj;
              infoObj = {};
            }
          }
        }
      }
    }
    return geoDict;
  }

  /**
   * Create the array of geoIds based on user place type selection
   * Renders the chart by calling drawScatter(...)
   * Plot all the LOCATION_IN (City, county, CensusTract, etc),
   * filtered by ENCLOSING_AREA (State, County)
   * If ALL = true, plot all the LOCATION_IN in the country
   * @param{?Object} geoDictX Contains values for x axis
   * @param{?Object} geoDictY Contains values for y axis
   * @param{?Object} geoDictPop Contains values for population count
   */
  function getLocationsAndPlot(geoDictX, geoDictY, geoDictPop) {
    let locations = [];
    if (
      (ALL && LOCATION_IN !== "") ||
      (ENCLOSING_AREA !== "" && LOCATION_IN !== "")
    ) {
      let enclosingId = "";
      if (ALL) {
        enclosingId = CURR_COUNTRY;
      } else {
        enclosingId = ENCLOSING_AREA.split(" ").slice(-1)[0];
      }

      let reqUrl =
        "/node/places-in?dcids=" + enclosingId + "&place_type=" + LOCATION_IN;
      // not zipped, GET = true
      sendRequest(
        reqUrl,
        false,
        true,
        {},
        function (piObjs) {
          for (let location of piObjs) {
            locations.push(location["place"].split("/")[1]);
          }
          // remove duplicates
          locations = new Set(locations);
          locations = Array.from(locations);
          maybeDrawScatter(
            OPTION1,
            OPTION2,
            geoDictX,
            geoDictY,
            geoDictPop,
            locations
          );
        },
        // TODO: needs better error handling
        function (e) {
          console.log(e);
        }
      );
    } else {
      maybeDrawScatter(
        OPTION1,
        OPTION2,
        geoDictX,
        geoDictY,
        geoDictPop,
        locations
      );
    }

    /* Checks if user wants to calculate per capita */
    $("#per-capita").change(function () {
      if (document.getElementById("per-capita").checked) {
        PER_CAPITA = true;
      } else {
        PER_CAPITA = false;
      }
      maybeDrawScatter(
        OPTION1,
        OPTION2,
        geoDictX,
        geoDictY,
        geoDictPop,
        locations
      );
    });

    /* Checks if user wants to swap x and y axes */
    $("#swap").change(function () {
      if (document.getElementById("swap").checked) {
        SWAP = true;
      } else {
        SWAP = false;
      }
      maybeDrawScatter(
        OPTION1,
        OPTION2,
        geoDictX,
        geoDictY,
        geoDictPop,
        locations
      );
    });

    /* Checks if user wants to use log scale. */
    $("#log-check-x").change(function () {
      if (document.getElementById("log-check-x").checked) {
        LOGX = true;
        hObj = { title: cleanedLabel(OPTION1), scaleType: "log" };
      } else {
        LOGX = false;
        hObj = { title: cleanedLabel(OPTION1) };
      }
      maybeDrawScatter(
        OPTION1,
        OPTION2,
        geoDictX,
        geoDictY,
        geoDictPop,
        locations
      );
    });

    $("#log-check-y").change(function () {
      if (document.getElementById("log-check-y").checked) {
        LOGY = true;
        vObj = { title: cleanedLabel(OPTION2), scaleType: "log" };
      } else {
        LOGY = false;
        vObj = { title: cleanedLabel(OPTION2) };
      }
      maybeDrawScatter(
        OPTION1,
        OPTION2,
        geoDictX,
        geoDictY,
        geoDictPop,
        locations
      );
    });

    /* If user selects a valid threshold for the population, redraw chart. */
    $("#enter-threshold").click(function () {
      let minInput = Number(document.getElementById("min-pop").value);
      let maxInput = Number(document.getElementById("max-pop").value);

      if (Number.isNaN(minInput)) {
        alert("Please enter a valid minimum");
      } else if (Number.isNaN(maxInput)) {
        alert("Please enter a valid maximum");
      } else if (minInput < 0) {
        alert("Minimum cannot be negative");
      } else if (maxInput < 0) {
        alert("Maximum cannot be negative");
      } else if (minInput > maxInput) {
        alert("Maximum must be greater than or equal to minimum");
      } else {
        MIN_POP = minInput;
        MAX_POP = maxInput;
        maybeDrawScatter(
          OPTION1,
          OPTION2,
          geoDictX,
          geoDictY,
          geoDictPop,
          locations
        );
      }
    });
  }

  /**
   * Request data from API and return an array containing payload objects.
   * @param{function(?object,?object,?object)} dataCallback
   * @param{function()} errorCallback
   */
  function getPayloadArray(dataCallback, errorCallback) {
    let stringArray1 = OPTION1.split(/[ ,]+/);
    let stringArray2 = OPTION2.split(/[ ,]+/);

    let popX = stringArray1[0]; // Index 0 = population type
    let popY = stringArray2[0];

    let pvX = getPropValArr(stringArray1);
    let pvY = getPropValArr(stringArray2);

    let xAxis,
      yAxis,
      popCount = undefined;

    // x-axis
    sendRequest(
      "/bulk/place-obs",
      true,
      false,
      getRequestData(LOCATION_IN, popX, pvX),
      function (payload) {
        xAxis = payload;
        dataCallback(xAxis, yAxis, popCount);
      },
      errorCallback
    );

    // y-axis
    sendRequest(
      "/bulk/place-obs",
      true,
      false,
      getRequestData(LOCATION_IN, popY, pvY),
      function (payload) {
        yAxis = payload;
        dataCallback(xAxis, yAxis, popCount);
      },
      errorCallback
    );

    // population count
    sendRequest(
      "/bulk/place-obs",
      true,
      false,
      getRequestData(LOCATION_IN, "Person", []),
      function (payload) {
        popCount = payload;
        dataCallback(xAxis, yAxis, popCount);
      },
      errorCallback
    );
  }

  /* Get the payloadArray, format the data into objects, call get locations
   * array to plot data. */
  function requestDataAndPlot() {
    loadSpinner();
    getPayloadArray(
      function (xAxis, yAxis, popCount) {
        if (
          xAxis === undefined ||
          yAxis === undefined ||
          popCount === undefined
        ) {
          return;
        }
        if (
          xAxis &&
          Object.keys(xAxis).length > 0 &&
          yAxis &&
          Object.keys(yAxis).length > 0
        ) {
          let dataX = xAxis["places"];
          let geoDictX = getGeoDict(dataX, OPTION1);

          let dataY = yAxis["places"];
          let geoDictY = getGeoDict(dataY, OPTION2);

          let dataP = popCount["places"];
          let geoDictP = getGeoDict(dataP, "Person,count");

          getLocationsAndPlot(geoDictX, geoDictY, geoDictP);
        } else {
          // if payloadArray is empty, do not plot
          // TODO: get list of variables that only have data for specific
          // place types. For example, CriminalActivities only have data
          // at a city level.
          alert("ERROR: No data available for this set of constraints.");
          resetChart();
          removeSpinner();
        }
      },
      function (e) {
        alert("ERROR: No data available for this set of constraints.");
        console.log(e);
        resetChart();
        removeSpinner();
      }
    );
  }

  /****************************************************************************
   * Draw Scatter Chart
   ****************************************************************************/

  /**
   * Calculate the mean of an array
   * @param{?Array<number>} values Array of all the numbers for a given axis.
   * @return{string} Returns the average as a string
   */
  function getMean(values) {
    if (values.length > 0) {
      let total = 0;
      for (let i = 0; i < values.length; i++) {
        total += values[i];
      }
      return (total / values.length).toFixed(3);
    } else {
      return "";
    }
  }

  /**
   * Calculate standard deviation of an array given the average
   * @param{?Array<number>} values Array of all the numbers for a given axis.
   * @param{string} avg Average of the array values
   * @return{string} The standard deviation for that array
   */
  function getSd(values, avg) {
    if (values.length > 0) {
      let squareDiffs = values.map(function (value) {
        let diff = value - avg;
        let sqrDiff = diff * diff;
        return sqrDiff;
      });
      let avgSquareDiff = getMean(squareDiffs);
      let stdDev = Math.sqrt(avgSquareDiff);
      return stdDev.toFixed(3);
    } else {
      return "";
    }
  }

  /* Display mean and standard deviation only if all values are present */
  function displayCalc(xArr, yArr) {
    let avgX = getMean(xArr);
    let avgY = getMean(yArr);
    let sdX = getSd(xArr, avgX);
    let sdY = getSd(yArr, avgY);
    if (isNaN(avgX) || isNaN(avgY) || isNaN(sdX) || isNaN(sdY)) {
      // do not display
    } else {
      $("#mean-x").text("Mean x: " + avgX + " | ");
      $("#mean-y").text("Mean y: " + avgY + " | ");
      $("#sd-x").text("Standard deviation x: " + sdX + " | ");
      $("#sd-y").text("Standard deviation y: " + sdY);
    }
  }

  /* Check if OPTION is the population count. */
  function notPopulation(str) {
    let arr = str.split(/[ ,]+/);
    if (arr.length === 2 && arr[0] === "Person" && arr[1] === "count") {
      return false;
    } else {
      return true;
    }
  }

  /**
   * Checks to see if a number should be divided by the population.
   * The function checkLessThanOne(...) guarantees that x, y, and p are >= 1
   * if measuredProp = "count"
   * @param{number} num The x or y value
   * @param{number} p The population
   * @param{string} option Either OPTION1 or OPTION2
   * @return{number} Returns either the original number or the per capita/
   */
  function getPerCapita(num, p, option) {
    if (getMeasuredProp(option) === "count" && notPopulation(option)) {
      return num / p;
    } else {
      return num;
    }
  }

  /**
   * Divides x and y by the population to get per capita for a location.
   * @param{number} x The value for the x axis
   * @param{number} y The value for the y axis
   * @param{number} p The population
   * @param{string} name Name of the location
   * @return{?Array} An array containing the points and location label
   */
  function getPerCapitaDatapoint(x, y, p, name) {
    x = getPerCapita(x, p, OPTION1);
    y = getPerCapita(y, p, OPTION2);
    if (SWAP) {
      let pointLabel = name + " (" + y + "," + x + ")";
      return [y, x, pointLabel];
    } else {
      let pointLabel = name + " (" + x + "," + y + ")";
      return [x, y, pointLabel];
    }
  }

  /**
   * If measuredProperty is count, then the measuredValue should be >= 1
   * @param{number} variable x, y, or p
   * @param{string} measuredProp count, age, unemploymentRate, etc
   * @return{boolean}
   */
  function checkLessThanOne(variable, measuredProp) {
    if (measuredProp === "count" && variable < 1) {
      return 1;
    } else {
      return variable;
    }
  }

  /**
   * Format all the labels and chart parameters, then draw the chart.
   * @param{string} OPTION1 First option selected by user
   * @param{string} OPTION2 Second option selected by user
   * @param{?Object} geoDictX Contains values for all locations
   * @param{?Object} geoDictY Contains values for all locations
   * @param{?Object} geoDictPop Contains population count for all locations
   * @param{?rray<string>} locations Contains the geoIds to plot
   */
  function drawScatter(
    OPTION1,
    OPTION2,
    geoDictX,
    geoDictY,
    geoDictPop,
    locations
  ) {
    let xlabel = "";
    let ylabel = "";
    let title = "";
    let xleg = "";
    let yleg = "";

    // used to hold values for mean and sd calculations
    let xArr = [];
    let yArr = [];

    let datapoints = []; // each element is a point [x,y,name]

    // Create an array that can be converted to CSV
    let downloadArr = []; // an array of arrays with [location name, x, y]

    let numDropped = 0;

    if (locations.length > 0) {
      // Create clean labels for the axes and legend
      xlabel = cleanedLabel(OPTION1);
      ylabel = cleanedLabel(OPTION2);
      xleg = cleanedLabelNoUnits(OPTION1);
      yleg = cleanedLabelNoUnits(OPTION2);
      title = xleg + " vs " + yleg;
      hObj = { title: cleanedLabel(OPTION1) };
      vObj = { title: cleanedLabel(OPTION2) };

      downloadArr.push(["Location", xlabel, ylabel]);

      if (SWAP) {
        title = yleg + " vs " + xleg;
      }
      if (LOGX) {
        hObj = { title: cleanedLabel(OPTION1), scaleType: "log" };
      }
      if (LOGY) {
        vObj = { title: cleanedLabel(OPTION2), scaleType: "log" };
      }

      for (let locationId of locations) {
        // make sure locations are present
        if (
          typeof geoDictX[locationId] !== "undefined" &&
          typeof geoDictY[locationId] !== "undefined"
        ) {
          // make sure values are present
          if (
            typeof geoDictX[locationId]["value"] !== "undefined" &&
            typeof geoDictY[locationId]["value"] !== "undefined" &&
            typeof geoDictPop[locationId]["value"] !== "undefined"
          ) {
            let x = geoDictX[locationId]["value"];
            let y = geoDictY[locationId]["value"];
            let p = geoDictPop[locationId]["value"]; // population
            let location = geoDictX[locationId]["name"];

            // If the measuredProp = "count":
            // If number is < 1, round to 1 since log(1) = 0
            x = checkLessThanOne(x, getMeasuredProp(OPTION1));
            y = checkLessThanOne(y, getMeasuredProp(OPTION2));
            p = checkLessThanOne(p, "count");

            if (p > MIN_POP && p < MAX_POP) {
              if (PER_CAPITA) {
                downloadArr.push([
                  location,
                  getPerCapita(x, p, OPTION1),
                  getPerCapita(y, p, OPTION2),
                ]);
              } else {
                downloadArr.push([location, x, y]);
              }

              if (SWAP && PER_CAPITA) {
                // datapoint = [y/p,x/p,name]
                let point = getPerCapitaDatapoint(x, y, p, location);
                datapoints.push(point);
                xArr.push(point[0]);
                yArr.push(point[1]);
              } else if (SWAP) {
                // datapoint = [y,x,name]
                let pointLabel = location + " (" + y + "," + x + ")";
                datapoints.push([y, x, pointLabel]);
                xArr.push(y);
                yArr.push(x);
              } else if (PER_CAPITA) {
                // datapoint = [x/p,y/p,name]
                let point = getPerCapitaDatapoint(x, y, p, location);
                datapoints.push(point);
                xArr.push(point[0]);
                yArr.push(point[1]);
              } else {
                // neither swap nor per capita,
                // datapoint = [x,y,name]
                let pointLabel = location + " (" + x + "," + y + ")";
                datapoints.push([x, y, pointLabel]);
                xArr.push(x);
                yArr.push(y);
              }
            } else {
              numDropped += 1;
            }
          }
        }
      }

      // clear text if number of datapoints dropped stays 0
      if (PREV_DROPPED === 0 && numDropped === 0) {
        $("#dropped").text("");
      } else {
        $("#dropped").text("Number of datapoints dropped: " + numDropped);
        PREV_DROPPED = numDropped;
      }

      DOWNLOAD_ARR = downloadArr;
      displayCalc(xArr, yArr); // display the means and standard deviations
    }

    // Call draw chart
    google.charts.load("current", { packages: ["corechart"] });
    if (SWAP) {
      google.charts.setOnLoadCallback(function () {
        drawChart(yleg, xleg, vObj, hObj);
      });
    } else {
      google.charts.setOnLoadCallback(function () {
        drawChart(xleg, yleg, hObj, vObj);
      });
    }

    /**
     * Draw the chart.
     * @param{string} xleg Legend for the x axis
     * @param{string} yleg Legend for the y axis
     * @param{?Object} hObj Object containing options for the hAxis
     * @param{?Object} vObj Object containing options for the vAxis
     */
    function drawChart(xleg, yleg, hObj, vObj) {
      loadSpinner();
      setTimeout(function () {
        let dataTable = new google.visualization.DataTable();
        dataTable.addColumn("number", xleg);
        dataTable.addColumn("number", yleg);
        // A column for custom tooltip content
        dataTable.addColumn({ type: "string", role: "tooltip" });
        dataTable.addRows(datapoints);
        let options = {
          title: title,
          hAxis: hObj,
          vAxis: vObj,
          legend: {
            position: "right",
            maxLines: 7,
            textStyle: { fontSize: 12 },
          },
          chartArea: { width: "40%" },
          dataOpacity: 0.6,
        };
        if (ENABLE_REGRESSION) {
          options["trendlines"] = {
            0: {
              showR2: true,
              visibleInLegend: true,
            }, // Draw a trendline for data series 0.
          };
        }
        let chart = new google.visualization.ScatterChart(
          document.getElementById("chart_div")
        );
        chart.draw(dataTable, options);
        removeSpinner();
      }, 1);
    }
  }
});
