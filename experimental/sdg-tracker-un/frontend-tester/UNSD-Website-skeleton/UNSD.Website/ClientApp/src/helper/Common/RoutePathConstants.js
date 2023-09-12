export const routePathConstants = {
    MORE_FEATURED_VIDEO: "https://www.youtube.com/user/UNStats/playlists",
    MORE_FEATURED_VIDEO_D4N: "https://www.youtube.com/playlist?list=PLBc4lThqX-WOBuuRFUXa-yy3AztsAJ_6I",
  HOME_PATH: process.env.PUBLIC_URL,
    ABOUT_PATH: process.env.PUBLIC_URL + "/about/",
    DATA_COMMONS: process.env.PUBLIC_URL + "/undatacommons/sdgs/",
  STATEMENT_PATH: process.env.PUBLIC_URL + "/statements/",
  BIOGRAPHY_PATH: process.env.PUBLIC_URL + "/about/directorbiography/",
  EVENT_ID_PATH: process.env.PUBLIC_URL + "/events/:eventId?",
  EVENT_PATH: process.env.PUBLIC_URL + "/events/",
  EVENT_DETAILS: process.env.PUBLIC_URL + "/events-details/",
    NEWS_DETAILS: process.env.PUBLIC_URL + "/news-details/",
  FAQ_PATH: process.env.PUBLIC_URL + "/faq/",
  NEWS_PATH: process.env.PUBLIC_URL + "/news/",
  QUESTIONNAIRES_PATH: process.env.PUBLIC_URL + "/questionnaires/",
  STATCOM_PATH: process.env.PUBLIC_URL + "/statcom/",
  STATCOM_SESSION_PATH: process.env.PUBLIC_URL + "/statcom/",
  STATCOM_BUREAU_PATH: process.env.PUBLIC_URL + "/statcom/bureau/",
  STATCOM_70TH_ANNIVERSARY_PATH:
    process.env.PUBLIC_URL + "/statcom/70th-anniversary/",
  STATCOM_60TH_ANNIVERSARY_PATH:
    process.env.PUBLIC_URL + "/statcom/60th-anniversary/",
  STATCOM_INTER_SESSION_ACTIVITIES_PATH:
    process.env.PUBLIC_URL + "/statcom/inter-session-activities/",
  STATCOM_PAST_SESSION_PATH: process.env.PUBLIC_URL + "/statcom/past-sessions/",
  STATCOM_CHAIRPERSONS_PATH:
    process.env.PUBLIC_URL + "/statcom/gallery/chairpersons/",
  STATCOM_PHOTO_GALLERY_PATH: process.env.PUBLIC_URL + "/statcom/gallery/",
  STATCOM_DECISION_PATH: process.env.PUBLIC_URL + "/statcom/decisions/",
  STATCOM_SIDE_EVENTS_PATH: process.env.PUBLIC_URL + "/statcom/side-events/",
  STATCOM_DOCUMENTS_PATH: process.env.PUBLIC_URL + "/statcom/documents/",
  STATCOM_WEBCAST_RECORDING_PATH: process.env.PUBLIC_URL + "/statcom/webcast/",
  STATCOM_COMMUNICATION_PATH:
    process.env.PUBLIC_URL + "/statcom/resources/communication/",
  STATCOM_PARTICIPATION_OF_CIVIL_SOCIETY:
    process.env.PUBLIC_URL + "/statcom/resources/cso-guide/",
  STATCOM_GUIDE_FOR_NGO_PARTICIPATION:
    process.env.PUBLIC_URL + "/statcom/resources/ngo-guide/",
  STATCOM_ORIENTATION_SESSION_FOR_NEWCOMERS:
    process.env.PUBLIC_URL + "/statcom/resources/orientation/",
  PUBLICATIONS_ID_CATALOGUE_PATH:
    process.env.PUBLIC_URL +
    "/Publications/PublicationsCatalogue/:publicationsId?",
  PUBLICATIONS_CATALOGUE_PATH:
    process.env.PUBLIC_URL + "/Publications/PublicationsCatalogue/",
  PUBLICATIONS_PATH: process.env.PUBLIC_URL + "/Publications/",
  PUBLICATIONS_STATISTICS_POCKETBOOK_PATH:
    process.env.PUBLIC_URL + "/Publications/StatisticalPocketbook/",
  PUBLICATIONS_STATISTICAL_YEARBOOK_PATH:
    process.env.PUBLIC_URL + "/Publications/StatisticalYearbook/",
  PUBLICATIONS_STATISTICAL_YEARBOOK_PAST_ISSUE_PATH:
    process.env.PUBLIC_URL + "/Publications/StatisticalYearbookPastIssue/",
  STATCOM_MEDIA_GALLERY_BY_YEAR_PATH:
    process.env.PUBLIC_URL + "/statcom/media-gallery/",
  STATCOM_70TH_ANNIVERSARY_EXHIBTION_POSTER_PATH:
    process.env.PUBLIC_URL + "/statcom/70th-anniversary/gallery/",
  STATCOM_60TH_ANNIVERSARY_MILESTONES_PATH:
    process.env.PUBLIC_URL + "/statcom/60th-anniversary/milestones/",
  STATCOM_60TH_ANNIVERSARY_FACTS_PATH:
    process.env.PUBLIC_URL + "/statcom/60th-anniversary/facts/",
  STATCOM_60TH_ANNIVERSARY_COUNTRY_PARTICOPATION_PATH:
    process.env.PUBLIC_URL + "/statcom/60th-anniversary/countryparticipation/",
  STATCOM_60TH_ANNIVERSARY_SPECIAL_EXHIBITION_PATH:
    process.env.PUBLIC_URL + "/statcom/60th-anniversary/exhibition/",
  STATCOM_70TH_ANNIVERSARY_MILESTONES_PATH:
    process.env.PUBLIC_URL + "/statcom/70th-anniversary/Milestones/",
  STATCOM_60TH_ANNIVERSARY_EXHIBITION_POSTER_PATH:
    process.env.PUBLIC_URL + "/statcom/60th-anniversary/ExhibitionPosters/",
  STATCOM_52SESSION_DATASTEWARDSHIP_PATH:
    process.env.PUBLIC_URL +
    "/statcom/52nd-session/side-events/20210210-1M-data-stewardship-and-the-role-of-NSOs-in-the-changing-data-landscape/",
  STATCOM_51SESSION_COMMUNICATION_PATH:
    process.env.PUBLIC_URL +
    "/statcom/51st-session/resources/Communication-materials-from-partners/",
    JSONEDITOR_PATH: process.env.PUBLIC_URL + '/json-editor'
};

