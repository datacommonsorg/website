# Copyright 2020 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

t = '''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{{ width }}px" height="{{ height }}px" viewBox="0 0 {{ width }} {{ height }}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <style>
    .dcb-chart text, .dcb-title { font-family: sans-serif; }
    .dcb-chart text { font-size: 12px; }
  </style>

  {% if title %}
    <text class="dcb-title" x="60" y="{{ title_height }}" font-size="16">
      {{ title }}
    </text>
  {% endif %}
  {% if subtitle1 %}
    <text class="dcb-title" x="60" y="{{ title_height + subtitle1_height }}" font-size="14">
      {{ subtitle1 }}
    </text>
  {% endif %}
  {% if subtitle2 %}
    <text class="dcb-title" x="60" y="{{ title_height + subtitle1_height + subtitle2_height }}" font-size="14">
      {{ subtitle2 }}
    </text>
  {% endif %}

  <g class="dcb-chart" transform="translate(0, {{ title_height + subtitle1_height + subtitle2_height + margin }})">
    {% for d in data %}
      {% set rect_width = bar_area_width * d['val'] / values_max  %}
      <g class="dcb-row"
         transform="translate(0, {{ (bar_height + bar_vert_margin) * loop.index0 }})">
        <text x="{{ label_width - 9 }}"
              y="{{ bar_height / 2 }}"
              dy="0.35em"
              text-anchor="end"
              fill="#000">{{ d['name'] }}</text>
        <rect x="{{ label_width }}" y="0"
              width="{{ rect_width }}"
              height="{{ bar_height }}"
              fill="{{ colors[loop.index0] }}"></rect>
        {% set is_inside = rect_width > (bar_area_width / 2) %}
        <text y="{{ bar_height / 2 }}"
              dy="0.35em"
              {% if is_inside %}
                x="{{ rect_width + label_width - 10 }}"
                fill="{{ '#fff'  }}"
                text-anchor="end"
              {% else %}
                x="{{ rect_width + label_width + 10 }}"
                fill="{{ '#000' }}"
                text-anchor="start"
              {%endif %}>
          {% if d['val'] == 1.23456789 %}
            XXX
          {% endif %}
          {% if d['val'] != 1.23456789 %}
            {{ d['val']|int if d['val'] > 10 or d['val']|int == d['val'] else '%.4f' % d['val']}}
          {% endif %}
        </text>
      </g>
    {% endfor %}
  </g>
</svg>
'''