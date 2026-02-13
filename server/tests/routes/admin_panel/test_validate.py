# Copyright 2025 Google LLC
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

import csv
import io
from io import BytesIO
import unittest

from server.routes.admin_panel.constants import DATE_YEAR
from server.routes.admin_panel.constants import INTEGER
from server.routes.admin_panel.constants import NUMBER
from server.routes.admin_panel.constants import OPTIONAL
from server.routes.admin_panel.constants import STRING
from server.routes.admin_panel.validate import _parse_schema
from server.routes.admin_panel.validate import _rows_to_bytesio
from server.routes.admin_panel.validate import _validate_row
from server.routes.admin_panel.validate import validate_csv
from server.routes.admin_panel.validate import ValidationResult
from werkzeug.datastructures import FileStorage


class TestValidationResult(unittest.TestCase):
  """Test ValidationResult dataclass properties."""

  def test_is_valid_true(self):
    result = ValidationResult()
    result.valid_rows_count = 5
    result.invalid_rows_count = 0
    result.header_valid = True
    assert result.is_valid is True

  def test_is_valid_false_invalid_rows(self):
    result = ValidationResult()
    result.valid_rows_count = 3
    result.invalid_rows_count = 2
    result.header_valid = True
    assert result.is_valid is False

  def test_is_valid_false_invalid_header(self):
    result = ValidationResult()
    result.valid_rows_count = 5
    result.invalid_rows_count = 0
    result.header_valid = False
    assert result.is_valid is False

  def test_total_rows(self):
    result = ValidationResult()
    result.valid_rows_count = 3
    result.invalid_rows_count = 2
    assert result.total_rows == 5

  def test_response_info(self):
    result = ValidationResult()
    result.valid_rows_count = 3
    result.invalid_rows_count = 2
    info = result.response_info
    assert info['total_rows'] == 5
    assert info['valid_rows_count'] == 3
    assert info['invalid_rows_count'] == 2


class TestParseSchema(unittest.TestCase):
  """Test _parse_schema function."""

  def test_parse_schema_simple(self):
    schema = {
        'col1': STRING,
        'col2': INTEGER,
    }
    parsed = _parse_schema(schema)
    assert parsed['col1'] == (STRING, True)
    assert parsed['col2'] == (INTEGER, True)

  def test_parse_schema_with_tuple(self):
    schema = {
        'col1': STRING,
        'col2': (NUMBER, OPTIONAL),
    }
    parsed = _parse_schema(schema)
    assert parsed['col1'] == (STRING, True)
    assert parsed['col2'] == (NUMBER, False)

  def test_parse_schema_mixed(self):
    schema = {
        'required_col': INTEGER,
        'optional_col': (STRING, OPTIONAL),
    }
    parsed = _parse_schema(schema)
    assert parsed['required_col'] == (INTEGER, True)
    assert parsed['optional_col'] == (STRING, False)


class TestValidateRow(unittest.TestCase):
  """Test _validate_row function."""

  def test_validate_row_all_valid(self):
    from server.routes.admin_panel.constants import TYPE_VALIDATORS
    schema = {
        'dcid': (STRING, True),
        'value': (NUMBER, True),
    }
    row = {'dcid': 'geoId/01', 'value': '123.45'}
    result = ValidationResult()
    valid = _validate_row(row, schema, 1, result)
    assert valid is True
    assert len(result.errors) == 0

  def test_validate_row_missing_required(self):
    schema = {
        'dcid': (STRING, True),
        'value': (NUMBER, True),
    }
    row = {'dcid': 'geoId/01'}  # missing 'value'
    result = ValidationResult()
    valid = _validate_row(row, schema, 1, result)
    assert valid is False
    assert len(result.errors) == 1
    assert result.errors[0] == (1, 'value', 'Empty value')

  def test_validate_row_empty_optional(self):
    schema = {
        'dcid': (STRING, True),
        'value': (NUMBER, OPTIONAL),
    }
    row = {'dcid': 'geoId/01', 'value': ''}  # empty optional
    result = ValidationResult()
    valid = _validate_row(row, schema, 1, result)
    assert valid is True  # Empty optional values are valid
    assert len(result.errors) == 0

  def test_validate_row_invalid_type(self):
    schema = {
        'dcid': (STRING, True),
        'year': (DATE_YEAR, True),
    }
    row = {'dcid': 'geoId/01', 'year': '1800'}  # year out of range
    result = ValidationResult()
    valid = _validate_row(row, schema, 1, result)
    assert valid is False
    assert len(result.errors) == 1
    assert 'Invalid date_year' in result.errors[0][2]

  def test_validate_row_multiple_errors(self):
    schema = {
        'dcid': (STRING, True),
        'value': (NUMBER, True),
        'year': (DATE_YEAR, True),
    }
    row = {'dcid': '', 'value': 'abc', 'year': '1800'}  # multiple errors
    result = ValidationResult()
    valid = _validate_row(row, schema, 1, result)
    assert valid is False
    assert len(result.errors) == 3


