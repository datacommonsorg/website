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

"""Simplifies GeoJson files by reducing their number of vertices.

    Typical usage:
    python3 simplify.py --in_path original-data/geoId-01.geojson
                        --out_path simplified-data/geoId-01-simple.geojson
                        --verbose
"""

from rdp import rdp
import geojson
from absl import app
from absl import flags


FLAGS = flags.FLAGS
flags.DEFINE_string('in_path', default=None,
                    help='Path to original geojson to simplify.')
flags.DEFINE_string('out_path', default=None,
                    help='Path to save simplified geojson.')
flags.DEFINE_boolean('verbose', default=False,
                     help='If True, compression information is printed.')
flags.DEFINE_float('epsilon', default=0.01,
                   help='Epsilon parameter to the Ramer–Douglas–Peucker '
                        'algorithm. For more information, see the Wikipedia'
                        ' page.')


class GeojsonSimplifier:
    def __init__(self):
        self.raw_geojson = None
        self.simple_geojson = None

    def read_geojson(self, in_path):
        with open(in_path, 'r') as f:
            self.raw_geojson = geojson.load(f)

    def simplify(self, epsilon=0.01, verbose=False):
        self.simple_geojson = self.raw_geojson.copy()
        coords = self.simple_geojson['coordinates']

        original_sz = sum([len(coords[i][0]) for i in range(len(coords))])
        if verbose:
            print(f"Original number of points = {original_sz}.")

        for i in range(len(coords)):
            assert len(coords[i]) == 1
            c = coords[i][0]
            new_c = rdp(c, epsilon=0.01)
            if len(new_c) >= 3:
                coords[i][0] = new_c

        simplified_sz = sum([len(coords[i][0]) for i in range(len(coords))])
        if verbose:
            print(f"Simplified number of points = {simplified_sz}.")

    def save(self, out_path):
        with open(out_path, 'w') as f:
            geojson.dump(self.simple_geojson, f)


def main(_):
    flags.mark_flag_as_required('in_path')
    flags.mark_flag_as_required('out_path')
    simplifier = GeojsonSimplifier()
    simplifier.read_geojson(FLAGS.in_path)
    simplifier.simplify(FLAGS.epsilon, FLAGS.verbose)
    simplifier.save(FLAGS.out_path)


if __name__ == '__main__':
    app.run(main)
