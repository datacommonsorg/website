#!/usr/bin/python
import json
try:
  # For Python 3.0 and later
  from urllib.request import urlopen
except ImportError:
  # Fall back to Python 2's urllib2
  from urllib2 import urlopen

jf = urlopen('https://raw.githubusercontent.com/datacommonsorg/website/master/server/chart_config.json')

js = json.loads(jf.read())

print('MainStatVar,DenominatorStatVar')
for e in js:
  for s in e['statsVars']:
    if 'relatedChart' in e:
      if 'denominator' in e['relatedChart']:
        print(s + ',' + e['relatedChart']['denominator'])
  continue

  if 'denominator' in e:
    for m, d in zip(e['statsVars'], e['denominator']):
      print(m + ',' + d)
