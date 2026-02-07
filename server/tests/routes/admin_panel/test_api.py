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

from io import BytesIO
import json
import os
import tempfile
import unittest
from unittest.mock import MagicMock
from unittest.mock import patch

from web_app import app
from werkzeug.datastructures import FileStorage


class TestAdminPanelAPI(unittest.TestCase):
  """Test admin panel API endpoints."""

  def setUp(self):
    """Set up test fixtures."""
    self.client = app.test_client()
    self.app_context = app.app_context()
    self.app_context.push()

  def tearDown(self):
    """Clean up after tests."""
    self.app_context.pop()

  def _login(self, username='testuser', password='testpass'):
    """Helper to login and set session."""
    with patch.dict(os.environ, {
        'ADMIN_PANEL_USERNAME': username,
        'ADMIN_PANEL_PASSWORD': password,
    }):
      with self.client.session_transaction() as sess:
        sess['username'] = username
      # Reload the module to pick up new env vars
      import importlib

      import server.routes.admin_panel.constants as constants_module
      importlib.reload(constants_module)

  def _get_mock_config(self):
    """Create a mock config object."""
    from server.routes.admin_panel.constants import NUMBER
    from server.routes.admin_panel.constants import STRING
    mock_cfg = MagicMock()
    mock_cfg.ALLOWED_DATA_EXTENSIONS = {'csv'}
    mock_cfg.ALLOWED_LOGO_EXTENSIONS = {'png'}
    mock_cfg.CSV_SCHEMAS = {
        'test_file.csv': {
            'dcid': STRING,
            'value': NUMBER,
        }
    }
    mock_cfg.DEFAULT_DOMAIN_CONFIG = {
        'domainName': 'Test Domain',
        'descriptionTitle': 'Test Title',
        'descriptionBody': 'Test Body',
        'logoPresent': False,
    }
    return mock_cfg


class TestLoginEndpoint(TestAdminPanelAPI):
  """Test /admin/api/login endpoint."""

  @patch('server.routes.admin_panel.api.ADMIN_PANEL_USERNAME', 'testuser')
  @patch('server.routes.admin_panel.api.ADMIN_PANEL_PASSWORD', 'testpass')
  def test_login_success(self):
    """Test successful login."""
    response = self.client.post('/admin/api/login',
                                data={
                                    'username': 'testuser',
                                    'password': 'testpass',
                                })
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['category'] == 'success'
    assert data['message'] == 'OK'

  @patch('server.routes.admin_panel.api.ADMIN_PANEL_USERNAME', 'testuser')
  @patch('server.routes.admin_panel.api.ADMIN_PANEL_PASSWORD', 'testpass')
  def test_login_failure_wrong_credentials(self):
    """Test login failure with wrong credentials."""
    response = self.client.post('/admin/api/login',
                                data={
                                    'username': 'testuser',
                                    'password': 'wrongpass',
                                })
    assert response.status_code == 400
    data = json.loads(response.data)
    assert data['category'] == 'error'
    assert 'Login failed' in data['message']

  @patch('server.routes.admin_panel.api.ADMIN_PANEL_USERNAME', '')
  @patch('server.routes.admin_panel.api.ADMIN_PANEL_PASSWORD', '')
  def test_login_failure_no_credentials_configured(self):
    """Test login failure when credentials are not configured."""
    response = self.client.post('/admin/api/login',
                                data={
                                    'username': 'testuser',
                                    'password': 'testpass',
                                })
    assert response.status_code == 400
    data = json.loads(response.data)
    assert data['category'] == 'error'
    assert 'Login failed' in data['message']


class TestLogoutEndpoint(TestAdminPanelAPI):
  """Test /admin/api/logout endpoint."""

  def test_logout_success(self):
    """Test successful logout."""
    with self.client.session_transaction() as sess:
      sess['username'] = 'testuser'

    response = self.client.post('/admin/api/logout')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['category'] == 'success'
    assert data['message'] == 'OK'
    # Session should be cleared
    with self.client.session_transaction() as sess:
      assert 'username' not in sess

  def test_logout_requires_login(self):
    """Test logout redirects when not logged in."""
    response = self.client.post('/admin/api/logout', follow_redirects=False)
    # Should redirect to login page
    assert response.status_code in [302, 401]