export const PUBLIC_URL_PATH = process.env.PUBLIC_URL;
export const routeCapacityDevelopmentBasepath = "capacity-development";
export const routeCapacityDevelopmentConstants = {
    HOME_PATH: `${PUBLIC_URL_PATH}/${routeCapacityDevelopmentBasepath}/`,
    EVENT_PATH: `${PUBLIC_URL_PATH}/${routeCapacityDevelopmentBasepath}/events/`,
    EVENT_DETAILS: `${PUBLIC_URL_PATH}/${routeCapacityDevelopmentBasepath}/events-details/`,
    NEWS_DETAILS: `${PUBLIC_URL_PATH}/${routeCapacityDevelopmentBasepath}/news-details/`,
    PROJECTS: `${PUBLIC_URL_PATH}/${routeCapacityDevelopmentBasepath}/projects/`,
    DA14: `${PUBLIC_URL_PATH}/${routeCapacityDevelopmentBasepath}/da14/`,
    BIG_DATA_TRAINING: `${PUBLIC_URL_PATH}/${routeCapacityDevelopmentBasepath}/big-data-training/`,
    NATIONAL_STATISTICAL_SYSTEMS: `${PUBLIC_URL_PATH}/${routeCapacityDevelopmentBasepath}/national-statistical-systems/`,
    STATISTICAL_TRAINING: `${PUBLIC_URL_PATH}/${routeCapacityDevelopmentBasepath}/statistical-training/`,
    INITIATIVE: `${PUBLIC_URL_PATH}/${routeCapacityDevelopmentBasepath}/initiative/`,
    // COLLABORATIVE_PATH: process.env.PUBLIC_URL +`/resourcecatalog/`,
    DEVELOPMENT_ACCOUNT: `${PUBLIC_URL_PATH}/${routeCapacityDevelopmentBasepath}/UNSDWebsite/admin-data/`,
    ALL_INITIATIVES: `${PUBLIC_URL_PATH}/${routeCapacityDevelopmentBasepath}/all-initiatives/`,
    ALL_PROJECTS: `${PUBLIC_URL_PATH}/${routeCapacityDevelopmentBasepath}/all-projects/`,
    TRAINING: `${PUBLIC_URL_PATH}/${routeCapacityDevelopmentBasepath}/training/`,
    NEWS_PATH: process.env.PUBLIC_URL + `/${routeCapacityDevelopmentBasepath}/news/`,
    STORIES_BLOG: `${PUBLIC_URL_PATH}/${routeCapacityDevelopmentBasepath}/stories-blog`,
    STORIES_BLOG_DETAILS: `${PUBLIC_URL_PATH}/${routeCapacityDevelopmentBasepath}/stories-blog-details`,
    PUBLICATIONS: `${PUBLIC_URL_PATH}/${routeCapacityDevelopmentBasepath}/publications`,
    PARTNERS_DONORS: process.env.PUBLIC_URL + `/${routeCapacityDevelopmentBasepath}/partners-donors`,
    FAQ: `${PUBLIC_URL_PATH}/${routeCapacityDevelopmentBasepath}/faq`,
    CONTACT: `${PUBLIC_URL_PATH}/${routeCapacityDevelopmentBasepath}/contact/`,
}

