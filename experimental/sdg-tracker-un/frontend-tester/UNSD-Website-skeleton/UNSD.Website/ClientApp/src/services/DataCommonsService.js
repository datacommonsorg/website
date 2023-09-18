import API from "../helper/Config/API";
import { commonConstants } from "../helper/Common/CommonConstants";

export const getDataCommonsSdgDetails = (id) => {
  /* return API.get("News/get")
       .then(function (response) {
         if (response.status === 200 && response != null) {
           var data = response.data;
           return data;
         }
       })
       .catch(function (error) {
         return []; 
       });*/

  const sdgItems = {
    1: {
      key: "1",
      icon: "https://sdgs.un.org/sites/default/files/goals/E_SDG_Icons-01.jpg",
      alt: "SDG 1",
      label: "No Poverty",
      title: "Goal 1: No Poverty",
      sections: [
        {
          layout: "widgetText",
          blurb: {
            title:
              "widgetText: The United Nations has set an ambitious target through Sustainable Development Goal 1: to end poverty in all its forms by 2030.",
            body: "This goal recognizes the urgent need to address the root causes of poverty, promote inclusive economic growth, and ensure equal access to essential resources and opportunities for all. By tackling poverty comprehensively and holistically, the UN aims to create a world where no one is left behind, paving the way for a more equitable and sustainable future for humanity.",
          },
          widget: {
            type: "map",
            title:
              "Proportion of population below international poverty line",
            variable: "sdg/SI_POV_DAY1",
            parentPlace: "Earth",
            childPlaceType: "Country",
          },
        },
        {
          layout: "textWidget",
          blurb: {
            title: "textWidget: Poverty is a challenge",
            body: "Poverty levels continue to present a significant challenge on a global scale. Despite progress in reducing poverty over the years, millions of people around the world still struggle to meet their basic needs. Economic disparities, limited access to resources, and systemic inequalities contribute to persistent poverty, highlighting the urgent need for concerted efforts and sustainable solutions to alleviate this pressing issue.",
          },
          widget: {
            type: "ranking",
            title:
            "Countries with highest proportion of population below international poverty line",
            variable: "sdg/SI_POV_DAY1",
            parentPlace: "Earth",
            childPlaceType: "Country",
          },
        },
        {
          layout: "widgetText",
          blurb: {
            title: "widgetText: Poverty is about more than just income",
            body: "Multidimensional poverty considers various factors, such as health, education, standard of living, access to basic services, and social exclusion, to provide a more comprehensive understanding of poverty. The Multidimensional Poverty Index (MPI) is one commonly used metric to assess multidimensional poverty. It was developed by the United Nations Development Programme (UNDP) and the Oxford Poverty and Human Development Initiative (OPHI). The MPI takes into account different indicators within the dimensions mentioned above and provides a percentage of the population living in multidimensional poverty.",
          },
          widget: {
            type: "line",
            title:
              "Proportion of population living in multidimensional poverty (%)",
            variables: "sdg/SD_MDP_MUHC",
            place: "country/ARM" ,
          },
        },
        {
          layout: "onlyWidget",
          blurb: {
            title: "onlyWidget: Lorem ipsum dolor sit amet",
            body: "Neque laoreet suspendisse interdum consectetur. Adipiscing vitae proin sagittis nisl rhoncus. Tortor id aliquet lectus proin nibh nisl. Libero enim sed faucibus turpis in eu mi bibendum neque. Amet venenatis urna cursus eget nunc. Vestibulum lectus mauris ultrices eros. ",
          },
          widget: {
            type: "map",
            title:
              "Proportion of population below international poverty line",
            variable: "sdg/SI_POV_DAY1",
            parentPlace: "Earth",
            childPlaceType: "Country",
          },
        },
        {
          layout: "onlyText",
          blurb: {
            title:
              "onlyText: Climate change exasperates poverty",
            body: "The impacts of climate change, such as extreme weather events, rising sea levels, and disruptions to ecosystems, pose significant challenges to economies, livelihoods, and social well-being. By prioritizing resilience, countries can adapt to these changes, protect vulnerable populations, safeguard infrastructure, and foster sustainable development, ensuring a more secure and prosperous future for their citizens.",
          },
          widget: {},
        },
      ],
    },
    2: {
      key: "2",
      icon: "https://sdgs.un.org/sites/default/files/goals/E_SDG_Icons-02.jpg",
      alt: "SDG 2",
      label: "Zero Hunger",
      title: "Goal 2: Zero Hunger",
      sections: [
        {
          layout: "widgetText",
          blurb: {
            title: "widgetText:SDG 2",
            body: "The United Nations is committed to achieving Sustainable Development Goal 2: Zero Hunger. This goal aims to ensure access to safe, nutritious, and sufficient food for all people, while promoting sustainable agriculture and ending malnutrition in all its forms. By addressing the systemic issues that contribute to hunger, such as poverty, inequality, and climate change, the UN strives to create a world where everyone has the fundamental right to food security and where hunger becomes a thing of the past, contributing to healthier populations and sustainable development.",
          },
          widget: {
            type: "map",
            title:
              "Proportion of population below international poverty line",
            variable: "sdg/SI_POV_DAY1",
            parentPlace: "Earth",
            childPlaceType: "Country",
          },
        },
        {
          layout: "textWidget",
          blurb: {
            title: "textWidget: Undernourishment",
            body: "Undernourishment remains a pressing global concern, affecting millions of individuals across various regions. Despite advancements in food production and distribution, a significant portion of the global population still lacks access to sufficient, nutritious food. Factors such as poverty, conflict, climate change, and unequal distribution of resources contribute to the persistence of undernourishment, necessitating collective action and targeted interventions to ensure food security for all.",
          },
          widget: {
            type: "map",
            title:
              "Proportion of population below international poverty line",
            variable: "sdg/SI_POV_DAY1",
            parentPlace: "Earth",
            childPlaceType: "Country",
          },
        },
        {
          layout: "widgetText",
          blurb: {
            title:
              "widgetText:We need to raise food production",
            body: "Raising agricultural production is vital in the global effort to end world hunger. With a growing population and increasing food demand, it is crucial to enhance agricultural productivity sustainably. By investing in modern farming techniques, technology, infrastructure, and access to markets, we can improve yields, enhance food availability, and ensure a stable supply of nutritious food, contributing to the eradication of hunger and achieving global food security. Empowering small-scale farmers, promoting sustainable practices, and supporting agricultural innovation are key steps towards a future where no one goes hungry.",
          },
          widget: {
            type: "map",
            title:
              "Proportion of population below international poverty line",
            variable: "sdg/SI_POV_DAY1",
            parentPlace: "Earth",
            childPlaceType: "Country",
          },
        },
      ],
    },
  };
  if (id != "1" && id != "2") id = "1";
  return sdgItems[id];
};