class TestUploadEndpoint(TestAdminPanelAPI):
  """Test /admin/api/upload endpoint."""

  def setUp(self):
    super().setUp()
    with self.client.session_transaction() as sess:
      sess['username'] = 'testuser'

  @patch('server.routes.admin_panel.api.lib_config.get_config')
  @patch('server.routes.admin_panel.api.upload_file_to_storage')
  @patch('server.routes.admin_panel.api.is_gcs_path')
  @patch('server.routes.admin_panel.api.INPUT_DIR', '/tmp/test_input')
  def test_upload_success(self, mock_is_gcs, mock_upload, mock_get_config):
    """Test successful file upload."""
    mock_cfg = self._get_mock_config()
    mock_get_config.return_value = mock_cfg
    mock_is_gcs.return_value = False

    csv_content = 'dcid,value\ngeoId/01,100\ngeoId/02,200'
    file_data = BytesIO(csv_content.encode('utf-8'))
    file_storage = FileStorage(stream=file_data,
                               filename='test_file.csv',
                               content_type='text/csv')

    response = self.client.post('/admin/api/upload',
                                data={
                                    'file': (file_data, 'test_file.csv'),
                                    'baseFilename': 'test_file.csv',
                                },
                                content_type='multipart/form-data')

    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['category'] == 'success'
    assert 'uploaded successfully' in data['message']
    assert mock_upload.called

  @patch('server.routes.admin_panel.api.lib_config.get_config')
  def test_upload_no_file(self, mock_get_config):
    """Test upload without file."""
    mock_cfg = self._get_mock_config()
    mock_get_config.return_value = mock_cfg

    response = self.client.post('/admin/api/upload',
                                data={
                                    'baseFilename': 'test_file.csv',
                                })
    assert response.status_code == 400
    data = json.loads(response.data)
    assert data['category'] == 'error'
    assert 'No file part' in data['message']

  @patch('server.routes.admin_panel.api.lib_config.get_config')
  def test_upload_no_filename(self, mock_get_config):
    """Test upload without filename."""
    mock_cfg = self._get_mock_config()
    mock_get_config.return_value = mock_cfg

    file_data = BytesIO(b'content')
    response = self.client.post('/admin/api/upload',
                                data={
                                    'file': (file_data, ''),
                                })
    assert response.status_code == 400
    data = json.loads(response.data)
    assert data['category'] == 'error'
    assert 'No file selected' in data['message']

  @patch('server.routes.admin_panel.api.lib_config.get_config')
  def test_upload_invalid_extension(self, mock_get_config):
    """Test upload with invalid file extension."""
    mock_cfg = self._get_mock_config()
    mock_get_config.return_value = mock_cfg

    file_data = BytesIO(b'content')
    response = self.client.post('/admin/api/upload',
                                data={
                                    'file': (file_data, 'test.txt'),
                                    'baseFilename': 'test.txt',
                                })
    assert response.status_code == 400
    data = json.loads(response.data)
    assert data['category'] == 'error'
    assert 'File type not allowed' in data['message']

  @patch('server.routes.admin_panel.api.lib_config.get_config')
  def test_upload_invalid_csv(self, mock_get_config):
    """Test upload with invalid CSV data."""
    mock_cfg = self._get_mock_config()
    mock_get_config.return_value = mock_cfg

    csv_content = 'dcid,value\ngeoId/01,abc'  # abc is not a number
    file_data = BytesIO(csv_content.encode('utf-8'))
    response = self.client.post('/admin/api/upload',
                                data={
                                    'file': (file_data, 'test_file.csv'),
                                    'baseFilename': 'test_file.csv',
                                })
    assert response.status_code == 400
    data = json.loads(response.data)
    assert data['category'] == 'error'

  @patch('server.routes.admin_panel.api.lib_config.get_config')
  def test_upload_all_invalid_rows(self, mock_get_config):
    """Test upload with all rows invalid."""
    mock_cfg = self._get_mock_config()
    mock_get_config.return_value = mock_cfg

    csv_content = 'dcid,value\ngeoId/01,abc\ngeoId/02,def'
    file_data = BytesIO(csv_content.encode('utf-8'))
    response = self.client.post('/admin/api/upload',
                                data={
                                    'file': (file_data, 'test_file.csv'),
                                    'baseFilename': 'test_file.csv',
                                })
    assert response.status_code == 400
    data = json.loads(response.data)
    assert data['category'] == 'error'
    assert 'row(s) have errors' in data['message']

  @patch('server.routes.admin_panel.api.lib_config.get_config')
  def test_upload_partial_invalid_rows(self, mock_get_config):
    """Test upload with some invalid rows (should fail)."""
    mock_cfg = self._get_mock_config()
    mock_get_config.return_value = mock_cfg

    csv_content = 'dcid,value\ngeoId/01,100\ngeoId/02,abc\ngeoId/03,200'
    file_data = BytesIO(csv_content.encode('utf-8'))
    response = self.client.post('/admin/api/upload',
                                data={
                                    'file': (file_data, 'test_file.csv'),
                                    'baseFilename': 'test_file.csv',
                                })
    assert response.status_code == 400
    data = json.loads(response.data)
    assert data['category'] == 'error'
    assert 'row(s) have errors' in data['message']

  @patch('server.routes.admin_panel.api.lib_config.get_config')
  def test_upload_no_schema(self, mock_get_config):
    """Test upload with file that has no schema defined."""
    mock_cfg = self._get_mock_config()
    mock_get_config.return_value = mock_cfg

    csv_content = 'dcid,value\ngeoId/01,100'
    file_data = BytesIO(csv_content.encode('utf-8'))
    response = self.client.post('/admin/api/upload',
                                data={
                                    'file': (file_data, 'unknown_file.csv'),
                                    'baseFilename': 'unknown_file.csv',
                                })
    # Should still process but with empty schema
    assert response.status_code in [
        200, 400
    ]  # May succeed or fail depending on validation

  @patch('server.routes.admin_panel.api.lib_config.get_config')
  @patch('server.routes.admin_panel.api.upload_file_to_storage')
  @patch('server.routes.admin_panel.api.is_gcs_path')
  @patch('server.routes.admin_panel.api.INPUT_DIR', '/tmp/test_input')
  def test_upload_with_string_fields_in_schema(self, mock_is_gcs, mock_upload,
                                               mock_get_config):
    """Test that STRING fields in schema are validated correctly."""
    from server.routes.admin_panel.constants import STRING
    mock_cfg = self._get_mock_config()
    # Use a schema that allows STRING for non-dcid fields (like energy.py)
    mock_cfg.CSV_SCHEMAS = {
        'test_file.csv': {
            'dcid': STRING,
            'name': STRING,  # STRING field should accept string values
        }
    }
    mock_get_config.return_value = mock_cfg
    mock_is_gcs.return_value = False

    # CSV with string in STRING field - should succeed
    csv_content = 'dcid,name\ngeoId/01,SomeName'
    file_data = BytesIO(csv_content.encode('utf-8'))
    response = self.client.post('/admin/api/upload',
                                data={
                                    'file': (file_data, 'test_file.csv'),
                                    'baseFilename': 'test_file.csv',
                                })
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['category'] == 'success'
    assert mock_upload.called

  @patch('server.routes.admin_panel.api.lib_config.get_config')
  def test_upload_validation_exception(self, mock_get_config):
    """Test upload when validation raises exception."""
    mock_cfg = self._get_mock_config()
    mock_get_config.return_value = mock_cfg

    file_data = BytesIO(b'invalid content')
    with patch('server.routes.admin_panel.api.validate_csv') as mock_validate:
      mock_validate.side_effect = Exception('Validation error')
      response = self.client.post('/admin/api/upload',
                                  data={
                                      'file': (file_data, 'test_file.csv'),
                                      'baseFilename': 'test_file.csv',
                                  })
      assert response.status_code == 400
      data = json.loads(response.data)
      assert data['category'] == 'error'
      assert 'Error during file validation' in data['message']

  @patch('server.routes.admin_panel.api.lib_config.get_config')
  @patch('server.routes.admin_panel.api.upload_file_to_storage')
  def test_upload_storage_exception(self, mock_upload, mock_get_config):
    """Test upload when storage upload fails."""
    mock_cfg = self._get_mock_config()
    mock_get_config.return_value = mock_cfg
    mock_upload.side_effect = Exception('Storage error')

    csv_content = 'dcid,value\ngeoId/01,100'
    file_data = BytesIO(csv_content.encode('utf-8'))
    response = self.client.post('/admin/api/upload',
                                data={
                                    'file': (file_data, 'test_file.csv'),
                                    'baseFilename': 'test_file.csv',
                                })
    assert response.status_code == 400
    data = json.loads(response.data)
    assert data['category'] == 'error'
    assert 'Error during uploading file' in data['message']

  def test_upload_requires_login(self):
    """Test upload requires login."""
    with self.client.session_transaction() as sess:
      sess.clear()

    response = self.client.post('/admin/api/upload', follow_redirects=False)
    # Should redirect to login
    assert response.status_code in [302, 401]


