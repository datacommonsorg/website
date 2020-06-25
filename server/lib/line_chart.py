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

"""Library to build SVG of a line chart."""
import cgi
import io
import logging
import attr
import lib.coordinate_calculator as cc


_LINE_COLOR = '#f1f1f1'
_TICK_COLOR = '#80868b'
_TICK_FONT = 11
_TITLE_FONT = 18
_SUBTITLE_FONT = 15
_MIN_PLOT_WIDTH = 300
_X_MARGIN = 35
_Y_MARGIN = 20
_X_TICK_Y1 = 7
_X_TICK_Y2 = 18
_TITLE_HEIGHT = 30
_SUBTITLE_HEIGHT = 25
_DASH_LEGEND_LEN = 30
_DASH_LEGEND_MARGIN = 40
_LEGEND_CHAR_WIDTH = 7.5  # Approximate char width in legend
_LEGEND_MARGIN = 15
_LEGEND_FONT = 14
_LEGEND_COLOR = '#80868b'


@attr.s
class Line(object):
  points = attr.ib()
  color = attr.ib()
  style = attr.ib(default='')
  dom_id = attr.ib(default='')


@attr.s
class Legend(object):
  color = attr.ib()
  text = attr.ib()
  style = attr.ib(default='')


def build_title(title):
  """Builds the title component.

  Args:
    title: The title text.

  Returns:
    An XML string representation of the title component.
  """
  if title:
    return (
        '<g class="dcl-title"><text x="{}" y="{}" font-size="{}">{}'
        '</text></g>\n'
        .format(_X_MARGIN, _TITLE_HEIGHT, _TITLE_FONT, cgi.escape(title)))
  return ''


def build_subtitle(subtitles, title_h):
  """Builds the subtitle component.

  Args:
    subtitles: List of up to two lines of subtitle text.
    title_h: The height of title. Used for determining y-position.

  Returns:
    An XML string representation of the subtitle component.
  """
  component = ''
  nlines = len(subtitles)
  if nlines > 2:
    raise ValueError('Maximum allowed subtitle lines = 2.')
  for i in range(nlines):
    if subtitles[i]:  # make sure not empty
      component += ('<g class="dcl-title"><text x="{}" y="{}" font-size="{}">{}'
                    '</text></g>\n').format(
                        _X_MARGIN, title_h + (i + 1) * _SUBTITLE_HEIGHT,
                        _SUBTITLE_FONT, cgi.escape(subtitles[i]))
  return component


def build_legend(legends, x):
  """Builds the legend component.

  Args:
    legends: A list of Legend object.
    x: The x position of the legend.

  Returns:
    An XML string representation of the legend component.
  """
  if not legends:
    return ''
  textbuffer = io.StringIO()
  print(
      '<g class="dcl-chart" transform="translate({}, {})">'.format(
          x, _TITLE_HEIGHT),
      file=textbuffer)
  for i, legend in enumerate(legends):
    print(
        '<g transform="translate(0, {})">'
        '<line stroke="{}" stroke-width="2" stroke-dasharray="{}" '
        'x1="0" y1="16" x2="{}" y2="16"></line>'
        '<text x="{}" y="0" dy="20" font-size="{}" fill="{}">{} '
        '</text></g>'.format(i * 20, legend.color, legend.style,
                             _DASH_LEGEND_LEN,
                             _DASH_LEGEND_MARGIN, _LEGEND_FONT, _LEGEND_COLOR,
                             cgi.escape(legend.text)),
        file=textbuffer,
        end='')
  print('</g>', file=textbuffer)
  return textbuffer.getvalue()


def build_xtick(tick_data):
  """Builds the svg for x tick component.

  Args:
    tick_data: A list of tuples of (x_position, y_position, text).

  Returns:
    An XML string representation of the x tick component.
  """
  textbuffer = io.StringIO()
  print('<g class="dcl-chart">', file=textbuffer)
  for x, y, text in tick_data:
    print(
        '<line x1="{x}" y1="{y}" x2="{x}" y2="{y2}" '
        'stroke="{stroke}" stroke-width="1"></line>'
        '<text x="{x}" y="{text_y}" class="label" '
        'style="text-anchor: middle" font-size="{fs}" '
        'fill="{fill}">{text}</text>'.format(
            x=x,
            y=y,
            y2=y + _X_TICK_Y1,
            text_y=y + _X_TICK_Y2,
            fs=_TICK_FONT,
            stroke=_LINE_COLOR,
            fill=_TICK_COLOR,
            text=text),
        file=textbuffer)
  print('</g>', file=textbuffer)
  return textbuffer.getvalue()


