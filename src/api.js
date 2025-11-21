import axios from "axios";

// Create an 'instance' of axios with the base URL of your backend
const apiClient = axios.create({
  baseURL: "https://minddock-api.onrender.com", // Your FastAPI server address
  headers: {
    "Content-Type": "application/json",
  },
});

export default apiClient;