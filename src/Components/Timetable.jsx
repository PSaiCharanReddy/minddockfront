import { useState, useEffect } from 'react';
import { AiOutlineCheck, AiOutlineDelete, AiOutlineCalendar } from 'react-icons/ai';
import apiClient from '../api';
import './Timetable.css';

export default function Timetable({ isOpen, toggleTimetable, refreshTrigger }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch tasks whenever the sidebar opens or a new task is added
  useEffect(() => {
    if (isOpen) fetchTasks();
  }, [isOpen, refreshTrigger]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/tasks/');
      // Filter for tasks that are NOT completed (or show all)
      // For now, let's show everything sorted by status
      const sortedTasks = response.data.sort((a, b) => 
        (a.is_completed === b.is_completed) ? 0 : a.is_completed ? 1 : -1
      );
      setTasks(sortedTasks);
    } catch (error) {
      console.error("Failed to load tasks", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (task) => {
    try {
      // Optimistic update (update UI immediately)
      const newStatus = !task.is_completed;
      setTasks(tasks.map(t => t.id === task.id ? { ...t, is_completed: newStatus } : t));
      
      // Send to backend
      await apiClient.put(`/tasks/${task.id}/status?completed=${newStatus}`);
    } catch (error) {
      console.error("Error updating task", error);
      fetchTasks(); // Revert on error
    }
  };

  const deleteTask = async (id) => {
    if(!window.confirm("Delete this task?")) return;
    try {
      await apiClient.delete(`/tasks/${id}`);
      setTasks(tasks.filter(t => t.id !== id));
    } catch (error) {
      console.error("Error deleting task", error);
    }
  };

  return (
    <div className={`timetable-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="timetable-header">
        <h3>📅 Daily Plan</h3>
        <button onClick={toggleTimetable} className="close-btn">×</button>
      </div>

      <div className="task-list">
        {loading && tasks.length === 0 ? (
          <div style={{padding: 20, textAlign: 'center', color: '#666'}}>Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            <p>No tasks yet.</p>
            <small>Right-click a node on the map to add it here!</small>
          </div>
        ) : (
          tasks.map(task => (
            <div key={task.id} className={`task-item ${task.is_completed ? 'completed' : ''}`}>
              <div className="task-left" onClick={() => toggleTask(task)}>
                <div className={`checkbox ${task.is_completed ? 'checked' : ''}`}>
                  {task.is_completed && <AiOutlineCheck />}
                </div>
                <span className="task-title">{task.title}</span>
              </div>
              <button onClick={() => deleteTask(task.id)} className="delete-task-btn">
                <AiOutlineDelete />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}