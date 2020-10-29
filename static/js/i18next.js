import i18n from "i18next";
import Backend from "i18next-http-backend";
import postProcessor from "i18next-sprintf-postprocessor";
import LanguageDetector from "i18next-browser-languagedetector";

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(postProcessor)
  .init({
    defaultNS: "en-US",
    preload: ["en-US", "es"],
    supportedLngs: ["en-US", "es"],
    ns: ["dev_page"],
    defaultNS: "dev_page",
    backend: { loadPath: "/locales/{{lng}}/{{ns}}.json" },
  });

export default i18n;