export const routeDataforNowBasepath = `${routeCapacityDevelopmentBasepath}/data-for-now`;
export const routeDataforNowPathConstants = {
    HOME_PATH: `${PUBLIC_URL_PATH}/${routeDataforNowBasepath}/`,
    NEWS_PATH: `${PUBLIC_URL_PATH}/${routeDataforNowBasepath}/news/`,
    EVENT_PATH: `${PUBLIC_URL_PATH}/${routeDataforNowBasepath}/events/`,
    STORIES: `${PUBLIC_URL_PATH}/${routeDataforNowBasepath}/stories`,
    GUIDING_PRINCIPLE: `${PUBLIC_URL_PATH}/${routeDataforNowBasepath}/guiding-principle`,
    COUNTRYLANDING: `${PUBLIC_URL_PATH}/${routeDataforNowBasepath}/country`,
    DONORS: `${PUBLIC_URL_PATH}/${routeDataforNowBasepath}/donors`,
    STORYDETAILS: `${PUBLIC_URL_PATH}/${routeDataforNowBasepath}/story-details/`,
    COUNTRYDETAILS: `${PUBLIC_URL_PATH}/${routeDataforNowBasepath}/country-details/`,
    PARTNERS: `${PUBLIC_URL_PATH}/${routeDataforNowBasepath}/partners`,
    EVENT_DETAILS: `${PUBLIC_URL_PATH}/${routeDataforNowBasepath}/events-details/`,
    NEWS_DETAILS: `${PUBLIC_URL_PATH}/${routeDataforNowBasepath}/news-details/`
}

export const routeCitizenDataBasepath = `citizen-data`;
export const routeCitizenDataPathConstants = {
    HOME_PATH: `${PUBLIC_URL_PATH}/${routeCitizenDataBasepath}/`,
    NEWS_PATH: `${PUBLIC_URL_PATH}/${routeCitizenDataBasepath}/news/`,
    EVENT_PATH: `${PUBLIC_URL_PATH}/${routeCitizenDataBasepath}/events/`,
    PROJECTS: `${PUBLIC_URL_PATH}/${routeCitizenDataBasepath}/projects/`,
    RESOURCES: `${PUBLIC_URL_PATH}/${routeCitizenDataBasepath}/resources/`,
    RESOURCEDETAILS: `${PUBLIC_URL_PATH}/${routeCitizenDataBasepath}/resource-details/`,
    PROJECTDETAILS: `${PUBLIC_URL_PATH}/${routeCitizenDataBasepath}/project-details/`,    
    EVENT_DETAILS: `${PUBLIC_URL_PATH}/${routeCitizenDataBasepath}/events-details/`,
    NEWS_DETAILS: `${PUBLIC_URL_PATH}/${routeCitizenDataBasepath}/news-details/`
}

