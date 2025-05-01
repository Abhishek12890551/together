import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "https://together-server-five.vercel.app/api",
});

export default axiosInstance;
