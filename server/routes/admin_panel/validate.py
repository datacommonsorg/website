"""CSV Validator - validates CSV files against a schema."""

import csv
from dataclasses import dataclass
from dataclasses import field
import io
from typing import BinaryIO

from werkzeug.datastructures import FileStorage

from .constants import TYPE_VALIDATORS


@dataclass
class ValidationResult:
  """Result of CSV validation."""
  valid_rows_count: int = 0
  invalid_rows_count: int = 0
  valid_csv: io.BytesIO = field(default_factory=io.BytesIO)
  errors: list[tuple[int, str, str]] = field(
      default_factory=list)  # (row, column, message)
  header_valid: bool = True

  @property
  def is_valid(self) -> bool:
    return self.invalid_rows_count == 0 and self.header_valid

  @property
  def total_rows(self) -> int:
    return self.valid_rows_count + self.invalid_rows_count

  @property
  def response_info(self) -> dict:
    return {
        'total_rows': self.total_rows,
        'valid_rows_count': self.valid_rows_count,
        'invalid_rows_count': self.invalid_rows_count
    }


def validate_csv(file: BinaryIO | FileStorage,
                 schema: dict) -> ValidationResult:
  """Validate CSV against a schema.
  
  Args:
    file: BytesIO, FileStorage, or any file-like object with read() and seek()
    schema: Column schema {column_name: type}. All columns are required.
  
  Returns:
    ValidationResult with valid/invalid counts and cleaned CSV as BytesIO
  """
  result = ValidationResult()

  # Parse CSV
  file.seek(0)
  raw = file.read()
  text = bytes(raw).decode('utf-8') if not isinstance(raw, str) else raw

  if not text.strip():
    result.header_valid = False
    result.errors.append((0, "", "CSV file is empty"))
    return result

  reader = csv.DictReader(io.StringIO(text))
  headers = reader.fieldnames or []
  rows = list(reader)

  # Parse schema to get type and required flag
  parsed_schema = _parse_schema(schema)

  # Validate headers (only required columns must exist)
  for col, (_, required) in parsed_schema.items():
    if required and col not in headers:
      result.header_valid = False
      result.errors.append((0, col, "Missing column"))

  # Validate rows
  valid_rows = []
  for i, row in enumerate(rows, start=1):
    if _validate_row(row, parsed_schema, i, result):
      valid_rows.append(row)

  result.valid_rows_count = len(valid_rows)
  result.invalid_rows_count = len(rows) - len(valid_rows)
  result.valid_csv = _rows_to_bytesio(valid_rows, headers)

  return result


def _parse_schema(schema: dict) -> dict:
  """Parse schema into {column: (type, required)} format."""
  parsed = {}
  for col, value in schema.items():
    if isinstance(value, tuple):
      col_type, required = value
    else:
      col_type, required = value, True
    parsed[col] = (col_type, required)
  return parsed


def _validate_row(row: dict, schema: dict, row_num: int,
                  result: ValidationResult) -> bool:
  """Validate a single row. Returns True if valid."""
  valid = True
  for col, (col_type, required) in schema.items():
    raw_value = row.get(col)
    value = (raw_value or "").strip()

    if not value:
      if required:
        result.errors.append((row_num, col, "Empty value"))
        valid = False
      # Skip type check for empty optional values
    elif not TYPE_VALIDATORS.get(col_type, lambda _: True)(value):
      result.errors.append((row_num, col, f"Invalid {col_type}: {value}"))
      valid = False

  return valid


def _rows_to_bytesio(rows: list[dict], headers: list[str]) -> io.BytesIO:
  """Convert rows to BytesIO CSV."""
  output = io.StringIO()
  if headers:
    writer = csv.DictWriter(output, fieldnames=headers)
    writer.writeheader()
    writer.writerows(rows)
  return io.BytesIO(output.getvalue().encode('utf-8'))
