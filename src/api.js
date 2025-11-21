import axios from "axios";

// Create an 'instance' of axios with the base URL of your backend
const apiClient = axios.create({
  baseURL:" http://127.0.0.1:8000",
  // "https://minddock-api.onrender.com", // Your FastAPI server address
  headers: {
    "Content-Type": "application/json",
  },
});

export default apiClient;