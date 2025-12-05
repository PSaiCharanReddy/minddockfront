import axios from "axios";

// Create an 'instance' of axios with the base URL of your backend
const apiClient = axios.create({
  // baseURL: "http://127.0.0.1:8000",
  baseURL: "https://minddock-api.onrender.com", // Your FastAPI server address
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to include the auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('minddock_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token expired or invalid - clear it and redirect to login
      localStorage.removeItem('minddock_token');
      localStorage.removeItem('minddock_user');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
