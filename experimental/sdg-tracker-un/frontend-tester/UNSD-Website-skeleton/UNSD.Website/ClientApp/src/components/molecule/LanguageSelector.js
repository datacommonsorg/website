import React, { useContext, useEffect, useState } from 'react';
import { languageOptions, enableLanguageforPage} from '../../languages';
import { LanguageContext } from '../../containers/Language';
import { createBrowserHistory } from 'history';
import { commonConstants } from '../../helper/Common/CommonConstants';
import { routePathConstants } from '../../helper/Common/RoutePathConstants';


export const history = createBrowserHistory({
    basename: process.env.PUBLIC_URL
});



 export default function LanguageSelector() {
     const { userLanguage, userLanguageChange } = useContext(LanguageContext);
     const [islanguageenable, enableLanguage] = useState(commonConstants.SETTRUE);
     const handleLanguageChange = (e,data) => {
        e.preventDefault();
         let previousDirection = window.localStorage.getItem('dir');

         userLanguageChange(data.languageCode);

         // this is called when user is on any page that supports language and user changes the language
         if (data.direction == commonConstants.BODY_DIRECTION_RIGHT && previousDirection != data.direction) {
           
              history.go(`${commonConstants.BASE_URL}/${commonConstants.LANGUAGE_ARABIC}`) 
         }
         else if (data.direction == commonConstants.BODY_DIRECTION_LEFT && previousDirection != data.direction)
         {
              history.go(`${commonConstants.BASE_URL}/${commonConstants.DEFAULT_LANGUAGE}`)
         }

      
        

    };
    
    useEffect(() => {  // this hook is called on load as well as when the language is changed
       
        let islangenable = true
        // enableLanguageforPage objects containing name of the page for which language is enabled
        for (let initLanCount = 0; initLanCount < enableLanguageforPage.length; initLanCount++) {

            if (window.location.pathname.toLowerCase() == enableLanguageforPage[initLanCount].toLowerCase() || window.location.pathname.toLowerCase() == routePathConstants.HOME_PATH.toLowerCase() || window.location.pathname.toLowerCase() == routePathConstants.HOME_PATH.toLowerCase()+'/') {
                // setting isLanguageflag to true
                enableLanguage(commonConstants.SETTRUE);
                islangenable = commonConstants.SETTRUE
                break;       // <=== breaks out of the loop early
            }
            else {
                 // setting isLanguageflag to false
                enableLanguage(commonConstants.SETFALSE);
                islangenable = commonConstants.SETFALSE
                
            }

        }

        if (islangenable == true) {  // if language is eanbled for the page set the language

           
            let defaultLanguage = window.localStorage.getItem('rcml-lang');
            if (!defaultLanguage) {
                defaultLanguage = window.navigator.language.substring(0, 2);
            }

            // check if the cuurent direction is LTR and language as arabic (will happen only in cases if the Arabic language was selected and user moved to page where language is not supported and again navigates to page where the language is supported)
            if (window.localStorage.getItem('dir') == commonConstants.BODY_DIRECTION_LEFT && defaultLanguage== 'ar')
            {
                window.localStorage.setItem('dir', commonConstants.BODY_DIRECTION_RIGHT);
                history.go(`${commonConstants.BASE_URL}/${commonConstants.LANGUAGE_ARABIC}`)
            }
            userLanguageChange(defaultLanguage)
        }
        else {
            // if language is not eanbled for the page set the the current body direction to 'LTR' if   is 'RTL' 
            if (window.localStorage.getItem('dir') == commonConstants.BODY_DIRECTION_RIGHT) {
                window.localStorage.setItem('dir', commonConstants.BODY_DIRECTION_LEFT);
                history.go(`${commonConstants.BASE_URL}/${commonConstants.DEFAULT_LANGUAGE}`)
            }
        }

    }, [], [userLanguageChange]); 
     

    
     return (
      
         <React.Fragment>
             {islanguageenable &&
                 <ul className="nav language-links">
                     {languageOptions.map(data => (

                         <li key={data.languageCode} className="ar first"><a id={data.languageCode} href="/ar" className={userLanguage == data.languageCode ? "language-link active" : "language-link"} xmlLang={data.languageCode} role="menuitem" onClick={(e) => handleLanguageChange(e, data)}>{data}</a></li>
                     ))}
                 </ul>
             }
        </React.Fragment>
    );
}


