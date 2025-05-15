import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {BACKEND_URL} from "./const.js"

const axiosInstance = axios.create({
  // baseURL: "http://192.168.31.221:5000/api",
  baseURL: `${BACKEND_URL}/api`,
});

axiosInstance.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log(
        "AxiosInterceptor: Attaching token:",
        `Bearer ${token ? "TOKEN_PRESENT" : "TOKEN_ABSENT"}`
      );
    } else {
      console.log(
        "AxiosInterceptor: No token found in AsyncStorage for this request."
      );
    }
    return config;
  },
  (error) => {
    console.error("AxiosInterceptor: Request error:", error);
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response) {
      console.error(
        `AxiosInterceptor: Response Error - Status ${error.response.status}, Data:`,
        error.response.data
      );
      if (error.response.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        console.warn(
          "AxiosInterceptor: Received 401 Unauthorized. Token may be invalid or expired."
        );
      }
    } else if (error.request) {
      console.error(
        "AxiosInterceptor: No response received for request:",
        error.request
      );
    } else {
      console.error(
        "AxiosInterceptor: Error setting up request:",
        error.message
      );
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
