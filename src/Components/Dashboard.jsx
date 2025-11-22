import { useState, useEffect } from 'react';
import { 
  AiOutlineCalendar, AiOutlineTrophy, AiOutlinePartition, AiOutlineRight, AiOutlineFire 
} from 'react-icons/ai';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import apiClient from '../api';
import './Dashboard.css';

export default function Dashboard({ onOpenMap, onOpenTimetable, onOpenGoals }) {
  const [stats, setStats] = useState({ 
    tasks: [], 
    goals: [], 
    maps: [],
    completedTasks: 0,
    pendingTasks: 0
  });
  const [quote, setQuote] = useState({ text: "Loading motivation...", author: "" });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tasksRes, goalsRes, mapsRes] = await Promise.all([
          apiClient.get('/tasks/'),
          apiClient.get('/goals/'),
          apiClient.get('/map/')
        ]);

        const tasks = tasksRes.data;
        const completed = tasks.filter(t => t.is_completed).length;
        const pending = tasks.length - completed;

        setStats({
          tasks: tasks.filter(t => !t.is_completed).slice(0, 3), // Top 3 pending
          goals: goalsRes.data,
          maps: mapsRes.data.slice(0, 4),
          completedTasks: completed,
          pendingTasks: pending
        });

        const quotes = [
          { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
          { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
          { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
          { text: "Action is the foundational key to all success.", author: "Picasso" }
        ];
        setQuote(quotes[Math.floor(Math.random() * quotes.length)]);

      } catch (error) {
        console.error("Dashboard load failed:", error);
      }
    };
    fetchData();
  }, []);

  // --- CHART DATA ---
  const taskData = [
    { name: 'Done', value: stats.completedTasks, color: '#66bb6a' },
    { name: 'Pending', value: stats.pendingTasks, color: '#ef5350' },
  ];

  // Format goals for Bar Chart
  const goalData = stats.goals.map(g => ({
    name: g.title.substring(0, 10) + (g.title.length > 10 ? '...' : ''), // Truncate names
    progress: g.progress_percentage
  }));

  return (
    <div className="dashboard-container">
      <header className="dash-header">
        <h1>👋 Welcome Back, Mr. Reddy</h1>
        <p className="dash-quote">"{quote.text}" — {quote.author}</p>
        
        <div className="streak-badge">
          <AiOutlineFire className="fire-icon" /> 
          <span>Current Streak: <strong>3 Days</strong></span>
        </div>
      </header>

      <div className="dash-grid">
        
        {/* --- ROW 1: ANALYTICS --- */}
        
        <div className="dash-card chart-card">
          <div className="card-header">
            <h3>📊 Task Completion</h3>
          </div>
          <div className="chart-container">
            {stats.completedTasks + stats.pendingTasks === 0 ? (
              <p className="empty-text">No tasks data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={taskData} 
                    innerRadius={60} 
                    outerRadius={80} 
                    paddingAngle={5} 
                    dataKey="value"
                  >
                    {taskData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{backgroundColor: '#2a2a2a', border: 'none', borderRadius: '8px'}}
                    itemStyle={{color: '#fff'}}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="dash-card chart-card">
          <div className="card-header">
            <h3>🎯 Goal Progress</h3>
          </div>
          <div className="chart-container">
             {stats.goals.length === 0 ? (
              <p className="empty-text">No goals set.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={goalData}>
                  <XAxis dataKey="name" stroke="#888" fontSize={12} />
                  <YAxis stroke="#888" fontSize={12} />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{backgroundColor: '#2a2a2a', border: 'none', borderRadius: '8px'}}
                  />
                  <Bar dataKey="progress" fill="#007aff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* --- ROW 2: ACTIONS --- */}

        <div className="dash-card tasks-card">
          <div className="card-header">
            <h3><AiOutlineCalendar /> Today's Focus</h3>
            <button onClick={onOpenTimetable}>View All</button>
          </div>
          <div className="card-body">
            {stats.tasks.length === 0 ? (
              <p className="empty-text">All caught up! 🎉</p>
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

        <div className="dash-card maps-card">
          <div className="card-header">
            <h3><AiOutlinePartition /> Recent Maps</h3>
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
              <span className="map-name">New</span>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}