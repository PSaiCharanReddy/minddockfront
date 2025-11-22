import { useState, useEffect } from 'react';
import { AiOutlinePlus, AiOutlineDelete, AiOutlineTrophy } from 'react-icons/ai';
import apiClient from '../api';
import './Goals.css';

export default function Goals({ isOpen, toggleGoals }) {
  const [goals, setGoals] = useState([]);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (isOpen) fetchGoals();
  }, [isOpen]);

  const fetchGoals = async () => {
    try {
      const response = await apiClient.get('/goals/');
      setGoals(response.data);
    } catch (error) {
      console.error("Failed to load goals", error);
    }
  };

  const createGoal = async (e) => {
    e.preventDefault();
    if (!newGoalTitle) return;

    try {
      const response = await apiClient.post('/goals/', {
        title: newGoalTitle,
        target_date: null,
        progress_percentage: 0
      });
      setGoals([...goals, response.data]);
      setNewGoalTitle("");
      setIsCreating(false);
    } catch (error) {
      console.error("Error creating goal", error);
    }
  };

  const deleteGoal = async (id) => {
    if (!window.confirm("Delete this goal?")) return;
    try {
      await apiClient.delete(`/goals/${id}`);
      setGoals(goals.filter(g => g.id !== id));
    } catch (error) {
      console.error("Error deleting goal", error);
    }
  };

  const updateProgress = async (goal, newProgress) => {
    const progress = Math.min(100, Math.max(0, newProgress));
    setGoals(goals.map(g => g.id === goal.id ? { ...g, progress_percentage: progress } : g));
    try {
      await apiClient.put(`/goals/${goal.id}/progress?progress=${progress}`);
    } catch (error) { fetchGoals(); }
  };

  return (
    <div className="goals-sidebar">
      {/* --- HEADER & NEW BUTTON --- */}
      <div className="goals-header-container">
        <div className="goals-header">
           <h3>🎯 Goals</h3>
           {/* Only show close button if NOT inside the unified panel (optional) */}
           {toggleGoals && <button onClick={toggleGoals} className="close-btn">×</button>}
        </div>
        
        {!isCreating ? (
          <button className="new-goal-full-btn" onClick={() => setIsCreating(true)}>
            <AiOutlinePlus /> New Goal
          </button>
        ) : (
          <form onSubmit={createGoal} className="create-goal-inline">
            <input 
              autoFocus
              type="text" 
              placeholder="Goal Title..." 
              value={newGoalTitle}
              onChange={(e) => setNewGoalTitle(e.target.value)}
            />
            <div className="inline-actions">
              <button type="button" onClick={() => setIsCreating(false)}>Cancel</button>
              <button type="submit" className="save-btn">Save</button>
            </div>
          </form>
        )}
      </div>

      <div className="goals-list">
        {goals.length === 0 && !isCreating && (
          <div className="empty-state">
            <p>No active goals.</p>
          </div>
        )}

        {goals.map(goal => (
          <div key={goal.id} className="goal-card">
            <div className="goal-top">
              <span className="goal-title">{goal.title}</span>
              <button onClick={() => deleteGoal(goal.id)} className="delete-goal-btn">
                <AiOutlineDelete />
              </button>
            </div>
            
            <div className="progress-section">
              <div className="progress-bar-bg">
                <div className="progress-bar-fill" style={{ width: `${goal.progress_percentage}%` }}></div>
              </div>
              <div className="progress-controls">
                <button onClick={() => updateProgress(goal, goal.progress_percentage - 10)}>-</button>
                <span>{goal.progress_percentage}%</span>
                <button onClick={() => updateProgress(goal, goal.progress_percentage + 10)}>+</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}