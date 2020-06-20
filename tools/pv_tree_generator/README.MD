 ### Generate the json configuration file used by GNI tool to build the menu of statistical variables for the users to choose from.
 
 
 * [util.py](./util.py): functions used for building the property-value(pv) tree
 * [stat_config.proto](./stat_config.proto): configuration file for generating [stat_config_pb2.py](./stat_config_pb2.py), used for parsing the input config files. 
 * [generate_json.sh](./generate_json.sh): commands for generate the json file locally
 * [constants.py](./constants.py): constants used for building the pv tree
 * [text_format.py](./text_format.py): functions formating the texts shown in UI
 * [statistical_variables_dcid.txt](./statistical_variables_dcid.txt): stores the dcid of all the statistical variables in lines.
 
 * [pop_obs_spec_common.textproto](./pop_obs_spec_common.textproto) : contain lists of specs with specific population_type, measured_property, contraint properties etc, that will be shown in the gni for the users to choose from. 