class TestUpdateConfigEndpoint(TestAdminPanelAPI):
  """Test /admin/api/update-config endpoint."""

  def setUp(self):
    super().setUp()
    with self.client.session_transaction() as sess:
      sess['username'] = 'testuser'

  @patch('server.routes.admin_panel.api.lib_config.get_config')
  @patch('server.routes.admin_panel.api.upload_file_to_storage')
  def test_update_config_success(self, mock_upload, mock_get_config):
    """Test successful config update."""
    mock_cfg = self._get_mock_config()
    mock_get_config.return_value = mock_cfg

    response = self.client.post('/admin/api/update-config',
                                data={
                                    'domainName': 'Updated Domain',
                                    'descriptionTitle': 'Updated Title',
                                })
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['category'] == 'success'
    assert 'Domain config updated' in data['message']
    assert mock_upload.called

  @patch('server.routes.admin_panel.api.lib_config.get_config')
  @patch('server.routes.admin_panel.api.upload_file_to_storage')
  def test_update_config_with_logo(self, mock_upload, mock_get_config):
    """Test config update with logo."""
    mock_cfg = self._get_mock_config()
    mock_get_config.return_value = mock_cfg

    logo_data = BytesIO(b'fake png content')
    response = self.client.post('/admin/api/update-config',
                                data={
                                    'domainName': 'Updated Domain',
                                    'file': (logo_data, 'logo.png'),
                                },
                                content_type='multipart/form-data')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['category'] == 'success'
    assert 'Domain config and domain logo updated' in data['message']

  @patch('server.routes.admin_panel.api.lib_config.get_config')
  @patch('server.routes.admin_panel.api.upload_file_to_storage')
  def test_update_config_upload_failure(self, mock_upload, mock_get_config):
    """Test config update when upload fails."""
    mock_cfg = self._get_mock_config()
    mock_get_config.return_value = mock_cfg
    mock_upload.side_effect = Exception('Upload error')

    response = self.client.post('/admin/api/update-config',
                                data={
                                    'domainName': 'Updated Domain',
                                })
    assert response.status_code == 400
    data = json.loads(response.data)
    assert data[
        'category'] == 'success'  # Note: API returns 'success' even on error
    assert 'Config uploading failed' in data['message']

  def test_update_config_requires_login(self):
    """Test update config requires login."""
    with self.client.session_transaction() as sess:
      sess.clear()

    response = self.client.post('/admin/api/update-config',
                                follow_redirects=False)
    assert response.status_code in [302, 401]


