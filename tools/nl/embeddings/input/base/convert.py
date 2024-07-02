import csv
from pathlib import Path
from typing import Dict, List

from absl import app
from absl import flags
from ruamel.yaml import YAML

_COL_DCID = 'dcid'
_COL_SENTENCE = 'sentence'

FLAGS = flags.FLAGS

flags.DEFINE_string('input_file', '', 'The input csv file path')

yaml = YAML()
yaml.indent(mapping=3, sequence=2,
            offset=0)  # sequence and offset have their default values here
yaml.preserve_quotes = True
yaml.width = 800  # this is the output line width after which wrapping occurs


def main(_):
  file_name = FLAGS.input_file
  sv2texts: Dict[str, List[str]] = {}

  with open(file_name) as f:
    reader = csv.DictReader(f)
    for row in reader:
      texts = row[_COL_SENTENCE].split(';')
      sv2texts[row[_COL_DCID]] = sorted(texts)

  with open(Path(file_name).stem + '.yaml', 'w') as f:
    yaml.dump(sv2texts, f)


if __name__ == "__main__":
  app.run(main)
