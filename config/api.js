import axios from "axios";

const baseURL =
  process.env.NODE_ENV === "production"
    ? process.env.REACT_APP_API_URL_PROD
    : process.env.REACT_APP_API_URL_DEV;

const api = axios.create({
  baseURL,
});

export default api;
