import Moment from "moment";
import { commonConstants } from "../helper/Common/CommonConstants";
import toaster from "toasted-notes";
import "toasted-notes/src/styles.css";

const randomstring = require("randomstring");

export const SetInfoMessage = (message) => {
  toaster.notify(message, {
    duration: commonConstants.TOASTER_DURATION,
    position: commonConstants.TOASTER_POSITION,
  });
};

export const DateFormat = (date) => {
  if (date != null && date != "0001-01-01T00:00:00") {
    return Moment(date).format("D").length == 1
      ? Moment(date).format("MMM 0D, yyyy")
      : Moment(date).format("MMM D, yyyy");
  }
  return "";
};

export const GetYear = (date) => {
  if (date != null && date != "0001-01-01T00:00:00") {
    return Moment(date).format("yyyy");
  }
  return "";
};

export const TabHeadingFormat = (value) => {
  let headerDate = "";
  if (String(value).split(";").length > 0) {
    let splitDate = String(value).split(";");
    for (var dateint = 0; dateint < splitDate.length; dateint++)
      if (value != null && value != "0001-01-01T00:00:00" && value != "") {
        var date = Moment(splitDate[dateint], "DD-MM-YYYY");
        if (headerDate == "") {
          headerDate =
            Moment(date).format("D") +
            " " +
            Moment(date).format("MMMM") +
            " (" +
            Moment(date).format("dddd") +
            ")";
        } else {
          headerDate =
            headerDate +
            " - " +
            Moment(date).format("D") +
            " " +
            Moment(date).format("MMMM") +
            " (" +
            Moment(date).format("dddd") +
            ")";
        }
      }
  } else {
    if (value != null && value != "0001-01-01T00:00:00" && value != "") {
      var date = Moment(value, "DD-MM-YYYY");

      headerDate =
        Moment(date).format("D") +
        " " +
        Moment(date).format("MMMM") +
        " (" +
        Moment(date).format("dddd") +
        ")";
    }
  }

  return headerDate;
};

export const TimeFormat = (date) => {
  if (date != null && date != "0001-01-01T00:00:00") {
    return Moment(date).format("H:mm");
  }
  return "";
};

export const CheckNullOrEmptyValue = (value) => {
  return value == null ||
    value == "" ||
    value == "0001-01-01T00:00:00" ||
    value == undefined ||
    value == "Invalid date"
    ? commonConstants.SETTRUE
    : commonConstants.SETFALSE;
};

export const FileType = (fileName) => {
  var re = /(?:\.([^.]+))?$/;
  return re.exec(fileName)[1];
};

export const LastIndexValue = (value, type) => {
  var parts = value.split(type);
  return parts.pop();
};

export const ArrayToString = (value) => {
  if (CheckNullOrEmptyValue(value)) return "";
  let result = value.map((item, index) => {
    let type = item.includes("/") ? "/" : item.includes("//") ? "//" : "\\"; // split type
    return index == 0
      ? " " + LastIndexValue(item, type)
      : ", " + LastIndexValue(item, type);
  });
  return result;
};

export const isMobile = () => {
  const { innerWidth: width } = window;
  let mediaQueryMinWidth = 320,
    mediaQueryMaxWidth = 825;
  return width >= mediaQueryMinWidth && width <= mediaQueryMaxWidth;
};

export const getOrdinalNum = (n) => {
  return (
    n +
    (n > 0
      ? ["th", "st", "nd", "rd"][(n > 3 && n < 21) || n % 10 > 3 ? 0 : n % 10]
      : "")
  );
};

export const getMonthNameOnDate = (date) => {
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  var newDate = new Date(date);
  return monthNames[newDate.getMonth() - 1];
};

export const getMonthNameOnMonth = (month) => {
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return monthNames[month - 1];
};
export const customizedMultipleDate = (dateArray) => {
  let finalDate;
  var date;
  if (dateArray) {
    if (dateArray.length == 1) {
      finalDate = dateArray.map(function (item, index) {
        date = Moment(item, "DD-MM-YYYY");
        return (
          Moment(date).format("D") +
          " " +
          Moment(date).format("MMMM") +
          " " +
          Moment(date).format("yyyy")
        );
      });
    }
    if (dateArray.length == 2) {
      finalDate = dateArray.map(function (item, index) {
        date = Moment(item, "DD-MM-YYYY");
        return index == 0
          ? Moment(date).format("D")
          : " - " +
              Moment(date).format("D") +
              " " +
              Moment(date).format("MMMM") +
              " " +
              Moment(date).format("yyyy");
      });

      finalDate = finalDate.toString().replace(/,/g, "");
    }

    if (dateArray.length == 3) {
      finalDate = dateArray.map(function (item, index) {
        date = Moment(item, "DD-MM-YYYY");
        return index == 0
          ? Moment(date).format("D")
          : index == 1
          ? ",  " + Moment(date).format("D")
          : " and " +
            Moment(date).format("D") +
            " " +
            Moment(date).format("MMMM") +
            " " +
            Moment(date).format("yyyy");
      });
    }
  }
  return finalDate;
};

