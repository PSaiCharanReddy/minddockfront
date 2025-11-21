import { useState } from "react";
import apiClient from "../api";

// 'onTaskCreated' is a function we pass in from App.jsx
// to tell the main list to refresh itself.
function TaskForm({ onTaskCreated }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault(); // Stop the form from reloading the page
    if (!title) {
      setError("Title is required.");
      return;
    }

    try {
      const newTask = { title, description };
      // Make a POST request to http://127.0.0.1:8000/tasks/
      const response = await apiClient.post("/tasks/", newTask);
      
      onTaskCreated(response.data); // Pass the new task back to App.jsx
      
      // Clear the form
      setTitle("");
      setDescription("");
      setError(null);
    } catch (err) {
      setError("Failed to create task.");
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="task-form">
      <h3>Add New Task</h3>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task Title (e.g., Learn FastAPI)"
        />
      </div>
      <div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
        />
      </div>
      <button type="submit">Add Task</button>
    </form>
  );
}

export default TaskForm;