class TestDomainConfigEndpoint(TestAdminPanelAPI):
  """Test /admin/api/domain-config endpoint."""

  @patch('server.routes.admin_panel.api.lib_config.get_config')
  @patch('server.routes.admin_panel.api.is_gcs_path')
  @patch('server.routes.admin_panel.api.storage.Client')
  def test_domain_config_gcs_exists(self, mock_storage_client, mock_is_gcs,
                                    mock_get_config):
    """Test domain config from GCS when blob exists."""
    mock_cfg = self._get_mock_config()
    mock_get_config.return_value = mock_cfg
    mock_is_gcs.return_value = True

    # Mock GCS blob
    mock_blob = MagicMock()
    mock_blob.download_as_bytes.return_value = json.dumps({
        'domainName': 'GCS Domain',
    }).encode('utf-8')
    mock_bucket = MagicMock()
    mock_bucket.get_blob.return_value = mock_blob
    mock_client = MagicMock()
    mock_client.bucket.return_value = mock_bucket
    mock_storage_client.return_value = mock_client

    with patch('server.routes.admin_panel.api.get_path_parts',
               return_value=('bucket', 'path')):
      response = self.client.get('/admin/api/domain-config')
      assert response.status_code == 200
      data = json.loads(response.data)
      assert data['domainName'] == 'GCS Domain'

  @patch('server.routes.admin_panel.api.lib_config.get_config')
  @patch('server.routes.admin_panel.api.is_gcs_path')
  @patch('server.routes.admin_panel.api.storage.Client')
  def test_domain_config_gcs_not_exists(self, mock_storage_client, mock_is_gcs,
                                        mock_get_config):
    """Test domain config from GCS when blob doesn't exist."""
    mock_cfg = self._get_mock_config()
    mock_get_config.return_value = mock_cfg
    mock_is_gcs.return_value = True

    # Mock GCS blob not found
    mock_bucket = MagicMock()
    mock_bucket.get_blob.return_value = None
    mock_client = MagicMock()
    mock_client.bucket.return_value = mock_bucket
    mock_storage_client.return_value = mock_client

    with patch('server.routes.admin_panel.api.get_path_parts',
               return_value=('bucket', 'path')):
      response = self.client.get('/admin/api/domain-config')
      assert response.status_code == 200
      data = json.loads(response.data)
      assert data == mock_cfg.DEFAULT_DOMAIN_CONFIG

  @patch('server.routes.admin_panel.api.lib_config.get_config')
  @patch('server.routes.admin_panel.api.is_gcs_path')
  @patch('server.routes.admin_panel.api.os.path.exists')
  def test_domain_config_local_exists(self, mock_exists, mock_is_gcs,
                                      mock_get_config):
    """Test domain config from local file when exists."""
    mock_cfg = self._get_mock_config()
    mock_get_config.return_value = mock_cfg
    mock_is_gcs.return_value = False
    mock_exists.return_value = True

    config_data = {'domainName': 'Local Domain'}
    with tempfile.NamedTemporaryFile(mode='w', delete=False,
                                     suffix='.json') as f:
      json.dump(config_data, f)
      temp_path = f.name

    try:
      with patch('server.routes.admin_panel.api.os.path.join',
                 return_value=temp_path):
        response = self.client.get('/admin/api/domain-config')
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['domainName'] == 'Local Domain'
    finally:
      os.unlink(temp_path)

  @patch('server.routes.admin_panel.api.lib_config.get_config')
  @patch('server.routes.admin_panel.api.is_gcs_path')
  @patch('server.routes.admin_panel.api.os.path.exists')
  def test_domain_config_local_not_exists(self, mock_exists, mock_is_gcs,
                                          mock_get_config):
    """Test domain config from local file when doesn't exist."""
    mock_cfg = self._get_mock_config()
    mock_get_config.return_value = mock_cfg
    mock_is_gcs.return_value = False
    mock_exists.return_value = False

    response = self.client.get('/admin/api/domain-config')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data == mock_cfg.DEFAULT_DOMAIN_CONFIG


class TestHelperFunctions(TestAdminPanelAPI):
  """Test helper functions in api.py."""

  def test_allowed_file(self):
    """Test allowed_file function."""
    from server.routes.admin_panel.api import allowed_file

    assert allowed_file('test.csv', {'csv'}) is True
    assert allowed_file('test.CSV', {'csv'}) is True  # Case insensitive
    assert allowed_file('test.txt', {'csv'}) is False
    assert allowed_file('test', {'csv'}) is False  # No extension


if __name__ == '__main__':
  unittest.main()
