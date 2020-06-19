 ### Generate the json configuration file used by GNI tool to build the menu of statistical variables for the users to choose from.
 
 
 * [util.py](./util.py): functions used for building the property-value tree
 * [stat_config.proto](./stat_config.proto): configuration file for generating [stat_config_pb2.py](./stat_config_pb2.py), used for parsing the input config files. 
 * [generate_json.sh](./generate_json.sh): commands for generate the json file locally
 
 * [pop_obs_spec_common.textproto](./pop_obs_spec_common.textproto) : contain lists of specs with specific population_type, measured_property, contraint properties etc, that will be shown in the gni for the users to choose from. 


