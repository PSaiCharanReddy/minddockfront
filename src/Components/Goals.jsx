import { useState, useEffect } from 'react';
import { AiOutlinePlus, AiOutlineDelete, AiOutlineTrophy, AiOutlineCalendar, AiOutlineCheckCircle } from 'react-icons/ai';
import apiClient from '../api';
import './Goals.css';

export default function Goals({ isOpen, toggleGoals, isEmbedded }) {
  const [goals, setGoals] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  
  // Goal creation form
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [goalType, setGoalType] = useState("short_term"); // 'short_term' or 'long_term'
  const [duration, setDuration] = useState(60); // days
  const [dailyTime, setDailyTime] = useState(60); // minutes

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
    if (!newGoalTitle.trim()) return;

    try {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + duration);

      const response = await apiClient.post('/goals/', {
        title: newGoalTitle,
        description: `${goalType === 'short_term' ? '🔥 SHORT-TERM' : '🎯 LONG-TERM'} - ${duration} days`,
        target_date: targetDate.toISOString(),
        progress_percentage: 0
      });
      
      setGoals([...goals, response.data]);
      setNewGoalTitle("");
      setGoalType("short_term");
      setDuration(60);
      setDailyTime(60);
      setIsCreating(false);
      
      alert(`✅ Goal created! ${goalType === 'short_term' ? '🔥 Short-term' : '🎯 Long-term'} goal for ${duration} days\n\nWould you like to add a roadmap to this goal?`);
    } catch (error) {
      console.error("Error creating goal", error);
      alert("Failed to create goal");
    }
  };

  const deleteGoal = async (id) => {
    if (!window.confirm("Delete this goal?")) return;
    try {
      await apiClient.delete(`/goals/${id}`);
      setGoals(goals.filter(g => g.id !== id));
      setSelectedGoal(null);
    } catch (error) {
      console.error("Error deleting goal", error);
    }
  };

  const updateProgress = async (goal, newProgress) => {
    const progress = Math.min(100, Math.max(0, newProgress));
    setGoals(goals.map(g => g.id === goal.id ? { ...g, progress_percentage: progress } : g));
    try {
      await apiClient.put(`/goals/${goal.id}/progress?progress=${progress}`);
    } catch (error) { 
      fetchGoals(); 
    }
  };

  const handleCheckin = async (goalId) => {
    const timeSpent = prompt("How many minutes did you spend on this today?", "60");
    if (!timeSpent) return;

    const update = prompt("What did you accomplish?", "");
    if (!update) return;

    // For now, just increase progress by 5%
    const goal = goals.find(g => g.id === goalId);
    const newProgress = Math.min(100, goal.progress_percentage + 5);
    
    await updateProgress(goal, newProgress);
    alert(`✅ Check-in logged!\n⏱️ ${timeSpent} minutes\n📝 ${update}\n\n📊 Progress: ${goal.progress_percentage}% → ${newProgress}%`);
  };

  const getGoalType = (goal) => {
    if (!goal.target_date) return "goal";
    const daysLeft = Math.ceil((new Date(goal.target_date) - new Date()) / (1000 * 60 * 60 * 24));
    return daysLeft <= 90 ? "short_term" : "long_term";
  };

  const getDaysRemaining = (goal) => {
    if (!goal.target_date) return null;
    return Math.ceil((new Date(goal.target_date) - new Date()) / (1000 * 60 * 60 * 24));
  };

  if (!isOpen) return null;

  return (
    <div className="goals-sidebar">
      {/* --- HEADER --- */}
      {!isEmbedded && (
        <div className="goals-header">
          <h3>🎯 Goals</h3>
          <button onClick={toggleGoals} className="close-btn">×</button>
        </div>
      )}

      {/* --- CREATE GOAL SECTION --- */}
      {!isCreating ? (
        <button className="new-goal-btn" onClick={() => setIsCreating(true)}>
          <AiOutlinePlus /> New Goal
        </button>
      ) : (
        <form onSubmit={createGoal} className="create-goal-form">
          <input 
            autoFocus
            type="text" 
            placeholder="Goal title..." 
            value={newGoalTitle}
            onChange={(e) => setNewGoalTitle(e.target.value)}
            required
          />

          <div className="form-group">
            <label>Goal Type:</label>
            <div className="type-selector">
              <button 
                type="button"
                className={`type-btn ${goalType === 'short_term' ? 'active' : ''}`}
                onClick={() => setGoalType('short_term')}
              >
                🔥 Short-term
              </button>
              <button 
                type="button"
                className={`type-btn ${goalType === 'long_term' ? 'active' : ''}`}
                onClick={() => setGoalType('long_term')}
              >
                🎯 Long-term
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Duration: {duration} days</label>
            <input 
              type="range"
              min="7"
              max="365"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label>Daily Available Time: {dailyTime} min</label>
            <select value={dailyTime} onChange={(e) => setDailyTime(parseInt(e.target.value))}>
              <option value="30">30 min (Casual)</option>
              <option value="60">1 hour (Regular)</option>
              <option value="90">1.5 hours</option>
              <option value="120">2 hours (Intense)</option>
              <option value="180">3+ hours (Very Intense)</option>
            </select>
          </div>

          <div className="form-actions">
            <button type="button" onClick={() => setIsCreating(false)} className="cancel-btn">Cancel</button>
            <button type="submit" className="save-btn">Create Goal</button>
          </div>
        </form>
      )}

      {/* --- GOALS LIST --- */}
      <div className="goals-list">
        {goals.length === 0 && !isCreating && (
          <div className="empty-state">
            <p>No active goals yet.</p>
            <small>Create one to get started! 🚀</small>
          </div>
        )}

        {goals.map(goal => {
          const daysLeft = getDaysRemaining(goal);
          const type = getGoalType(goal);
          const isCompleted = goal.progress_percentage >= 100;

          return (
            <div 
              key={goal.id} 
              className={`goal-card ${isCompleted ? 'completed' : ''} ${type === 'short_term' ? 'short-term' : 'long-term'}`}
              onClick={() => setSelectedGoal(selectedGoal?.id === goal.id ? null : goal)}
            >
              <div className="goal-header">
                <div className="goal-info">
                  <h4>{goal.title}</h4>
                  <span className="goal-badge">
                    {type === 'short_term' ? '🔥 SHORT-TERM' : '🎯 LONG-TERM'}
                  </span>
                </div>
                {daysLeft && (
                  <span className="days-left">
                    <AiOutlineCalendar /> {daysLeft}d
                  </span>
                )}
              </div>

              {/* Progress Bar */}
              <div className="progress-section">
                <div className="progress-bar-bg">
                  <div 
                    className="progress-bar-fill" 
                    style={{ width: `${goal.progress_percentage}%` }}
                  ></div>
                </div>
                <span className="progress-text">{goal.progress_percentage}%</span>
              </div>

              {/* Progress Controls */}
              <div className="progress-controls">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    updateProgress(goal, goal.progress_percentage - 10);
                  }}
                  className="control-btn"
                >
                  −
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    updateProgress(goal, goal.progress_percentage + 10);
                  }}
                  className="control-btn"
                >
                  +
                </button>
              </div>

              {/* Expanded Details */}
              {selectedGoal?.id === goal.id && (
                <div className="goal-details">
                  {goal.description && <p>{goal.description}</p>}
                  
                  <div className="detail-actions">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCheckin(goal.id);
                      }}
                      className="checkin-btn"
                    >
                      <AiOutlineCheckCircle /> Daily Check-in
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteGoal(goal.id);
                      }}
                      className="delete-btn"
                    >
                      <AiOutlineDelete /> Delete
                    </button>
                  </div>

                  {isCompleted && (
                    <div className="completion-message">
                      🎉 Goal Completed! Amazing work! 🎉
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
