import axios from "axios";

const BaseUrl = "https://unstats.un.org/UNSDWebsiteAPI/";

//const BaseUrl = "http://localhost:49576/";

export default axios.create({
  baseURL: BaseUrl,
});
