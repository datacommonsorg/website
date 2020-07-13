/**
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const STATS_VAR_TEXT: {[key:string]: string} = {
  // age
  "dc/meyn6fb92kmt1": "0-5",
  "dc/try0708bj3wld": "5-17",
  "dc/pnx61zqcgd089": "25-34",
  "dc/p1b8b9h2e9dm": "35-44",
  "dc/jgngnj0y3pymf": "45-54",
  "dc/7kfvx85990nb3": "55-59",
  "dc/slpn4e1sdstp2": "65+",
  // gender
  "TotalPopulation": "Total",
  "MalePopulation": "Male",
  "FemalePopulation": "Female",
  // income
  "dc/cmn38d85glq72": "Under $10K",
  "dc/pj50xtdgxeh4g": "$10K to $15K",
  "dc/61fzldryrnte1": "$15K to $25K",
  "dc/jhpflf91nvlt6": "$25K to $35K",
  "dc/tpeg0jxdts2t3": "$35K to $50K",
  "dc/esr27kls5vfy6": "$50K to $65K",
  "dc/6yb4mgxtc1288": "$65K to $75K",
  "dc/pvsbze841l2tc": "Over $75K",
  // marital status
  "MarriedPopulation": "Married",
  "DivorcedPopulation": "Divorced",
  "NeverMarriedPopulation": "Never Married",
  "WidowedPopulation": "Widowed",
  "SeparatedPopulation": "Separated",
  // education/poulation
  "dc/y5kepy5lkw6bb": "No Schooling",
  "dc/gmq4ysp44m5j9": "High School",
  "dc/2dps7teg5j5v9": "Bachelors",
  "dc/tpkg6dm5s3kb4": "Masters",
  "dc/3e9rwvgq7wrtg": "Doctorate",
  // education/income
  "dc/ts1dhhdjrmex5": "Below High School",
  "dc/np4f8b3stgbzf": "High School",
  "dc/jphem3qyytygb": "Some College",
  "dc/wn6v7lmze2591": "Bachelors",
  "dc/p821sf4dr8p11": "Graduate School",
  // household/income
  "dc/lvsdhhbd0jrh5": "$35K to $40K",
  "dc/gx09ehen28bsf": "$40K to $45K",
  "dc/rprpfge1wsm33": "$75K to $100K",
  "dc/c12q5trlfjl98": "$100K to $125K",
  "dc/z2rte6lflytvh": "$125K to $150K",
  "dc/wgnpff4d5g2q2": "$150K to $200K",
  "dc/3wql8mczgswkb": "$150K to $200K",
  // COVID-19
  "NYTCovid19CumulativeCases": "COVID-19 Cumulative Cases",
  "dc/qztkwwf54vg95": "COVID-19 Cumulative Deaths",
  // Citizenship
  "dc/ljp64znvx5xt3": "Born in USA",
  "dc/1kkn87qf3g6z1": "Citizen by Naturalization",
  "dc/qvteg34sxp4m7": "Not a Citizen",
  "dc/gnesrd1yxrzf5": "Born Abroad",
  // Mortality cause
  "dc/ep33gsm98jx83": "Circulatory System",
  "dc/4jbr9d6krbq8b": "Neoplasms",
  "dc/jp78cbvpp5cwf": "Respiratory System",
  "dc/xbp3e1vhh0k": "External Causes",
  "dc/q2l08jqn8b2bb": "Nervous System",
  // Outcomes
  "dc/msb1g40nedmc": "High Cholesterol",
  "dc/zykf4zc9rley2": "High Blood Pressure",
  "dc/242ggfbbtxer4": "Arthritis",
  "dc/05wsnx83v7g4c": "Mental Health Not Good",
  "dc/e1tpt6j311f8b": "Physical Health Not Good",
  // Behaviors
  "dc/pej02dv14h6g7": "Sleep Less Than 7 Hours",
  "dc/3wqqr6tv5w54g": "Obesity",
  "dc/w030hcc9bw7q5": "Binge Drinking",
  "dc/g761l9fzzkk06": "Physical Inactivity",
  "dc/8zz3tp7ese92h": "Smoking",
  // Drug Prescribed
  "dc/p4j0ctx3kbdl4": "Oxycodone",
  "dc/mxlgnxpw7h607": "Hydrocodone",
  "dc/7dsge7p8xbmlc": "Codeine",
  "dc/862d0n6lbcem5": "Amphetamine",
  "dc/9pw9303309ycc": "Morphine",
  // School Enrollment
  "dc/j4l3qg4zv13j6": "Enrolled in School",
  "dc/9y4xw434pyj28": "Not Enrolled in School",
  // Crime
  "TotalCrimes": "Combined Crimes",
  "dc/3eqzh2dz54m35": "Violent Crimes",
  "dc/td8984d2wb2rh": "Property Crimes",
  "dc/24xvy54shzb3h": "Arson",
};

export { STATS_VAR_TEXT };
