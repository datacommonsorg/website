# PV Tree Generator

PV Tree is a json file that contains the configuration used by various
DataCommons frontend clients. This tool build the pv tree from the pop obs spec
and avaiable statistical variables that exists in DataCommons KG.

## generate the json file

```bash
./generate_json.sh
```

## Run test

```bash
./pv_tree_test.sh
```

## Source file summary

- [main.py](./main.py): the main script for generating the json configuration
- [build_tree.py](./build_tree.py): build the property-value(pv) tree
  recursively
- [util.py](./util.py): functions used for building the pv tree
- [hierarchy.json](./hierarchy.json): generated json file
- [stat_config.proto](./stat_config.proto): configuration file for generating
  [stat_config_pb2.py](./stat_config_pb2.py), used for parsing the input config
  files.
- [constants.py](./constants.py): constants used for building the pv tree
- [text_format.py](./text_format.py): functions formating the texts shown in UI
- [text_format_test.py](./text_format_test.py): unittest for text_format.py
- [pop_obs_spec_common.textproto](./pop_obs_spec_common.textproto) : contain
  lists of specs with specific population_type, measured_property, contraint
  properties etc, that will be shown in the gni for the users to choose from.
