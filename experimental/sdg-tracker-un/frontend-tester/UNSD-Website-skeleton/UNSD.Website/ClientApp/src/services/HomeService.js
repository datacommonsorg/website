import API from "../helper/Config/API";

export const getHomeInfoData = () => {
  return API.get("News/get")
    .then(function (response) {
      if (response.status === 200 && response != null) {
        var data = response.data;
        return data;
      }
    })
    .catch(function (error) {
      return []; // Return empty array in case error response.
    });
};
