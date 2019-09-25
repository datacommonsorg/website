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

import {
  dcidToPlaceType,
  getUrlVars,
  setSearchParam,
} from './dc.js';


/*
* Add or remove point of view under chart upon selection of menu item
*/
function togglePV(argStr) {
  let vars = getUrlVars();
  let ptpv = []
  if ('ptpv' in vars) {
    ptpv = vars['ptpv'].split('__');

    if (ptpv.includes(argStr)) {
      ptpv.splice(ptpv.indexOf(argStr), 1);
    } else {
      ptpv.push(argStr);
    }
  } else {
    ptpv.push(argStr);
  }

  if (ptpv.length == 0) {
    delete vars['ptpv'];
  } else {
    vars['ptpv'] = ptpv.join('__');
  }
  setSearchParam(vars);
}

function initMenu(exploreTypeVars, urlParams) {
  let menuContainer = document.querySelector('#drill');
  let selectedOptionList = urlParams.ptpv ? urlParams.ptpv.split('__') : [];
  let search = window.location.href.includes('search');
  let place_types = new Set();
  if ('place' in urlParams) {
    for (let dcid of urlParams['place'].split(',')) {
      let pt = dcidToPlaceType(dcid);
      if (pt) {
        place_types.add(pt);
      }
    }
  }

  let clean = (str) => {
    return str.replace(' ', '-');
  };

  let categoryList = Object.keys(exploreTypeVars);
  let traverse = (node, parentElement) => {
    let showIfSelectedOption = (argString) => {
      if (selectedOptionList.includes(argString)) {
        let ulParent = parentElement.closest('.unordered-list');
        let arrowElement =
          ulParent.previousSibling.querySelector('.right-caret');
        if (!arrowElement.classList.contains('transform-down')) {
          arrowElement.classList.toggle('transform-down');
        }
        while (ulParent !== null) {
          ulParent.classList.remove('hidden');
          ulParent.classList.remove('collapsed');
          ulParent = ulParent.parentElement.closest('.unordered-list');
        }
        document.getElementById(`checkbox-${argString}`).classList.add('checked');
      }
    };
    if (place_types.size > 0 && node['placeTypes'] && node['placeTypes'].length > 0) {
      let validNode = false;
      for (let p of place_types) {
        if (node['placeTypes'].includes(p)) {
          validNode = true;
          break;
        }
      }
      if (!validNode) {
        return;
      }
    }
    if (node.type.toLowerCase() === 'property') {
      let html;

      // Create li element
      let listItem = document.createElement('li');
      listItem.classList.add('parent');
      listItem.id = clean(node.title);

      if (node.children.length > 0) {
        let for_search = '';
        if (search && node.search_count > 1) {
          for_search = 'for-search';
        }
        html = `<span>
              <a class="expand-link ${for_search}">
                ${node.title}<sup>(${node.count})</sup>`;
        if (search) {
          html += `<sup>(${node.search_count})</sup>`;
        }
        html += `<img class="right-caret" width="12px"
              src="images/right-caret.png"/>
              </a>
            </span>`;
      } else {
        html = `<span>${node.title}</span>`;
      }
      listItem.innerHTML = html;

      // Append to parent container
      parentElement.appendChild(listItem);

      // Create and append ul element that will contain children
      let unorderedListItem = document.createElement('ul');
      unorderedListItem.classList.add('unordered-list');
      unorderedListItem.classList.add('hidden');
      unorderedListItem.classList.add('collapsed');
      parentElement.appendChild(unorderedListItem);

      // Traverse children
      let children2 = node.children;
      children2.sort((a, b) => a["num"] - b["num"]);

      children2.forEach((child) => {
        traverse(child, unorderedListItem);
      });
    } else if (node.type.toLowerCase() === 'value') {
      let html;

      // Create li element
      let listItem = document.createElement('li');
      listItem.classList.add('value');
      listItem.id = clean(node.title);

      let for_search = '';
      if (search && node.search_count > 0) {
        for_search = 'for-search';
      }
      html = `<span>
                  <a id="${node.argString}" class="value-link ${for_search}"
                    data-argstring="${node.argString}">
                    ${node.title}
                    <button id="checkbox-${
        node.argString}" class="checkbox"></button>
                  </a>
                </span>`;
      if (node.children.length > 0) {
        html += `<sup>(${node.count})</sup>`;
        if (search) {
          html += `<sup>(${node.search_count})</sup>`;
        }
        html += `<a class="expand-link">
                    <img class="right-caret" width="12px" src="images/right-caret.png" />
                   </a>`;
      }
      listItem.innerHTML = html;

      // Append to parent container
      parentElement.appendChild(listItem);

      // If this is a selected option, show the tree leading up to here
      showIfSelectedOption(node.argString);

      // Create and append ul element that will contain children
      let unorderedListItem = document.createElement('ul');
      unorderedListItem.classList.add('unordered-list');
      unorderedListItem.classList.add('hidden');
      unorderedListItem.classList.add('collapsed');
      parentElement.appendChild(unorderedListItem);

      // Traverse children
      node.children.forEach((child) => {
        traverse(child, unorderedListItem);
      });
    }
  };

  let toggleChildren = (evt) => {
    // Show children
    let children = evt.target.closest('li').nextSibling;
    if (children) {
      children.classList.toggle('hidden');
      setTimeout(() => {
        children.classList.toggle('collapsed');
      }, 0);
    }

    evt.currentTarget.querySelector('.right-caret').classList.toggle('transform-down');
  };

  let toggleChartPOV = (evt) => {
    if (evt.target.classList.contains('checkbox')) {
      evt.target.classList.toggle('checked');
    } else if (evt.target.classList.contains('value-link')) {
      evt.target.querySelector('.checkbox').classList.toggle('checked');
    }
    window.evtmap[evt.currentTarget.dataset.argstring] = evt;
    // Toggle this POV in the chart
    togglePV(evt.currentTarget.dataset.argstring);
  };

  categoryList.forEach((category) => {
    if (category && exploreTypeVars[category]['children'].length > 0) {
      traverse(exploreTypeVars[category], menuContainer);
    }
  });

  document.querySelectorAll('#drill .expand-link').forEach((item) => {
    item.addEventListener('click', toggleChildren);
  });

  document.querySelectorAll('#drill .value-link').forEach((item) => {
    item.addEventListener('click', toggleChartPOV);
  });
}

export {
  initMenu
}