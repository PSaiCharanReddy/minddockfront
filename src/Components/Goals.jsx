import { useState, useEffect } from 'react';
import { AiOutlinePlus, AiOutlineDelete, AiOutlineTrophy } from 'react-icons/ai';
import apiClient from '../api';
import './Goals.css';

export default function Goals({ isOpen, toggleGoals }) {
  const [goals, setGoals] = useState([]);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalDate, setNewGoalDate] = useState("");
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
        target_date: newGoalDate ? new Date(newGoalDate).toISOString() : null,
        progress_percentage: 0
      });
      setGoals([...goals, response.data]);
      setNewGoalTitle("");
      setNewGoalDate("");
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
    // Clamp between 0 and 100
    const progress = Math.min(100, Math.max(0, newProgress));
    
    // Optimistic update
    setGoals(goals.map(g => g.id === goal.id ? { ...g, progress_percentage: progress } : g));

    try {
      await apiClient.put(`/goals/${goal.id}/progress?progress=${progress}`);
    } catch (error) {
      console.error("Update failed", error);
      fetchGoals(); // Revert on fail
    }
  };

  return (
    <div className={`goals-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="goals-header">
        <h3>🎯 Goals Tracker</h3>
        <button onClick={toggleGoals} className="close-btn">×</button>
      </div>

      <div className="goals-list">
        {goals.length === 0 && !isCreating ? (
          <div className="empty-state">
            <AiOutlineTrophy style={{ fontSize: 40, marginBottom: 10 }} />
            <p>No active goals.</p>
            <button className="start-goal-btn" onClick={() => setIsCreating(true)}>Set a Goal</button>
          </div>
        ) : (
          goals.map(goal => (
            <div key={goal.id} className="goal-card">
              <div className="goal-top">
                <span className="goal-title">{goal.title}</span>
                <button onClick={() => deleteGoal(goal.id)} className="delete-goal-btn">
                  <AiOutlineDelete />
                </button>
              </div>
              
              {goal.target_date && (
                <small className="goal-date">Target: {new Date(goal.target_date).toLocaleDateString()}</small>
              )}

              <div className="progress-section">
                <div className="progress-bar-bg">
                  <div 
                    className="progress-bar-fill" 
                    style={{ width: `${goal.progress_percentage}%` }}
                  ></div>
                </div>
                <div className="progress-controls">
                  <button onClick={() => updateProgress(goal, goal.progress_percentage - 10)}>-</button>
                  <span>{goal.progress_percentage}%</span>
                  <button onClick={() => updateProgress(goal, goal.progress_percentage + 10)}>+</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {isCreating && (
        <form onSubmit={createGoal} className="create-goal-form">
          <input 
            type="text" 
            placeholder="Goal Title (e.g. Learn Python)" 
            value={newGoalTitle}
            onChange={(e) => setNewGoalTitle(e.target.value)}
            autoFocus
          />
          <input 
            type="date" 
            value={newGoalDate}
            onChange={(e) => setNewGoalDate(e.target.value)}
          />
          <div className="form-actions">
            <button type="button" onClick={() => setIsCreating(false)}>Cancel</button>
            <button type="submit" className="save-btn">Save Goal</button>
          </div>
        </form>
      )}

      {!isCreating && goals.length > 0 && (
        <button className="fab-add-goal" onClick={() => setIsCreating(true)}>
          <AiOutlinePlus />
        </button>
      )}
    </div>
  );
}