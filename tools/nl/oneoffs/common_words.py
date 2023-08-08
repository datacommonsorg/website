import codecs
import csv
import json

import requests

PLACES_URL = 'https://raw.githubusercontent.com/datacommonsorg/mixer/master/internal/store/files/WorldGeosForPlaceRecognition.csv'

WORDS_URLS = [
    'https://raw.githubusercontent.com/dariusk/corpora/master/data/words/common.json',
    'https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt'
]


def emit(filepath, words):
  emitted = set()
  with open(filepath, 'w') as fp:
    csvr = csv.DictReader(
        codecs.iterdecode(requests.get(PLACES_URL).iter_lines(), 'utf-8'))
    for row in csvr:
      for name in row['name'].split(','):
        name = name.lower()
        if name in words and name not in emitted:
          emitted.add(name)
          fp.write(f'{name}\n')
  print(f'{filepath} - {len(emitted)} emitted')


word_sets = [
    set(json.loads(requests.get(WORDS_URLS[0]).text)['commonWords']),
    set([
        s.strip()
        for s in requests.get(WORDS_URLS[1]).text.split('\n')
        if s.strip()
    ])
]

for i, wset in enumerate(word_sets):
  emit(f'/tmp/common_words_{i+1}.txt', word_sets[i])
