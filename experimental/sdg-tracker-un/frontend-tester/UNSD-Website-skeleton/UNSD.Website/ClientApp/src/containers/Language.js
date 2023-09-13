import React, { useState, createContext, useContext } from "react";
import { languageOptions } from "../languages";
import { commonConstants } from "../helper/Common/CommonConstants";
import { routePathConstants } from "../helper/Common/RoutePathConstants";
import parse from 'html-react-parser';

let languageContext;

// create the language context with default selected language
export const LanguageContext = createContext({
  userLanguage: "en",
});

// it provides the language context to app
export function LanguageProvider({ children }) {
  const [userLanguage, setUserLanguage] = useState("en");

  const LTR_Theme = React.lazy(() => import("../themes/LTR_Theme"));
  const RTL_Theme = React.lazy(() => import("../themes/RTL_Theme"));

  const provider = {
    userLanguage,
    userLanguageChange: (selected) => {
      const newLanguage = languageOptions.filter(
        (dataitem) => dataitem.languageCode == selected
      )
        ? selected
        : "en";
      setUserLanguage(newLanguage);
      window.localStorage.setItem("rcml-lang", newLanguage);
      window.localStorage.setItem(
        "dir",
        languageOptions.filter(
          (dataitem) => dataitem.languageCode == selected
        )[0].direction
      );
    },
  };

  return (
    <LanguageContext.Provider value={provider}>
      <React.Suspense fallback={<></>}>
        {window.localStorage.getItem("dir") === null && <LTR_Theme />}
        {window.localStorage.getItem("dir") ===
          commonConstants.BODY_DIRECTION_LEFT && <LTR_Theme />}
        {window.localStorage.getItem("dir") ===
          commonConstants.BODY_DIRECTION_RIGHT && <RTL_Theme />}

        {children}
      </React.Suspense>
    </LanguageContext.Provider>
  );
}

export function textAsString(tid, lang) {
  return readData(lang, tid);
}

// //get text according to id & current language
export function Text({ tid }) {
  languageContext = useContext(LanguageContext);
  return parse(readData(languageContext.userLanguage, tid));
}

//#region Read Languagedata
// function will Read data from the JSON file as per the page
function readData(language, tid) {
  var commonctrlLang;
  var navMenulang;
    var dataforNowlang;
    var QuickLinks;
  var lang;
    let selectedLang = typeof language == "string" ? language : language.userLanguage;

  if (selectedLang === "es") {
    navMenulang = require("../languages/NavMenu/es.json");
    commonctrlLang = require("../languages/Common/es.json");

   
      lang = require("../languages/Home/es.json");

  } else if (selectedLang === "ar") {
    navMenulang = require("../languages/NavMenu/ar.json");
    commonctrlLang = require("../languages/Common/ar.json");
    
      lang = require("../languages/Home/ar.json");
  
  } else if (selectedLang === "zh") {
    navMenulang = require("../languages/NavMenu/zh.json");
    commonctrlLang = require("../languages/Common/zh.json");

      lang = require("../languages/Home/zh.json");

  } else if (selectedLang === "ru") {
    navMenulang = require("../languages/NavMenu/ru.json");
    commonctrlLang = require("../languages/Common/ru.json");
    
      lang = require("../languages/Home/ru.json");
    
  } else if (selectedLang === "fr") {
    navMenulang = require("../languages/NavMenu/fr.json");
    commonctrlLang = require("../languages/Common/fr.json");

    
      lang = require("../languages/Home/fr.json");
    
  } else {
    navMenulang = require("../languages/NavMenu/en.json");
    commonctrlLang = require("../languages/Common/en.json");
       

    
      lang = require("../languages/Home/en.json");
    
  }

    let langLabel = Object.assign(lang, commonctrlLang, navMenulang, dataforNowlang, QuickLinks);
  const dictionarylist = { langLabel };
  const dict = dictionarylist["langLabel"];
  return dict[tid] || tid;
}
//#endregion

function readResourceCatalogLang(lang) {
    let fileName = `${lang}.json`;
    let langFile, main, deleverables, membership, workscope, wArrangements;
    let routePath = window.location.href.toLowerCase();

    
    return langFile;
}