export const routeResourceCatalogBasepath = `${routeCapacityDevelopmentBasepath}/admin-data`;
export const routeResourceCatalogPathConstants = {
    HOME_PATH: `${PUBLIC_URL_PATH}/${routeResourceCatalogBasepath}/`,
    CLINIC: `${PUBLIC_URL_PATH}/${routeResourceCatalogBasepath}/clinic`,
    CLINIC1: `${PUBLIC_URL_PATH}/${routeResourceCatalogBasepath}/clinic1`,
    CLINIC2: `${PUBLIC_URL_PATH}/${routeResourceCatalogBasepath}/clinic2`,
    CLINIC3: `${PUBLIC_URL_PATH}/${routeResourceCatalogBasepath}/clinic3`,
    CLINIC4: `${PUBLIC_URL_PATH}/${routeResourceCatalogBasepath}/clinic4`,
    INVENTORY: `${PUBLIC_URL_PATH}/${routeResourceCatalogBasepath}/inventory`,
    DETAILED_VIEW: `${PUBLIC_URL_PATH}/${routeResourceCatalogBasepath}/detailedView`,
    DETAILED_RESOURCE_VIEW: `${PUBLIC_URL_PATH}/${routeResourceCatalogBasepath}/detailedResourceView`,
    DETAILED_VIEW_NO_CASE: `${PUBLIC_URL_PATH}/${routeResourceCatalogBasepath}/DetailedViewNoCaseStudy`,
    TEAM_TASK1: `${PUBLIC_URL_PATH}/${routeResourceCatalogBasepath}/teamTasks1`,
    TEAM_TASK2: `${PUBLIC_URL_PATH}/${routeResourceCatalogBasepath}/teamTasks2`,
    TEAM_TASK3: `${PUBLIC_URL_PATH}/${routeResourceCatalogBasepath}/teamTasks3`,
    PRINCIPLE: `${PUBLIC_URL_PATH}/${routeResourceCatalogBasepath}/principles`,
    EVENTS: `${PUBLIC_URL_PATH}/${routeResourceCatalogBasepath}/events`,
    BLOG: `${PUBLIC_URL_PATH}/${routeResourceCatalogBasepath}/blog`,
    TOOL: `${PUBLIC_URL_PATH}/${routeResourceCatalogBasepath}/tools`,
    MOU: `${PUBLIC_URL_PATH}/${routeResourceCatalogBasepath}/tools/mou`,
    LGL_ASS_TOOL: `${PUBLIC_URL_PATH}/${routeResourceCatalogBasepath}/tools/legalAssessmentTool`,
    QA_TOOL: `${PUBLIC_URL_PATH}/${routeResourceCatalogBasepath}/tools/qualityAssessmentTool`,
    WEBINAR: `${PUBLIC_URL_PATH}/${routeResourceCatalogBasepath}/webinar`,
    TRAINING: `${PUBLIC_URL_PATH}/${routeResourceCatalogBasepath}/training`
}

export const routeNqafBasepath = "data-quality";
export const routeNqafConstants = {
    HOME_PATH: process.env.PUBLIC_URL + `/${routeNqafBasepath}`,
    USER_MANUAL: `${PUBLIC_URL_PATH}/${routeNqafBasepath}/user-manual`,
    CHECK_LIST: `${PUBLIC_URL_PATH}/${routeNqafBasepath}/check-list`,
    GLOSSARY: `${PUBLIC_URL_PATH}/${routeNqafBasepath}/glossary`
}

export const routeDataCommonsBasepath = "undatacommons/sdgs";
export const routeDataCommonsConstants = {
    HOME_PATH: process.env.PUBLIC_URL + `/${routeDataCommonsBasepath}/`,
    COUNTRY: `${PUBLIC_URL_PATH}/${routeDataCommonsBasepath}/countries`,
    GOAL: `${PUBLIC_URL_PATH}/${routeDataCommonsBasepath}/goals`,
    TOPIC: `${PUBLIC_URL_PATH}/${routeDataCommonsBasepath}/topics`,
    SEARCH: `${PUBLIC_URL_PATH}/${routeDataCommonsBasepath}/search`
}