export const customizedFormat = (value) => {
  if (value != null && value != "0001-01-01T00:00:00" && value != "") {
    var date = Moment(value, "DD-MM-YYYY");
      if (date.isValid()) {
    return (
      Moment(date).format("D") +
      " " +
      Moment(date).format("MMMM") +
      " " +
      Moment(date).format("yyyy")
    );
  }
      else {
          return value;
      }
  }
  return "";
};

export const getLanguageType = (param) => {
  switch (param) {
    case "A":
      return "Arabic";
    case "C":
      return "Chinese";
    case "E":
      return "English";
    case "S":
      return "Español";
    case "F":
      return "Français";
    case "R":
      return "Russian";
    case "EE":
      return "English - Draft subject to editing";
    default:
      return "";
  }
};

export const isFileExtension = (value) => {
  var extension = value.split(".");
  if (extension.length > 1) {
    return true;
  } else {
    return false;
  }
};

export const isExternalUrl = (value) => {
  var tarea_regex = /^(http|https)/;
  if (isFileExtension(value)) {
    return true;
  } else if (tarea_regex.test(value)) {
    return true;
  } else {
    return false;
  }
};

export const getUrl = (value) => {
  var tarea_regex = /^(http|https)/;
  if (tarea_regex.test(value)) {
    return value;
  } else if (isFileExtension(value)) {
    return commonConstants.STATCOM_DOCUMENT_BASE_PATH + value;
  } else {
    return commonConstants.BASE_URL + value;
  }
};

export const getRandomString = () => {
  let sessionLength = window.sessionStorage.length;
  if (sessionLength > 0) {
    let pageSettings = JSON.parse(window.sessionStorage.PageSettings);
    return pageSettings.randomString;
  } else {
    return randomstring.generate(7);
  }
};
export const getSessionBannerImage = () => {
  return !CheckNullOrEmptyValue(localStorage.getItem("bannerImage"))
    ? localStorage.getItem("bannerImage")
    : "";
};



// to get banner image by session id . Image name will have to follow same naming convention
export const getBannerImageBySessionId = (sessionId) => {
  // here case condition is required as the 52nd session banner image have different naming convention than the 51st session
  switch (sessionId) {
    case "54":
      return "54th-session.jpg";
    case "53":
      return "UNStatCom-53_2300x900.jpg";
    case "52":
      return "52nd-session.jpg";
    case "51":
      return "51st-session.jpg";
    case "50":
      return "StatCom-50_2300x990.jpg";
    case "49":
      return "StatCom-49_2300x990.jpg";
    case "48":
      return "UNStatCom-48_2300x990.jpg";
    case "47":
      return "UNStatCom-47_2300x990.jpg";
    case "46":
      return "statcom2015-banner-1400x400.jpg";
    case "45":
      return "45th-session.jpg";
    case "44":
      return "44th-session.jpg";
    case "43":
      return "43rd-session.jpg";
    case "42":
      return "42nd-session.jpg";
    case "41":
      return "41st-session.jpg";
    case "40":
      return "40th-session.jpg";
    case "39":
      return "39th-session.jpg";
    case "38":
      return "38th-session.jpg";
  }
};

export const getTimeAmPmFormat = (from, to) => {
  if (from.includes("AM") && to.includes("AM")) {
    return from.split("AM")[0] + " - " + to.split("AM")[0] + " AM";
  } else if (from.includes("PM") && to.includes("PM")) {
    return from.split("PM")[0] + " - " + to.split("PM")[0] + " PM";
  } else {
    return from.split("AM")[0] + " AM - " + to.split("PM")[0] + " PM";
  }
};

export const convertNumToWord = (number) => {
  var converter = require("number-to-words");
  if (!isNaN(number)) {
    return converter.toWordsOrdinal(number);
  } else {
    return "";
  }
};

export const onClick = (url) => {
  window.open(url, "_blank");
};
