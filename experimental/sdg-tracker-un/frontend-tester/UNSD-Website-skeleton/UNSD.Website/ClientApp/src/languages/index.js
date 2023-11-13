import { commonConstants } from "../helper/Common/CommonConstants";
import { routePathConstants } from "../helper/Common/RoutePathConstants";

// langauge that will be listed on to the Brand bar
export const languageOptions = [
  {
    languageName: "English",
    languageCode: "en",
    direction: commonConstants.BODY_DIRECTION_LEFT,
  },
  {
    languageName: "Español",
    languageCode: "es",
    direction: commonConstants.BODY_DIRECTION_LEFT,
  },
  {
    languageName: "Français",
    languageCode: "fr",
    direction: commonConstants.BODY_DIRECTION_LEFT,
  },
  {
    languageName: "العربية",
    languageCode: "ar",
    direction: commonConstants.BODY_DIRECTION_RIGHT,
  },
  {
    languageName: "中国人",
    languageCode: "zh",
    direction: commonConstants.BODY_DIRECTION_LEFT,
  },
  {
    languageName: "русский",
    languageCode: "ru",
    direction: commonConstants.BODY_DIRECTION_LEFT,
  },
];

export const enableLanguageforPage = [
  routePathConstants.ABOUT_PATH,
  routePathConstants.FAQ_PATH,
];
