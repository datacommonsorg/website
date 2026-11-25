# Copyright 2026 Google LLC
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
"""Validation tests for Cloud Deploy Skaffold and Helm environment configs."""

import copy
from pathlib import Path
import re
from typing import Any
import unittest

import yaml

REPO_ROOT = Path(__file__).resolve().parents[2]
CLOUD_DEPLOY_ENVS = ('dev', 'autopush', 'staging', 'prod')
GO_MEM_LIMIT_RE = re.compile(r'^[0-9]+(B|KiB|MiB|GiB|TiB)$')


def _load_yaml(rel_path: str) -> dict[str, Any]:
  path = REPO_ROOT / rel_path
  with path.open('r', encoding='utf-8') as f:
    data = yaml.safe_load(f)
  assert isinstance(data, dict), f'Expected mapping in {rel_path}'
  return data


def _deep_merge(base: dict[str, Any],
                override: dict[str, Any]) -> dict[str, Any]:
  merged = copy.deepcopy(base)
  for key, val in override.items():
    if isinstance(val, dict) and isinstance(merged.get(key), dict):
      merged[key] = _deep_merge(merged[key], val)
    else:
      merged[key] = copy.deepcopy(val)
  return merged


class DeployConfigTest(unittest.TestCase):

  def test_skaffold_cloud_deploy_profiles_decoupled_and_clean(self) -> None:
    # Test: Skaffold Cloud Deploy profile structure and values layering.
    # Situation: Load skaffold.yaml and inspect website-* and mixer-* profiles.
    # Expectation: Zero inline setValues remain, hashes use setValueTemplates,
    #   and website-* dc-mixer releases read website_mixer_<env>.yaml.
    skaffold = _load_yaml('skaffold.yaml')
    profiles = {p['name']: p for p in skaffold['profiles']}

    for env in CLOUD_DEPLOY_ENVS:
      web_profile = profiles[f'website-{env}']
      releases = {
          r['name']: r for r in web_profile['manifests']['helm']['releases']
      }
      web_rel = releases['datacommons-website-release']
      mixer_rel = releases['dc-mixer']

      self.assertNotIn('setValues', web_rel)
      self.assertNotIn('setValues', mixer_rel)
      self.assertEqual(
          web_rel['valuesFiles'],
          [f'deploy/helm_charts/envs/{env}.yaml'],
      )
      self.assertEqual(
          mixer_rel['valuesFiles'],
          [f'deploy/helm_charts/envs/website_mixer_{env}.yaml'],
      )
      self.assertIn('website.githash', web_rel.get('setValueTemplates', {}))
      self.assertIn('mixer.githash', mixer_rel.get('setValueTemplates', {}))

      standalone_profile = profiles[f'mixer-{env}']
      standalone_rel = standalone_profile['manifests']['helm']['releases'][0]
      self.assertNotIn('setValues', standalone_rel)
      self.assertEqual(
          standalone_rel['valuesFiles'],
          [f'mixer/deploy/helm_charts/envs/mixer_{env}.yaml'],
      )
      self.assertIn('mixer.githash',
                    standalone_rel.get('setValueTemplates', {}))

  def test_website_env_configs_have_no_dead_mixer_blocks(self) -> None:
    # Test: Website chart and per-env overrides stay free of Mixer keys.
    # Situation: Load dc_website/values.yaml and envs/{dev..prod}.yaml.
    # Expectation: Dead mixer and serviceGroups blocks are absent, while fields
    #   required by dc_website and clearcache/run.sh remain present.
    web_base = _load_yaml('deploy/helm_charts/dc_website/values.yaml')
    self.assertNotIn('mixer', web_base)
    self.assertNotIn('esp', web_base)
    self.assertNotIn('kgStoreConfig', web_base)

    for env in CLOUD_DEPLOY_ENVS:
      env_cfg = _load_yaml(f'deploy/helm_charts/envs/{env}.yaml')
      self.assertNotIn('mixer', env_cfg, f'{env}.yaml still defines dead mixer')
      msg = f'{env}.yaml has serviceGroups; use website_mixer_{env}.yaml'
      self.assertNotIn('serviceGroups', env_cfg, msg)
      self.assertTrue(env_cfg.get('project'))
      self.assertEqual(env_cfg.get('cluster_prefix'), 'website')
      self.assertEqual(env_cfg.get('serviceAccount', {}).get('name'),
                       'website-ksa')
      self.assertTrue(env_cfg.get('website', {}).get('flaskEnv'))

  def test_website_mixer_env_configs_satisfy_helm_and_esp_contracts(
      self) -> None:
    # Test: Bundled Mixer per-env files satisfy Helm, ESP, and routing rules.
    # Situation: Merge mixer/values.yaml with each website_mixer_<env>.yaml.
    # Expectation: Required ESP/Helm fields are populated, dead keys are absent,
    #   goMemLimit uses Go units, and every routed service group is deployed.
    web_base = _load_yaml('deploy/helm_charts/dc_website/values.yaml')
    routed_groups = {
        name for name, cfg in web_base['serviceGroups'].items() if cfg
    }

    mixer_base_path = REPO_ROOT / 'mixer/deploy/helm_charts/mixer/values.yaml'
    mixer_base = (_load_yaml('mixer/deploy/helm_charts/mixer/values.yaml')
                  if mixer_base_path.exists() else {})

    esp_script = (REPO_ROOT / 'scripts/deploy_cloud_esp.sh').read_text(
        encoding='utf-8')
    self.assertIn(
        'deploy/helm_charts/envs/website_mixer_$ENV.yaml',
        esp_script,
    )

    for env in CLOUD_DEPLOY_ENVS:
      wm_cfg = _load_yaml(f'deploy/helm_charts/envs/website_mixer_{env}.yaml')
      merged = _deep_merge(mixer_base, wm_cfg) if mixer_base else wm_cfg

      project = wm_cfg.get('project')
      self.assertTrue(project)
      self.assertEqual(wm_cfg.get('cluster_prefix'), 'website')

      mixer_cfg = merged.get('mixer', {})
      self.assertEqual(mixer_cfg.get('hostProject'), project)
      self.assertEqual(
          mixer_cfg.get('serviceName'),
          f'website-esp.endpoints.{project}.cloud.goog',
      )
      self.assertNotIn('useRedis', mixer_cfg)
      self.assertNotIn('cacheSVFormula', mixer_cfg)
      if mixer_cfg.get('redis', {}).get('enabled'):
        self.assertTrue(mixer_cfg['redis'].get('configFile'))

      self.assertEqual(merged.get('serviceAccount', {}).get('name'),
                       'website-ksa')

      groups = merged.get('serviceGroups', {})
      deployed_groups = {name for name, cfg in groups.items() if cfg}
      missing = routed_groups - deployed_groups
      self.assertFalse(
          missing,
          f'website_mixer_{env}.yaml missing routed groups: {missing}',
      )
      for group_name in deployed_groups:
        group_cfg = groups[group_name]
        self.assertGreater(int(group_cfg['replicas']), 0)
        go_mem_limit = group_cfg.get('goMemLimit')
        if go_mem_limit is not None:
          self.assertRegex(str(go_mem_limit), GO_MEM_LIMIT_RE)


if __name__ == '__main__':
  unittest.main()
