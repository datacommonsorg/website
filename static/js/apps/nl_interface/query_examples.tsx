/**
 * Copyright 2023 Google LLC
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

/**
 * Component for a list of example queries
 */

import React from "react";

import { getUrlToken } from "../../utils/url_utils";

// Map of topic to list of example queries
const TOPIC_QUERIES = {
  agriculture: [
    "What are the primary crops grown in California?",
    "How does the agriculture industry contribute to the economy of the region?",
    "I want to see stats about farming in Mexico",
    "Show me coverage of farmland in Japan",
    "How does climate change affect crops?",
    "How profitable is farming in Michigan?",
    "How does farming affect the environment? <general>",
    "What is the yield of organic vs. conventional farming in Ohio?",
    "Tell me about GMO? <general>",
    "What is the main farming method used in USA?",
    "What factors affect crop production in Louisiana?",
    "What crops will survive the best in the future with global warming?",
    "What are modern farming techniques that improve crop yields? <general>",
    "When is harvest season for different crops and locations?",
    "I want to know about different types of livestock <general>",
    "Areas of land that are suitable for agriculture",
    "Which California counties have the best conditions for growing crops?",
    "Show me the range of inventory for crops and livestock on a farm",
    "What country produces the most crop output?",
    "How much resource does it take to sustain livestock?",
    "How much of the world’s land is used for agriculture?",
    "Impact of livestock on the environment <general>",
    "Prevalence of pesticide use in farm production",
    "What is the most common type of farming in Europe?",
    "What’s the biggest agricultural industry?",
    "How many farms are in the USA?",
    "What’s the average income of a farm in Maine?",
    "Show me how agriculture jobs have changed over the last 5 years",
  ],
  education: [
    "What are the top universities in the US?",
    "What percent of kids go to school in Africa?",
    "What’s the ratio of private vs public school education in Oregon?",
    "Which states have the best teacher to student ratio for primary schooling?",
    "Which countries have good education systems?",
    "Where are the best colleges located?",
    "What percentage of the population can read and write?",
    "Average GPA of students admitted into Harvard each year",
    "How many people in Nevada have a bachelor’s degree or higher?",
    "How does education play a role in employment in the US job market?",
    "Ratio of people with formal vs non formal education in India",
    "What jobs can I get without a high school degree? <general>",
    "Average highschool classroom size in North Dakota compared to South Dakota",
    "How important are test scores in relation to being accepted into college?",
    "Countries with the biggest barriers to quality education",
    "How many primary schools are in the US?",
    "What’s the gender ratio of high school teachers in California",
    "How does school size of urban schools vs rural schools compare?",
    "Prevalence of high school dropout rates organized by state",
    "What is the correlation between household income and test score performance for college entrance exams?",
    "How hard is it to get into UC Berkeley?",
    "What are the most common types of post-secondary school degrees in Europe?",
    "What proportion of the student population has skipped at least one grade?",
    "What are the most popular majors in US universities?",
  ],
  demographics: [
    "Tell me about the population in my area",
    "What’s the average age of the global population?",
    "Racial breakdown of US population",
    "Show me a chart of population growth rate over the last 20 years",
    "How much of the population is married?",
    "How has population density in South Korea changed this century?",
    "What percent of the population is divorced?",
    "What is the average number of kids per family?",
    "How does the population of Florida differ from that of Texas?",
    "What’s the distribution of religions in the US?",
    "How hard is it to become a US citizen? <general>",
    "Show me census data about California",
    "What’s the gender ratio of the entire world",
    "Tell me about gender equity in Europe",
    "Which countries have the lowest life expectancy?",
    "How has life expectancy changed over the last 50 years?",
    "List out the countries with the highest population density",
    "Immigration rates for Canada over time",
    "What countries don’t allow for dual citizenship? <general>",
    "Show me immigration patterns across the world",
    "How have birth rates changed over time in Asia?",
    "What’s the relationship between mortality rate and gdp?",
    "How many people over 18 still live with their parents?",
    "What countries have the most people living in them?",
    "Which countries have the biggest decrease in population?",
    "Show me areas that have a declining birth rate",
    "What percentage of the population is born outside of the country?",
    "How does the literacy rate change across different states?",
  ],
  crime: [
    "What is crime like in my area?",
    "How many crimes were committed last year?",
    "How has crime rate changed in the past 10 years?",
    "Areas with the highest crime rate",
    "Areas with the lowest crime rate",
    "How many people are in jail right now?",
    "I want to view hate crime statistics",
    "Safest countries in the world",
    "Most dangerous countries to travel to",
    "Show me crimes based on demographics of victims",
    "What’s the relationship between crime rate and income?",
    "What types of crime are the most common?",
    "Prisoner to guard ratio in different prisons",
    "Crime rates by city",
    "How well funded is the police in my area?",
    "Is crime increasing or decreasing in Latin America?",
    "What is the punishment for different crimes in the US? <general>",
    "Which countries are the most strict about criminal punishment?",
    "What percent of people get acquitted from criminal charges?",
    "Prevalence of early release from prison",
    "What state has had the biggest decrease in crime over the past decade?",
    "What crimes are considered felonies vs misdemeanors? <general>",
    "What’s the worst crime punishable by law? <general>",
    "What is prison funding like in Texas?",
    "Show me the connection between countries for international jurisdiction <general>",
    "What is the impact of crime on society?",
    "How has police funding changed over time?",
    "How much does it cost society to deal with crime each year?",
  ],
  environment: [
    "Which cities have the lowest level of carbon emissions per capita?",
    "Tell me about environmental policies in Texas <general>",
    "What kind of pollution affects Seattle in the summer?",
    "What is Canada doing to protect the environment? <general>",
    "What forms of renewable energy are being used in California?",
    "Which countries have the biggest increase in pollution over the last 10 years?",
    "Where does most oil and gas production come from?",
    "How have forest fires changed California in the last decade?",
    "What factors are affecting deforestation?",
    "What countries are most affected by hurricanes?",
    "When is monsoon season in Southeast Asia?",
    "Which US cities have the nicest temperature year round?",
    "What type of pollutant is most common in the air?",
    "What types of trees are in my area?",
    "What countries have tap water that is safe for drinking?",
    "What’s the rate of water withdrawal along the LA coastline?",
    "Which cities have the most improved air quality since 2000?",
    "What is the government doing to protect wildlife in the US? <general>",
    "List out countries with the worst AQI",
    "What areas in the world are most likely to be affected by drought?",
    "How much of Europe experiences snowfall in the winter?",
    "How likely is my current area to be affected by flooding?",
  ],
  economy: [
    "What’s the average household income in the US?",
    "What’s unemployment like these days?",
    "Tell me about the GDP of France",
    "What factors affect the economy? <general>",
    "How has inflation changed over the past decade?",
    "What is the typical salary in London?",
    "What are the most common jobs in Panama?",
    "How does cost of living differ across the world?",
    "Which countries have the largest gender pay gap?",
    "Top 3 biggest industries in the UK",
    "What US cities have the best standard of living?",
    "What are the most valuable companies in the world?",
    "Which stocks have grown the most since 2008?",
    "How much annual income would I need to make to live comfortably in New york city?",
    "How many billionaires live in each country?",
    "Which industries are growing the fastest right now?",
    "Which economic models are used in which countries <general>",
    "What does the government spend its money on?",
    "Which countries have the fastest growing GDP per capita?",
    "How is the US doing on pay equality?",
    "Which are the richest countries in the world?",
    "How has the GINI index of California changed this decade?",
    "How much have gas prices increased in the US since 2000?",
    "Which industries have the most new jobs on the market?",
    "Which states have the highest minimum wage?",
    "What is the relationship between income and educational attainment?",
  ],
  housing: [
    "What’s the average size of a US household?",
    "What percent of people own a house in California?",
    "How has the average cost of a home changed over time?",
    "How many people live alone in Alabama?",
    "How much of the US population is without a permanent home?",
    "Change in property tax rates in my area over the last decade",
    "What percent of people live in a home with more people than bedrooms?",
    "What’s the average cost of renting a one bedroom apartment in New York City?",
    "How many people live in US military quarters?",
    "What’s the average age of residents of nursing homes?",
    "What percent of homeowners own a second home?",
    "How have mortgage rates changed since 2000?",
    "What percent of rental units are currently vacant in Orlando Florida?",
    "Which countries in Europe have the most affordable housing compared to annual income?",
    "What’s the average age of a free standing home in London?",
    "What is the relationship between school district ratings and home prices?",
    "What’s the average time it takes for a house in LA to sell once it’s listed on the market?",
    "What percentage of families share a home with another family in Cuba?",
    "How much would I need to make per year to afford a 2 bedroom apartment in Paris in 5 years?",
    "Show me cities with the highest increase in home prices in the last 3 years?",
    "What percentage of homes in the US are owned by foreign residents?",
    "How much of Brooklyn’s apartments are rent controlled?",
    "What percent of millennials own a home?",
  ],
  sustainability: [
    "Show me wet bulb temperatures for India",
    "Which areas of the US have a composting system in place?",
    "What is the predicted sea level rise over the next 15 years?",
    "What factors affect climate change? <general>",
    "Show me global temperature increase predictions over the next decade",
    "How many states encourage recycling?",
    "I want to see global warming trends",
    "How many more people have electric cars instead of gas cars compared to 20 years ago?",
    "Which cities have switched to using compostable plastics?",
    "Which countries have the smallest carbon footprint?",
    "How has the rate of the ice caps melting changed over the century?",
    "How has the EU government contributed to improving sustainability over the last decade? <general>",
    "How have poverty rates in South America changed since 2010?",
    "Countries with the best universal health care",
    "What is the impact of pollution on ocean life in Tulum?",
    "How much of the African population has access to clean drinking water?",
    "Which countries have the best access to affordable and clean energy?",
    "Extinction rate of endangered animals over time",
    "How has the climate in my area shifted over the past 50 years?",
    "How much has malnutrition decreased over time in Latin America?",
    "Which US counties have banned plastic straws? <general>",
    "Which countries have recently put policies in place to conserve the oceans? <general>",
    "Show me greenhouse gas emissions levels across the globe",
  ],
  biomedical: [
    "What is the prevalence of heart disease in Texas?",
    "How does the prevalence of heart disease correlate with projected temperatures in the US?",
    "What is the prevalence of asthma in Asia?",
  ],
};

interface QueryExamplesPropType {
  // Callback function for exmple item clicks.
  onItemClick: (queries: string[]) => void;
}

export function QueryExamples(props: QueryExamplesPropType): JSX.Element {
  const topic = getUrlToken("topic");
  if (!topic || !TOPIC_QUERIES[topic]) {
    return null;
  }
  const examples = TOPIC_QUERIES[topic];
  return (
    <div className="container nl-examples">
      <h3>Try one of these queries</h3>
      <div className="examples-container">
        {examples.map((query, i) => {
          return (
            <div
              className="example-item"
              key={i}
              onClick={() => props.onItemClick([query])}
              title={query}
            >
              {query}
            </div>
          );
        })}
      </div>
    </div>
  );
}