def build_ytick(tick_data, w, is_percent):
  """Builds the svg for y tick component.

  Args:
    tick_data: A list of tuples of (x_position, y_position, text).
    w: chart width
    is_percent: whether the value is percent measure.

  Returns:
    An XML string representation of the y tick component.
  """
  textbuffer = io.StringIO()
  print('<g class="dcl-chart">', file=textbuffer)
  for x, y, _ in tick_data:
    print(
        '<line x1="{}" y1="{}" x2="{}" y2="{}" '
        'stroke="{}" stroke-width="1"></line>'.format(_X_MARGIN, y, w, y,
                                                      _LINE_COLOR),
        file=textbuffer)

  for x, y, text in tick_data:
    print(
        '<text x="{}" y="{}" '
        'class="label" font-size="{}" '
        'style="text-anchor: end; dominant-baseline: central;" '
        'fill="{}">{}{}</text>\n'.format(x, y, _TICK_FONT, _TICK_COLOR, text,
                                         '%' if is_percent else ''),
        file=textbuffer,
        end='')
  print('</g>', file=textbuffer)
  return textbuffer.getvalue()


def build_path(path_data, lines):
  """Builds an SVG component for line paths.

  Args:
    path_data: A list of list of pairs of (x_position, y_position).
    lines: A list of Line objects.

  Returns:
    An XML string representation of the SVG component.
  """
  textbuffer = io.StringIO()
  for path, line in zip(path_data, lines):
    print('<path d="', file=textbuffer, end='')
    # Draw the line.
    for i, (x, y) in enumerate(path):
      command = ('M' if i == 0 else 'L')
      print('{} {} {} '.format(command, x, y), file=textbuffer, end='')

    print(
        '" stroke="{}" stroke-width="2" fill="none" '
        'stroke-dasharray="{}"'.format(line.color, line.style),
        file=textbuffer,
        end='')
    if line.dom_id:
      print(' id="{}"'.format(line.dom_id), file=textbuffer, end='')
    print('></path>', file=textbuffer)

  return textbuffer.getvalue()


def build_svg(lines,
              legends,
              w,
              h,
              title='',
              subtitle='',
              is_percent=False,
              dom_id=''):
  """Builds an SVG of a line chart.

  Args:
    lines: A list of Line objects.
    legends: A list of Legend object.
    w: The chart width.
    h: The chart height.
    title: The title text.
    subtitle: The subtitle text. Max 2 lines.
    is_percent: Boolean whether the line chart is percent measurement.
    dom_id: DOM ID of the chart.

  Returns:
    An XML string representation of the SVG chart.
  """
  if legends:
    num_chars = max([len(l.text) for l in legends])
    legend_width = _DASH_LEGEND_MARGIN + num_chars * _LEGEND_CHAR_WIDTH
  else:
    legend_width = 0
  legend_span = legend_width + _LEGEND_MARGIN
  if w < legend_span:
    w = legend_span + _MIN_PLOT_WIDTH
  draw_width = w - legend_span
  xbound = (_X_MARGIN, draw_width)
  title_h = _TITLE_HEIGHT if title else 0
  subtitles = subtitle.split('\n')
  subtitle_h = _SUBTITLE_HEIGHT * len(subtitles) if subtitle else 0
  ybound = (_Y_MARGIN + title_h + subtitle_h, h - _Y_MARGIN)
  try:
    path_data, xtick_data, ytick_data = cc.compute(
        [line.points for line in lines], xbound, ybound)
    return ('<svg height="{h}px" width="{w}px" viewBox="0 0 {w} {h}" '
            'xmlns="http://www.w3.org/2000/svg" '
            'xmlns:xlink="http://www.w3.org/1999/xlink"{dom_id_str}>\n'
            '<style>.dcl-chart text, .dcl-title '
            '{{ font-family: roboto; }}</style>'
            '\n{title}{subtitle}{xtick}{ytick}{path}{legend}</svg>'
            '\n').format(
                h=h,
                w=w,
                dom_id_str=(' id="{}"'.format(dom_id) if dom_id else ''),
                title=build_title(title),
                subtitle=build_subtitle(subtitles, title_h),
                xtick=build_xtick(xtick_data),
                ytick=build_ytick(ytick_data, draw_width, is_percent),
                path=build_path(path_data, lines),
                legend=build_legend(legends, w - legend_width))
  except ValueError as e:
    logging.error('build_svg got error "%s" with lines:\n%s.', e, lines)
    return ('<svg height="300px" width="300px" '
            'xmlns="http://www.w3.org/2000/svg" '
            'xmlns:xlink="http://www.w3.org/1999/xlink">\n'
            '<text x="30" y="30">No data found for the given parameters'
            '</text>\n</svg>\n')