import API from "../../helper/Config/API";

export const getHomeBanner = (url) => {
    return API.get(url)
    .then(function (response) {
      if (response.status === 200 && response != null) {
        var data = response.data;
        return data;
      }
    })
    .catch(function (error) {
      return [];
    });
};

export const getHomeDetails = (lang) => {
  const getParams = new URLSearchParams();
  getParams.append("lang", encodeURI(lang));
  return API.get("Home/get-home-details", {
    params: getParams,
  })
    .then(function (response) {
      if (response.status === 200 && response != null) {
        var data = response.data;
        return data;
      }
    })
    .catch(function (error) {
      return [];
    });
};

export const getHomeFeaturedVideo = (project) => {
    const getParams = new URLSearchParams();
    getParams.append("project", encodeURI(project));
    return API.get("Home/get-home-featured-video", { params: getParams})
    .then(function (response) {
      if (response.status === 200 && response != null) {
        var data = response.data;
        return data;
      }
    })
    .catch(function (error) {
      return [];
    });
};