class TestRowsToBytesIO(unittest.TestCase):
  """Test _rows_to_bytesio function."""

  def test_rows_to_bytesio_empty(self):
    rows = []
    headers = []
    result = _rows_to_bytesio(rows, headers)
    assert isinstance(result, BytesIO)
    content = result.read().decode('utf-8')
    assert content == ''

  def test_rows_to_bytesio_with_data(self):
    rows = [
        {
            'dcid': 'geoId/01',
            'value': '100'
        },
        {
            'dcid': 'geoId/02',
            'value': '200'
        },
    ]
    headers = ['dcid', 'value']
    result = _rows_to_bytesio(rows, headers)
    assert isinstance(result, BytesIO)
    content = result.read().decode('utf-8')
    lines = content.strip().split('\n')
    assert 'dcid,value' in lines[0]
    assert 'geoId/01,100' in lines[1]
    assert 'geoId/02,200' in lines[2]

  def test_rows_to_bytesio_preserves_order(self):
    rows = [
        {
            'col1': 'a',
            'col2': 'b'
        },
    ]
    headers = ['col1', 'col2']
    result = _rows_to_bytesio(rows, headers)
    content = result.read().decode('utf-8')
    assert content.startswith('col1,col2')


class TestValidateCSV(unittest.TestCase):
  """Test validate_csv function."""

  def test_validate_csv_empty_file(self):
    empty_file = BytesIO(b'')
    schema = {'dcid': STRING}
    result = validate_csv(empty_file, schema)
    assert result.header_valid is False
    assert len(result.errors) == 1
    assert result.errors[0][2] == 'CSV file is empty'
    assert result.is_valid is False

  def test_validate_csv_whitespace_only(self):
    empty_file = BytesIO(b'   \n  \t  ')
    schema = {'dcid': STRING}
    result = validate_csv(empty_file, schema)
    assert result.header_valid is False
    assert len(result.errors) == 1
    assert result.errors[0][2] == 'CSV file is empty'

  def test_validate_csv_missing_required_column(self):
    csv_content = 'name,value\ngeoId/01,100'
    csv_file = BytesIO(csv_content.encode('utf-8'))
    schema = {'dcid': STRING, 'value': NUMBER}
    result = validate_csv(csv_file, schema)
    assert result.header_valid is False
    assert len(result.errors) > 0
    assert any('dcid' in str(err) and 'Missing column' in str(err)
               for err in result.errors)

  def test_validate_csv_valid_data(self):
    csv_content = 'dcid,value,year\ngeoId/01,100,2020\ngeoId/02,200,2021'
    csv_file = BytesIO(csv_content.encode('utf-8'))
    schema = {
        'dcid': STRING,
        'value': NUMBER,
        'year': DATE_YEAR,
    }
    result = validate_csv(csv_file, schema)
    assert result.is_valid is True
    assert result.valid_rows_count == 2
    assert result.invalid_rows_count == 0
    assert len(result.errors) == 0

  def test_validate_csv_invalid_rows(self):
    csv_content = 'dcid,value,year\ngeoId/01,abc,2020\ngeoId/02,200,1800'
    csv_file = BytesIO(csv_content.encode('utf-8'))
    schema = {
        'dcid': STRING,
        'value': NUMBER,
        'year': DATE_YEAR,
    }
    result = validate_csv(csv_file, schema)
    assert result.is_valid is False
    assert result.valid_rows_count == 0
    assert result.invalid_rows_count == 2
    assert len(result.errors) == 2

  def test_validate_csv_partial_valid(self):
    csv_content = 'dcid,value,year\ngeoId/01,100,2020\ngeoId/02,abc,2021\ngeoId/03,300,2022'
    csv_file = BytesIO(csv_content.encode('utf-8'))
    schema = {
        'dcid': STRING,
        'value': NUMBER,
        'year': DATE_YEAR,
    }
    result = validate_csv(csv_file, schema)
    assert result.valid_rows_count == 2
    assert result.invalid_rows_count == 1
    # Should have valid CSV with only valid rows
    valid_csv_content = result.valid_csv.read().decode('utf-8')
    assert 'geoId/01,100,2020' in valid_csv_content
    assert 'geoId/03,300,2022' in valid_csv_content
    assert 'geoId/02' not in valid_csv_content or 'abc' not in valid_csv_content

  def test_validate_csv_optional_columns(self):
    csv_content = 'dcid,value,optional\ngeoId/01,100,\ngeoId/02,200,extra'
    csv_file = BytesIO(csv_content.encode('utf-8'))
    schema = {
        'dcid': STRING,
        'value': NUMBER,
        'optional': (STRING, OPTIONAL),
    }
    result = validate_csv(csv_file, schema)
    assert result.is_valid is True
    assert result.valid_rows_count == 2

  def test_validate_csv_with_file_storage(self):
    """Test with FileStorage object."""
    csv_content = 'dcid,value\ngeoId/01,100'
    file_storage = FileStorage(stream=BytesIO(csv_content.encode('utf-8')),
                               filename='test.csv',
                               content_type='text/csv')
    schema = {'dcid': STRING, 'value': NUMBER}
    result = validate_csv(file_storage, schema)
    assert result.is_valid is True
    assert result.valid_rows_count == 1

  def test_validate_csv_string_input(self):
    """Test with string input."""
    csv_content = 'dcid,value\ngeoId/01,100'
    csv_file = BytesIO(csv_content.encode('utf-8'))
    schema = {'dcid': STRING, 'value': NUMBER}
    result = validate_csv(csv_file, schema)
    assert result.is_valid is True

  def test_validate_csv_empty_rows(self):
    """Test CSV with only headers."""
    csv_content = 'dcid,value\n'
    csv_file = BytesIO(csv_content.encode('utf-8'))
    schema = {'dcid': STRING, 'value': NUMBER}
    result = validate_csv(csv_file, schema)
    assert result.valid_rows_count == 0
    assert result.invalid_rows_count == 0
    assert result.is_valid is True  # No rows to validate, but headers are valid

  def test_validate_csv_integer_validation(self):
    """Test INTEGER type validation."""
    csv_content = 'dcid,count\ngeoId/01,100\ngeoId/02,100.5'
    csv_file = BytesIO(csv_content.encode('utf-8'))
    schema = {'dcid': STRING, 'count': INTEGER}
    result = validate_csv(csv_file, schema)
    assert result.valid_rows_count == 1
    assert result.invalid_rows_count == 1
    assert any('Invalid integer' in str(err) for err in result.errors)

  def test_validate_csv_number_validation(self):
    """Test NUMBER type validation (accepts both int and float)."""
    csv_content = 'dcid,value\ngeoId/01,100\ngeoId/02,100.5\ngeoId/03,abc'
    csv_file = BytesIO(csv_content.encode('utf-8'))
    schema = {'dcid': STRING, 'value': NUMBER}
    result = validate_csv(csv_file, schema)
    assert result.valid_rows_count == 2
    assert result.invalid_rows_count == 1

  def test_validate_csv_date_year_validation(self):
    """Test DATE_YEAR type validation."""
    csv_content = 'dcid,year\ngeoId/01,2020\ngeoId/02,1800\ngeoId/03,abc'
    csv_file = BytesIO(csv_content.encode('utf-8'))
    schema = {'dcid': STRING, 'year': DATE_YEAR}
    result = validate_csv(csv_file, schema)
    assert result.valid_rows_count == 1
    assert result.invalid_rows_count == 2

  def test_validate_csv_valid_csv_output(self):
    """Test that valid_csv contains only valid rows."""
    csv_content = 'dcid,value\ngeoId/01,100\ngeoId/02,abc\ngeoId/03,200'
    csv_file = BytesIO(csv_content.encode('utf-8'))
    schema = {'dcid': STRING, 'value': NUMBER}
    result = validate_csv(csv_file, schema)
    # Read the valid CSV
    result.valid_csv.seek(0)
    valid_content = result.valid_csv.read().decode('utf-8')
    # Should contain headers and valid rows only
    assert 'dcid,value' in valid_content
    assert 'geoId/01,100' in valid_content
    assert 'geoId/03,200' in valid_content
    # Should not contain invalid row
    lines = valid_content.strip().split('\n')
    assert len([l for l in lines if 'geoId/02' in l and 'abc' in l]) == 0


if __name__ == '__main__':
  unittest.main()
