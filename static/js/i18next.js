import i18n from "i18next";
import Backend from "i18next-http-backend";
import postProcessor from "i18next-sprintf-postprocessor";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(postProcessor)
  .use(initReactI18next)
  .init({
    fallbackLng: "en-US",
    preload: ["en-US", "es"],
    supportedLngs: ["en-US", "es"],
    ns: ["place"],
    defaultNS: "place",
    backend: { loadPath: "/locales/{{lng}}/{{ns}}.json" },
  });

export default i18n;
