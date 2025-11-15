# Knip Reports

This file contains the output of the `knip` command run on the four packages in this project.

## Report for `static`

```
Now using node v22.20.0 (npm v10.9.3)
#### Building webpack in development mode
#### Building webpack in production mode
Unused files (16)
custom_dc/iitm/app.js                             
custom_dc/iitm/bs-init.js                         
custom_dc/iitm/creative.js                        
custom_dc/iitm/particles.js                       
js/apps/explore/parent_breadcrumbs.tsx            
js/apps/explore/sidebar.tsx                       
js/apps/homepage/components/demo_dialog.tsx       
js/chart/draw_leaflet_map.ts                      
js/components/content/hero_simple.tsx             
js/components/content/hero_video.tsx              
js/components/elements/button/demo_buttons.tsx    
js/components/elements/tooltip/demo_tooltips.tsx  
js/homepage/carousel.tsx                          
js/tools/commons.ts                               
js/tools/map/leaflet_map.tsx                      
src/server.ts                                     
Unused dependencies (14)
@datacommonsorg/web-components  package.json
@types/d3-scale                 package.json
@types/express                  package.json
@types/resize-observer-browser  package.json
bootstrap                       package.json
css-loader                      package.json
easy-peasy                      package.json
express                         package.json
full-icu                        package.json
html-webpack-plugin             package.json
jsdom                           package.json
sharp                           package.json
style-loader                    package.json
webpack-cli                     package.json
Unused devDependencies (4)
@testing-library/jest-dom  package.json:106:6
enzyme-to-json             package.json:114:6
jest-each                  package.json:122:6
react-test-renderer        package.json:127:6
Unlisted dependencies (9)
@jest/globals   js/components/tiles/bar_tile.test.tsx:18:10         
cheerio         js/components/tiles/bar_tile.test.tsx:32:21         
@jest/globals   js/shared/feature_flags/util.test.ts:32:10          
@jest/globals   js/stat_var_hierarchy/stat_var_search.test.tsx:17:10
cheerio         js/tools/scatter/app.test.tsx:32:21                 
@jest/globals   js/tools/stat_var/dataset_selector.test.tsx:18:10   
@jest/globals   js/tools/timeline/data_fetcher.test.ts:19:10        
@jest/globals   js/tools/timeline/mock_functions.tsx:21:10          
@emotion/cache  js/utils/wrapped_tile.tsx:27:25                     
Unresolved imports (1)
typescript-tslint-plugin  tsconfig.json
Unused exports (103)
ndcg                                             function  js/apps/eval_embeddings/util.tsx:56:17                       
accuracy                                         function  js/apps/eval_embeddings/util.tsx:65:17                       
DC_STAT_FEEDBACK_COL                                       js/apps/eval_retrieval_generation/constants.tsx:46:14        
getField                                         function  js/apps/eval_retrieval_generation/data_store.tsx:80:23       
getSheetsRows                                    function  js/apps/eval_retrieval_generation/data_store.tsx:201:23      
getChartArea                                     function  js/apps/visualization/vis_type_configs/map_config.tsx:99:17  
TOOL_TIP                                                   js/biomedical/bio_charts_utils.ts:26:14                      
TOOL_TIP_SHIFT                                             js/biomedical/bio_charts_utils.ts:31:14                      
DEFAULT_BRIGHTEN_PERCENTAGE                                js/biomedical/bio_charts_utils.ts:33:14                      
X_LABEL_SHIFT                                              js/biomedical/bio_charts_utils.ts:35:14                      
onMouseOver                                      function  js/biomedical/bio_charts_utils.ts:46:17                      
onMouseMove                                      function  js/biomedical/bio_charts_utils.ts:63:17                      
onMouseOut                                       function  js/biomedical/bio_charts_utils.ts:73:17                      
getChemicalCompoundData                          function  js/biomedical/disease/data_processing_utils.ts:165:17        
Datum                                                      js/biomedical/protein/chart.ts:26:9                          
BrowserSectionTrigger                            class     js/browser/app.tsx:253:14                                    
HORIZONTAL_BAR_CHART                                       js/chart/draw_bar.ts:53:14                                   
positionTooltip                                  function  js/chart/draw_bar.ts:161:17                                  
HOVER_HIGHLIGHTED_CLASS_NAME                               js/chart/draw_d3_map.ts:73:14                                
combineGeoJsons                                  function  js/chart/draw_d3_map.ts:272:17                               
showTooltip                                      function  js/chart/draw_line.ts:139:17                                 
HOVER_HIGHLIGHTED_CLASS_NAME                               js/chart/draw_map_utils.ts:34:14                             
generateLegend                                   function  js/chart/draw_map_utils.ts:252:17                            
MAX_UNIT_LENGTH                                            js/chart/draw_utils.ts:48:14                                 
useDialogContext                                           js/components/elements/dialog/dialog.tsx:168:14              
Reminder                                                   js/components/elements/icons/reminder.tsx:28:14              
loadSampleQuestions                                        …components/nl_search_bar/dynamic_placeholder_helper.ts:74:14
cycleSampleQuestions                                       …omponents/nl_search_bar/dynamic_placeholder_helper.ts:102:14
fetchData                                                  js/components/tiles/bivariate_tile.tsx:232:14                
getReplacementStrings                            function  js/components/tiles/donut_tile.tsx:185:17                    
fetchData                                                  js/components/tiles/donut_tile.tsx:195:14                    
draw                                             function  js/components/tiles/donut_tile.tsx:337:17                    
RESIZE_DEBOUNCE_INTERVAL_MS                                js/components/tiles/use_draw_on_resize.ts:20:14              
localizeSearchParams                                       js/i18n/i18n.tsx:416:16                                      
isPlaceInUsa                                     function  js/place/util.ts:61:17                                       
USA_PLACE_TYPES_WITH_CHOROPLETH                            js/place/util.ts:68:14                                       
EASTERN_EUROPE_DCID                                        js/shared/constants.ts:78:14                                 
DENOM_INPUT_PLACEHOLDER                                    js/shared/constants.ts:109:14                                
isFeatureOverrideEnabled                         function  js/shared/feature_flags/util.ts:38:17                        
getFeatureFlags                                  function  js/shared/feature_flags/util.ts:59:17                        
GA_EVENT_PLACE_CATEGORY_CLICK                              js/shared/ga_events.ts:104:14                                
GA_EVENT_TILE_SOURCE                                       js/shared/ga_events.ts:237:14                                
GA_EVENT_AUTOCOMPLETE_SELECTION_REDIRECTS_TO_SV            js/shared/ga_events.ts:284:14                                
GA_PARAM_PLACE_CATEGORY_CLICK_SOURCE                       js/shared/ga_events.ts:338:14                                
GA_PARAM_PLACE_CATEGORY_CLICK                              js/shared/ga_events.ts:340:14                                
GA_VALUE_PLACE_CHART_CLICK_DATA_SOURCE                     js/shared/ga_events.ts:372:14                                
GA_VALUE_PLACE_CHART_CLICK_EXPORT                          js/shared/ga_events.ts:373:14                                
GA_VALUE_PLACE_CHART_CLICK_EXPLORE_MORE                    js/shared/ga_events.ts:374:14                                
GA_VALUE_PLACE_CATEGORY_CLICK_OVERVIEW                     js/shared/ga_events.ts:375:14                                
GA_VALUE_PLACE_CATEGORY_CLICK_SOURCE_SIDEBAR               js/shared/ga_events.ts:376:14                                
GA_VALUE_PLACE_CATEGORY_CLICK_SOURCE_CHART_HEA…            js/shared/ga_events.ts:377:14                                
GA_VALUE_PLACE_CATEGORY_CLICK_SOURCE_MORE_CHAR…            js/shared/ga_events.ts:378:14                                
GA_VALUE_SEARCH_SOURCE_EXPLORE_LANDING                     js/shared/ga_events.ts:396:14                                
GA_VALUE_SEARCH_SOURCE_PLACE_PAGE                          js/shared/ga_events.ts:398:14                                
LEGEND_CONTAINER_ID                                        js/tools/map/chart.tsx:68:14                                 
useGeoJsonReady                                  function  js/tools/map/ready_hooks.ts:29:17                            
useMapPointCoordinateReady                       function  js/tools/map/ready_hooks.ts:185:17                           
observationDatesFacets                                     js/tools/map/test_data.ts:19:14                              
updateHashDate                                   function  js/tools/map/util.ts:351:17                                  
getLegendBounds                                  function  js/tools/map/util.ts:746:17                                  
SCATTER_URL_PATH                                           js/tools/scatter/util.ts:48:14                               
applyHashBoolean                                 function  js/tools/scatter/util.ts:215:17                              
applyHashPopulation                              function  js/tools/scatter/util.ts:228:17                              
updateHashBoolean                                function  js/tools/scatter/util.ts:238:17                              
updateHashAxis                                   function  js/tools/scatter/util.ts:317:17                              
updateHashPlace                                  function  js/tools/scatter/util.ts:353:17                              
arePlacesLoaded                                  function  js/tools/scatter/util.ts:423:17                              
EMPTY_NAMED_TYPED_PLACE                                    …/tools/shared/place_selector/place_select_constants.ts:21:14
USA_CITY_CHILD_TYPES                                       …/tools/shared/place_selector/place_select_constants.ts:22:14
USA_COUNTY_CHILD_TYPES                                     …/tools/shared/place_selector/place_select_constants.ts:23:14
USA_STATE_CHILD_TYPES                                      …/tools/shared/place_selector/place_select_constants.ts:28:14
USA_COUNTRY_CHILD_TYPES                                    …/tools/shared/place_selector/place_select_constants.ts:29:14
USA_CENSUS_DIV_CHILD_TYPES                                 …/tools/shared/place_selector/place_select_constants.ts:30:14
USA_CENSUS_REGION_CHILD_TYPES                              …/tools/shared/place_selector/place_select_constants.ts:31:14
AA4_CHILD_PLACE_TYPES                                      …/tools/shared/place_selector/place_select_constants.ts:45:14
AA3_CHILD_PLACE_TYPES                                      …/tools/shared/place_selector/place_select_constants.ts:46:14
AA2_CHILD_PLACE_TYPES                                      …/tools/shared/place_selector/place_select_constants.ts:50:14
AA1_CHILD_PLACE_TYPES                                      …/tools/shared/place_selector/place_select_constants.ts:54:14
NUTS2_CHILD_PLACE_TYPES                                    …/tools/shared/place_selector/place_select_constants.ts:58:14
NUTS1_CHILD_PLACE_TYPES                                    …/tools/shared/place_selector/place_select_constants.ts:59:14
NON_USA_COUNTRY_PLACE_TYPES                                …/tools/shared/place_selector/place_select_constants.ts:63:14
CONTINENT_PLACE_TYPES                                      …/tools/shared/place_selector/place_select_constants.ts:69:14
ChartRegionPropsType                                       js/tools/timeline/chart_region.tsx:242:22                    
setDenom                                         function  js/tools/timeline/util.ts:109:17                             
getFooterOptions                                 function  js/utils/app/visualization_utils.tsx:175:17                  
DEFAULT_CLIENT_API_ROOT                                    js/utils/data_commons_client.ts:24:14                        
canClickRegion                                   function  js/utils/disaster_event_map_utils.tsx:422:17                 
getHashValue                                     function  js/utils/disaster_event_map_utils.tsx:533:17                 
CHART_FEEDBACK_SENTIMENT                                   js/utils/explore_utils.ts:32:14                              
getNlChartId                                     function  js/utils/explore_utils.ts:58:17                              
getChildPlacesPromise                            function  js/utils/place_utils.ts:99:17                                
getPlaceNamesI18n                                function  js/utils/place_utils.ts:223:17                               
getPlaceIdsFromNames                             function  js/utils/place_utils.ts:343:17                               
getUrlTokenOrDefault                             function  js/utils/url_utils.ts:45:17                                  
extractFacetMetadataUrlHashParams                function  js/utils/url_utils.ts:141:17                                 
getQueryParamFromUrl                             function  js/utils/url_utils.ts:235:17                                 
CHART_INFO_PARAMS                                          nodejs_server/constants.ts:45:14                             
getBarChart                                      function  nodejs_server/tiles/bar_tile.ts:177:23                       
getDisasterMapChart                              function  nodejs_server/tiles/disaster_map_tile.ts:161:23              
getLineChart                                     function  nodejs_server/tiles/line_tile.ts:189:23                      
getMapChart                                      function  nodejs_server/tiles/map_tile.ts:188:23                       
getRankingChart                                  function  nodejs_server/tiles/ranking_tile.ts:251:23                   
getScatterChart                                  function  nodejs_server/tiles/scatter_tile.ts:153:23                   
Unused exported types (79)
DataSourceGroup                         interface  js/apps/data/components/data_sources.tsx:34:18                  
FormStatus                              enum       js/apps/eval_retrieval_generation/call_feedback.tsx:58:13       
DebugInfoProps                          interface  js/apps/explore/debug_info.tsx:171:18                           
VisToolChartOption                      interface  js/apps/visualization/redirect_constants.ts:29:18               
Datum                                   type       js/biomedical/bio_charts_utils.ts:36:13                         
DrugTreatmentTableProps                 interface  js/biomedical/disease/drug_table.tsx:10:18                      
PagePropType                            interface  js/biomedical/disease/page.tsx:63:18                            
PageStateType                           interface  js/biomedical/disease/page.tsx:69:18                            
VarGeneDataPoint                        interface  js/biomedical/protein/chart.ts:41:18                            
PagePropType                            interface  js/biomedical/protein/page.tsx:52:18                            
PageStateType                           interface  js/biomedical/protein/page.tsx:57:18                            
Series                                  interface  js/chart/types.ts:29:18                                         
SnapshotData                            interface  js/chart/types.ts:33:18                                         
DotDataPoint                            interface  js/chart/types.ts:68:18                                         
AnchorElementProps                      interface  js/components/elements/button/button.tsx:148:18                 
ButtonProps                             type       js/components/elements/button/button.tsx:157:13                 
CopyToClipboardButtonProps              type       js/components/elements/button/copy_to_clipboard_button.tsx:31:13
CodeBlockProps                          interface  js/components/elements/code/code_block.tsx:53:18                
Link                                    interface  js/components/elements/link_icon_box.tsx:36:18                  
TabDefinition                           interface  js/components/elements/tabs/tabs.tsx:90:18                      
TabsProps                               type       js/components/elements/tabs/tabs.tsx:126:13                     
PlaceNameProp                           interface  js/components/place_name.tsx:28:18                              
BlockContainerPropType                  interface  js/components/subject_page/block_container.tsx:52:18            
BlockPropType                           interface  js/components/subject_page/block.tsx:126:18                     
CategoryPropType                        interface  js/components/subject_page/category.tsx:38:18                   
ColumnPropType                          interface  js/components/subject_page/column.tsx:31:18                     
MetadataSummaryProps                    interface  js/components/subject_page/metadata_summary.tsx:24:18           
AnswerMessageTilePropType               interface  js/components/tiles/answer_message_tile.tsx:33:18               
AnswerTableTilePropType                 interface  js/components/tiles/answer_table_tile.tsx:34:18                 
TileProp                                interface  js/components/tiles/tile_types.ts:23:18                         
SinglePlaceSingleVariableTileProp       interface  js/components/tiles/tile_types.ts:62:18                         
SinglePlaceMultiVariableTileProp        interface  js/components/tiles/tile_types.ts:71:18                         
MultiPlaceSingleVariableTileProp        interface  js/components/tiles/tile_types.ts:80:18                         
MultiPlaceMultiVariableTileProp         interface  js/components/tiles/tile_types.ts:89:18                         
ContainedInPlaceSingleVariableTileProp  interface  js/components/tiles/tile_types.ts:98:18                         
TemplateInfo                            interface  js/import_wizard2/templates.tsx:26:18                           
ConfidenceLevel                         enum       js/import_wizard2/types.ts:55:13                                
DetectedDetails                         interface  js/import_wizard2/types.ts:69:18                                
ExploreType                             interface  js/shared/context.ts:37:18                                      
FacetSelectorFacetInfo                  interface  js/shared/facet_selector/facet_selector_rich.tsx:63:18          
FacetSelectorFacetInfo                  interface  js/shared/facet_selector/facet_selector_simple.tsx:49:18        
ObservationSpecManifest                 interface  js/shared/observation_specs.ts:84:18                            
EntitySeriesList                        interface  js/shared/stat_types.ts:83:18                                   
PlaceStatDateWithinPlace                interface  js/shared/stat_types.ts:120:18                                  
Topic                                   interface  js/shared/topic_config.ts:24:18                                 
NamedPopPlace                           interface  js/shared/types.ts:46:18                                        
StatVarNodeType                         interface  js/shared/types.ts:97:18                                        
GraphNode                               interface  js/shared/types.ts:160:18                                       
LinkedNodes                             interface  js/shared/types.ts:166:18                                       
FooterMenu                              interface  js/shared/types/base.ts:22:18                                   
IntroductionSection                     interface  js/shared/types/base.ts:58:18                                   
HeaderMenuItem                          interface  js/shared/types/base.ts:77:18                                   
LinkType                                type       js/shared/types/base.ts:101:13                                  
KnowledgeGraphItem                      interface  js/shared/types/knowledge_graph.ts:32:18                        
StatVarHierarchyPropType                interface  js/stat_var_hierarchy/stat_var_hierarchy.tsx:56:18              
TextVariant                             interface  js/theme/types.ts:21:18                                         
IsLoading                               interface  js/tools/map/context.ts:95:18                                   
SeriesKey                               interface  js/tools/shared/metadata/metadata.ts:89:18                      
StatVarProvenanceSummary                interface  js/tools/shared/metadata/metadata.ts:111:18                     
StatVarHierarchyConfig                  interface  js/tools/stat_var/stat_var_hierarchy_config.ts:20:18            
ChartGroupInfo                          interface  js/tools/timeline/chart_region.tsx:41:18                        
TokenInfo                               interface  js/tools/timeline/util.ts:27:18                                 
PlaceFallback                           interface  js/types/app/explore_types.ts:24:18                             
MultiSVCandidatePart                    interface  js/types/app/explore_types.ts:39:18                             
MultiSVScores                           interface  js/types/app/explore_types.ts:51:18                             
DebugInfo                               interface  js/types/app/explore_types.ts:67:18                             
DisasterEventMapPlaceInfo               interface  js/types/disaster_event_map_types.ts:26:18                      
EventDisplayProp                        interface  js/types/subject_page_proto_types.ts:32:18                      
PageMetadataConfig                      interface  js/types/subject_page_proto_types.ts:50:18                      
HistogramTileSpec                       interface  js/types/subject_page_proto_types.ts:77:18                      
BarTileSpec                             interface  js/types/subject_page_proto_types.ts:100:18                     
GaugeTileSpec                           interface  js/types/subject_page_proto_types.ts:115:18                     
DonutTileSpec                           interface  js/types/subject_page_proto_types.ts:123:18                     
LineTileSpec                            interface  js/types/subject_page_proto_types.ts:128:18                     
MapTileSpec                             interface  js/types/subject_page_proto_types.ts:138:18                     
AnswerMessageTileSpec                   interface  js/types/subject_page_proto_types.ts:148:18                     
AnswerTableTileSpec                     interface  js/types/subject_page_proto_types.ts:158:18                     
WrappedTileProps                        interface  js/utils/wrapped_tile.tsx:36:18                                 
DebugInfo                               interface  nodejs_server/types.ts:79:18                                    
Unused exported enum members (1)
Uncertain  ConfidenceLevel  js/import_wizard/types.ts:135:3
Duplicate exports (1)
DATE_OPTION_3Y_KEY|DEFAULT_DATE  js/constants/disaster_event_map_constants.ts
Configuration hints (1)
index.js    package.json  Package entry file not found
```

