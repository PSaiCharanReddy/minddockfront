import { useState, useEffect } from 'react';
import { AiOutlineCalendar, AiOutlineTrophy, AiOutlinePartition, AiOutlineRight } from 'react-icons/ai';
import apiClient from '../api';
import './Dashboard.css';

export default function Dashboard({ onOpenMap, onOpenTimetable, onOpenGoals }) {
  const [stats, setStats] = useState({ tasks: [], goals: [], maps: [] });
  const [quote, setQuote] = useState({ text: "Loading motivation...", author: "" });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Parallel data fetching for speed
        const [tasksRes, goalsRes, mapsRes] = await Promise.all([
          apiClient.get('/tasks/'),
          apiClient.get('/goals/'),
          apiClient.get('/map/')
        ]);

        setStats({
          tasks: tasksRes.data.filter(t => !t.is_completed).slice(0, 3), // Top 3 pending
          goals: goalsRes.data.slice(0, 3), // Top 3 goals
          maps: mapsRes.data.slice(0, 4) // Top 4 maps
        });

        // Hardcoded quotes for now (could be AI generated later)
        const quotes = [
          { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
          { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
          { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" }
        ];
        setQuote(quotes[Math.floor(Math.random() * quotes.length)]);

      } catch (error) {
        console.error("Dashboard load failed:", error);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="dashboard-container">
      <header className="dash-header">
        <h1>👋 Welcome Back, Mr. Redddy</h1>
        <p className="dash-quote">"{quote.text}" — {quote.author}</p>
      </header>

      <div className="dash-grid">
        {/* --- SECTION 1: TODAY'S TASKS --- */}
        <div className="dash-card tasks-card">
          <div className="card-header">
            <h3><AiOutlineCalendar /> Today's Focus</h3>
            <button onClick={onOpenTimetable}>View All</button>
          </div>
          <div className="card-body">
            {stats.tasks.length === 0 ? (
              <p className="empty-text">No pending tasks. You're free! 🎉</p>
            ) : (
              stats.tasks.map(task => (
                <div key={task.id} className="dash-item">
                  <div className="checkbox-circle"></div>
                  <span>{task.title}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* --- SECTION 2: ACTIVE GOALS --- */}
        <div className="dash-card goals-card">
          <div className="card-header">
            <h3><AiOutlineTrophy /> Active Goals</h3>
            <button onClick={onOpenGoals}>View All</button>
          </div>
          <div className="card-body">
            {stats.goals.length === 0 ? (
              <p className="empty-text">No goals set yet.</p>
            ) : (
              stats.goals.map(goal => (
                <div key={goal.id} className="dash-goal-item">
                  <div className="goal-label">
                    <span>{goal.title}</span>
                    <span>{goal.progress_percentage}%</span>
                  </div>
                  <div className="dash-progress-bg">
                    <div className="dash-progress-fill" style={{width: `${goal.progress_percentage}%`}}></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* --- SECTION 3: RECENT MAPS --- */}
        <div className="dash-card maps-card">
          <div className="card-header">
            <h3><AiOutlinePartition /> Jump Back In</h3>
          </div>
          <div className="maps-grid">
            {stats.maps.map(map => (
              <div key={map.id} className="dash-map-tile" onClick={() => onOpenMap(map.id)}>
                <span className="map-icon">🗺️</span>
                <span className="map-name">{map.title}</span>
                <AiOutlineRight className="arrow-icon" />
              </div>
            ))}
            <div className="dash-map-tile new" onClick={() => onOpenMap(null)}>
              <span className="map-icon">➕</span>
              <span className="map-name">New Map</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}