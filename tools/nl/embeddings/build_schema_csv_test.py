# Copyright 2024 Google LLC
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
"""Tests for build_schema_csv.py."""

import csv
import os
import tempfile
import unittest
from absl import flags
from absl.testing import absltest

# Import the module to be tested. 
# Assuming this test is run from the repo root or with appropriate PYTHONPATH.
from website.tools.nl.embeddings import build_schema_csv

FLAGS = flags.FLAGS

class BuildSchemaCsvTest(absltest.TestCase):

  def setUp(self):
    super().setUp()
    self.test_dir = tempfile.TemporaryDirectory()
    self.mcf_path = os.path.join(self.test_dir.name, 'test.mcf')
    self.output_path = os.path.join(self.test_dir.name, 'output.csv')

  def tearDown(self):
    self.test_dir.cleanup()
    super().tearDown()

  def test_parse_mcf(self):
    content = """
Node: dcid:TestNode
typeOf: dcid:Class
name: "Test Node"
description: "A test node."

Node: dcid:TestProperty
typeOf: dcid:Property
name: "testProperty"
domainIncludes: dcid:TestNode
"""
    with open(self.mcf_path, 'w') as f:
      f.write(content)
    
    nodes = list(build_schema_csv.parse_mcf(self.mcf_path))
    self.assertLen(nodes, 2)
    
    self.assertEqual(nodes[0]['Node'], 'dcid:TestNode')
    self.assertEqual(nodes[0]['typeOf'], 'dcid:Class')
    self.assertEqual(nodes[0]['name'], 'Test Node')
    self.assertEqual(nodes[0]['description'], 'A test node.')

    self.assertEqual(nodes[1]['Node'], 'dcid:TestProperty')
    self.assertEqual(nodes[1]['typeOf'], 'dcid:Property')
    self.assertEqual(nodes[1]['name'], 'testProperty')

  def test_parse_mcf_multiple_files(self):
    mcf1 = os.path.join(self.test_dir.name, 'test1.mcf')
    mcf2 = os.path.join(self.test_dir.name, 'test2.mcf')
    
    with open(mcf1, 'w') as f:
      f.write("Node: dcid:Node1\ntypeOf: Class\n")
    with open(mcf2, 'w') as f:
      f.write("Node: dcid:Node2\ntypeOf: Class\n")
      
    nodes = list(build_schema_csv.parse_mcf(f"{mcf1},{mcf2}"))
    self.assertLen(nodes, 2)
    self.assertEqual(nodes[0]['Node'], 'dcid:Node1')
    self.assertEqual(nodes[1]['Node'], 'dcid:Node2')

  def test_main_logic(self):
    # This test simulates the logic in main() but we can't easily call main() 
    # because it parses flags. We can test the processing logic if we extract it,
    # or we can just set FLAGS and call main if we are careful.
    # For now, let's verify the processing logic by replicating the loop 
    # or by mocking FLAGS.
    
    content = """
Node: dcid:TestClass
typeOf: dcid:Class
name: "TestClass"
description: "A test class."

Node: dcid:TestEnum
typeOf: dcid:Class
subClassOf: dcid:Enumeration
name: "TestEnum"

Node: dcid:TestEnumValue
typeOf: dcid:TestEnum
name: "TestEnumValue"

Node: dcid:IgnoreMe
typeOf: dcid:SomethingElse
name: "IgnoreMe"
"""
    with open(self.mcf_path, 'w') as f:
      f.write(content)

    # Set flags
    FLAGS.schema_path = self.mcf_path
    FLAGS.output_path = self.output_path
    
    # Run main
    build_schema_csv.main([])
    
    # Check output
    self.assertTrue(os.path.exists(self.output_path))
    
    with open(self.output_path, 'r') as f:
      reader = csv.DictReader(f)
      rows = list(reader)
      
    # We expect TestClass, TestEnum (it is a Class subClassOf Enumeration), 
    # and TestEnumValue (typeOf TestEnum -> heuristic 'Enum' in type).
    # IgnoreMe should be ignored.
    
    # Wait, the heuristic for Enum value in the script is:
    # if 'Enum' in t: is_schema_node = True
    # TestEnumValue has typeOf: dcid:TestEnum, so it matches.
    
    self.assertLen(rows, 3)
    
    # Check CamelCase splitting
    # TestClass -> Test Class
    # TestEnum -> Test Enum
    # TestEnumValue -> Test Enum Value
    
    dcids = {row['dcid']: row['sentence'] for row in rows}
    
    self.assertIn('TestClass', dcids)
    self.assertIn('Test Class', dcids['TestClass']) 
    
    self.assertIn('TestEnum', dcids)
    self.assertIn('Test Enum', dcids['TestEnum'])
    
    self.assertIn('TestEnumValue', dcids)
    self.assertIn('Test Enum Value', dcids['TestEnumValue'])

if __name__ == '__main__':
  absltest.main()
