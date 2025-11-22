import { useState, useEffect } from 'react';
import { AiOutlineCheck, AiOutlineDelete, AiOutlineFullscreen, AiOutlinePlus } from 'react-icons/ai';
import apiClient from '../api';
import './Timetable.css';

export default function Timetable({ isOpen, toggleTimetable, refreshTrigger, onOpenFull }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // State for manual entry
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Fetch tasks when sidebar opens or refresh is triggered
  useEffect(() => {
    if (isOpen) fetchTasks();
  }, [isOpen, refreshTrigger]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/tasks/');
      // Sort: Incomplete first, then by Due Date
      const sortedTasks = response.data.sort((a, b) => {
        if (a.is_completed === b.is_completed) {
          return new Date(a.due_date) - new Date(b.due_date);
        }
        return a.is_completed ? 1 : -1;
      });
      setTasks(sortedTasks);
    } catch (error) {
      console.error("Failed to load tasks", error);
    } finally {
      setLoading(false);
    }
  };

  // --- MANUAL ADD TASK ---
  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    setIsAdding(true);
    try {
      const response = await apiClient.post('/tasks/', {
        title: newTaskTitle,
        description: "Manual Entry",
        due_date: new Date().toISOString()
      });
      // Add to top of list immediately
      setTasks([response.data, ...tasks]); 
      setNewTaskTitle(""); 
    } catch (error) {
      console.error("Failed to add task", error);
    } finally {
      setIsAdding(false);
    }
  };

  // --- TOGGLE COMPLETION ---
  const toggleTask = async (task) => {
    try {
      const newStatus = !task.is_completed;
      // Optimistic update
      setTasks(tasks.map(t => t.id === task.id ? { ...t, is_completed: newStatus } : t));
      await apiClient.put(`/tasks/${task.id}/status?completed=${newStatus}`);
    } catch (error) {
      console.error("Error updating task", error);
      fetchTasks(); // Revert on error
    }
  };

  // --- DELETE TASK ---
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
        <div className="header-actions">
          {/* Expand Button */}
          <button onClick={onOpenFull} className="icon-btn" title="Open Full View">
            <AiOutlineFullscreen />
          </button>
          
          {/* Close Button */}
          <button onClick={toggleTimetable} className="close-btn">×</button>
        </div>
      </div>

      {/* --- MANUAL INPUT SECTION --- */}
      <form onSubmit={handleAddTask} className="timetable-input-area">
        <input 
          type="text" 
          placeholder="Add a quick task..." 
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          disabled={isAdding}
        />
        <button type="submit" disabled={isAdding || !newTaskTitle}>
          <AiOutlinePlus />
        </button>
      </form>

      {/* --- TASK LIST --- */}
      <div className="task-list">
        {loading && tasks.length === 0 ? (
          <div style={{padding: 20, textAlign: 'center', color: '#666'}}>Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            <p>No tasks for today.</p>
            <small>Add one above or from the Mind Map!</small>
          </div>
        ) : (
          tasks.map(task => (
            <div key={task.id} className={`task-item ${task.is_completed ? 'completed' : ''}`}>
              <div className="task-left" onClick={() => toggleTask(task)}>
                <div className={`checkbox ${task.is_completed ? 'checked' : ''}`}>
                  {task.is_completed && <AiOutlineCheck />}
                </div>
                <div className="task-info">
                   <span className="task-title">{task.title}</span>
                   {task.due_date && (
                     <span className="task-time">
                       {new Date(task.due_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                     </span>
                   )}
                </div>
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