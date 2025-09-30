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

import asyncio
import unittest
from unittest.mock import AsyncMock, MagicMock

from google.genai import types
from tools.nl.nl_metadata import gemini_service
from tools.nl.nl_metadata.schemas import GeminiResponseItem


class TestGeminiService(unittest.TestCase):

  def test_generate_alt_sentences_success(self):

    async def run_test():
      # Arrange
      mock_gemini_client = MagicMock()
      mock_response = MagicMock()
      mock_response.parsed = [
          GeminiResponseItem(dcid="dcid1",
                             generatedSentences=["alt 1", "alt 2"]),
          GeminiResponseItem(dcid="dcid2",
                             generatedSentences=["alt 3", "alt 4"]),
      ]
      mock_gemini_client.aio.models.generate_content = AsyncMock(
          return_value=mock_response)

      sv_metadata = [
          {
              'dcid': 'dcid1',
              'name': 'Name 1'
          },
          {
              'dcid': 'dcid2',
              'name': 'Name 2'
          },
      ]
      gemini_config = types.GenerateContentConfig()

      # Act
      result = await gemini_service.generate_alt_sentences(
          mock_gemini_client, gemini_config, "prompt", sv_metadata, delay=0)

      # Assert
      expected = [{
          'dcid': 'dcid1',
          'name': 'Name 1',
          'generatedSentences': ["alt 1", "alt 2"]
      }, {
          'dcid': 'dcid2',
          'name': 'Name 2',
          'generatedSentences': ["alt 3", "alt 4"]
      }]
      self.assertEqual(result, expected)
      self.assertIsNot(result, sv_metadata)  # Ensure it's a new list

    asyncio.run(run_test())

  def test_generate_alt_sentences_mismatched_length(self):

    async def run_test():
      # Arrange
      mock_gemini_client = MagicMock()
      mock_response = MagicMock()
      mock_response.parsed = [
          GeminiResponseItem(dcid="dcid1",
                             generatedSentences=["alt 1", "alt 2"]),
      ]  # Only one result for two inputs
      mock_gemini_client.aio.models.generate_content = AsyncMock(
          return_value=mock_response)

      sv_metadata = [
          {
              'dcid': 'dcid1',
              'name': 'Name 1'
          },
          {
              'dcid': 'dcid2',
              'name': 'Name 2'
          },
      ]
      gemini_config = types.GenerateContentConfig()

      # Act
      # The function should merge the results for the items that have a DCID.
      result = await gemini_service.generate_alt_sentences(
          mock_gemini_client, gemini_config, "prompt", sv_metadata, delay=0)

      # Assert
      expected = [
          {
              'dcid': 'dcid1',
              'name': 'Name 1',
              'generatedSentences': ['alt 1', 'alt 2']
          },
          {
              'dcid': 'dcid2',
              'name': 'Name 2',
              'generatedSentences': None
          },
      ]
      self.assertEqual(result, expected)

    asyncio.run(run_test())

  def test_generate_alt_sentences_null_sentences(self):

    async def run_test():
      # Arrange
      mock_gemini_client = MagicMock()
      mock_response = MagicMock()
      mock_response.parsed = [
          GeminiResponseItem(dcid="dcid1",
                             generatedSentences=["alt 1", "alt 2"]),
          GeminiResponseItem(dcid="dcid2", generatedSentences=None),
      ]
      mock_gemini_client.aio.models.generate_content = AsyncMock(
          return_value=mock_response)

      sv_metadata = [
          {
              'dcid': 'dcid1',
              'name': 'Name 1'
          },
          {
              'dcid': 'dcid2',
              'name': 'Name 2'
          },
      ]
      gemini_config = types.GenerateContentConfig()

      # Act
      result = await gemini_service.generate_alt_sentences(
          mock_gemini_client, gemini_config, "prompt", sv_metadata, delay=0)

      # Assert
      expected = [
          {
              'dcid': 'dcid1',
              'name': 'Name 1',
              'generatedSentences': ["alt 1", "alt 2"]
          },
          {
              'dcid': 'dcid2',
              'name': 'Name 2',
              'generatedSentences': None
          },
      ]
      self.assertEqual(result, expected)

    asyncio.run(run_test())

  def test_generate_alt_sentences_api_error(self):

    async def run_test():
      # Arrange
      mock_gemini_client = MagicMock()
      mock_gemini_client.aio.models.generate_content = AsyncMock(
          side_effect=Exception("API Error"))

      sv_metadata = [
          {
              'dcid': 'dcid1',
              'name': 'Name 1'
          },
      ]
      gemini_config = types.GenerateContentConfig()

      # Act
      result = await gemini_service.generate_alt_sentences(
          mock_gemini_client, gemini_config, "prompt", sv_metadata, delay=0)

      # Assert
      self.assertEqual(
          result, sv_metadata
      )  # Should return original metadata on failure
      # Check if it retried
      self.assertEqual(mock_gemini_client.aio.models.generate_content.call_count,
                       3)  # From config.MAX_RETRIES

    asyncio.run(run_test())

  def test_generate_alt_sentences_empty_input(self):

    async def run_test():
      # Arrange
      mock_gemini_client = MagicMock()
      sv_metadata = []
      gemini_config = types.GenerateContentConfig()

      # Act
      result = await gemini_service.generate_alt_sentences(
          mock_gemini_client, gemini_config, "prompt", sv_metadata, delay=0)

      # Assert
      self.assertEqual(result, [])
      mock_gemini_client.aio.models.generate_content.assert_not_called()

    asyncio.run(run_test())