## Report for `packages/client`

```
Now using node v22.20.0 (npm v10.9.3)
Unused files (2)
src/demo/App.tsx   
src/demo/main.tsx  
Unused devDependencies (20)
@deck.gl/core                    package.json:34:6
@deck.gl/google-maps             package.json:35:6
@deck.gl/layers                  package.json:36:6
@deck.gl/react                   package.json:37:6
@googlemaps/react-wrapper        package.json:38:6
@types/d3-scale                  package.json:42:6
@types/google.maps               package.json:44:6
@types/react                     package.json:46:6
@types/react-dom                 package.json:47:6
@types/react-syntax-highlighter  package.json:48:6
@types/turf                      package.json:49:6
babel-jest                       package.json:50:6
d3-scale                         package.json:51:6
react                            package.json:53:6
react-dom                        package.json:54:6
react-syntax-highlighter         package.json:55:6
ts-jest                          package.json:57:6
typedoc                          package.json:59:6
vega-embed                       package.json:60:6
vega-lite                        package.json:61:6
Unused exports (2)
WEBSITE_SURFACE       src/constants.ts:34:14
DEFAULT_WEB_API_ROOT  src/utils.ts:27:14    
Unused exported types (29)
BaseGetDataRowsVariableParams  interface  src/data_commons_client_types.ts:38:18     
DataRowsDateFilter             interface  src/data_commons_client_types.ts:59:18     
DataRowsDateRangeFilter        interface  src/data_commons_client_types.ts:63:18     
BaseGetDataRowsParamsWithin    interface  src/data_commons_client_types.ts:68:18     
BaseGetDataRowsParamsEntities  interface  src/data_commons_client_types.ts:76:18     
BaseGetDataRowsParams          type       src/data_commons_client_types.ts:82:13     
BaseGetCsvParams               type       src/data_commons_client_types.ts:86:13     
DataRowObservation             type       src/data_commons_client_types.ts:125:13    
DataRowNodeProperties          type       src/data_commons_client_types.ts:134:13    
DataRowVariable                type       src/data_commons_client_types.ts:154:13    
DatacommonsClientParams        interface  src/data_commons_client.ts:64:18           
EntityObservation              interface  src/data_commons_web_client_types.ts:37:18 
EntityObservationWrapper       interface  src/data_commons_web_client_types.ts:41:18 
EntityObservationList          interface  src/data_commons_web_client_types.ts:46:18 
EntityObservationListWrapper   interface  src/data_commons_web_client_types.ts:50:18 
EntitySeries                   interface  src/data_commons_web_client_types.ts:64:18 
EntitySeriesWrapper            interface  src/data_commons_web_client_types.ts:68:18 
EntitySeriesList               interface  src/data_commons_web_client_types.ts:73:18 
SeriesAllApiResponse           interface  src/data_commons_web_client_types.ts:84:18 
PointAllApiResponse            interface  src/data_commons_web_client_types.ts:98:18 
DisplayNameApiResponse         interface  src/data_commons_web_client_types.ts:106:18
PlaceStatDateWithinPlace       interface  src/data_commons_web_client_types.ts:110:18
DatesByVariable                type       src/data_commons_web_client_types.ts:124:13
Chart                          interface  src/data_commons_web_client_types.ts:149:18
Place                          interface  src/data_commons_web_client_types.ts:154:18
BlockConfig                    interface  src/data_commons_web_client_types.ts:160:18
Category                       interface  src/data_commons_web_client_types.ts:178:18
OverviewTableDataRow           interface  src/data_commons_web_client_types.ts:206:18
DatacommonsWebClientParams     interface  src/data_commons_web_client.ts:35:18
```

## Report for `packages/react-tiles`

```
Now using node v22.20.0 (npm v10.9.3)
Configuration hints (1)

Stderr: index.js    package.json  Package entry file not found
```

## Report for `packages/web-components`

```
Now using node v22.20.0 (npm v10.9.3)
Unused files (1)
src/main.d.ts  
Unused dependencies (6)
bootstrap    package.json:4:6 
lodash       package.json:5:6 
raw-loader   package.json:6:6 
sass-loader  package.json:8:6 
react        package.json:9:6 
react-dom    package.json:10:6
Unused devDependencies (4)
@types/lodash     package.json:17:6
@types/react      package.json:19:6
@types/react-dom  package.json:20:6
prettier          package.json:21:6
```
