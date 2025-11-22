import React from 'react';
import { 
  AiOutlineMenu, 
  AiOutlineCalendar, 
  AiOutlineTrophy, 
  AiOutlineBook, 
  AiOutlineSearch, 
  AiOutlineDownload, 
  AiOutlineRobot,
  AiOutlineBell,
  AiFillBell,
  AiOutlineBulb,
  AiOutlineHome,
  AiOutlinePartition // <-- NEW ICON for Maps
} from 'react-icons/ai';
import './TopBar.css';

export default function TopBar({ 
  onToggleMaps, 
  onGoHome, 
  onToggleTasks, 
  onToggleGoals, 
  onToggleJournal,
  onToggleTheme,
  onSearch,
  onExport,
  onChat,
  onInsights,
  onNotification,
  notificationPermission,
  theme,
  currentMapTitle
}) {
  return (
    <div className="top-bar">
      {/* LEFT: App Title */}
      <div className="top-bar-section left">
        {/* We keep this as a visual anchor or secondary toggle */}
        <button className="icon-btn main-menu-btn" onClick={onToggleMaps} title="My Maps">
          <AiOutlineMenu />
        </button>
        <span className="app-title">MindDock</span>
        <span className="divider">/</span>
        <span className="map-title">{currentMapTitle || "Select a Map"}</span>
      </div>

      {/* CENTER: Core Tools */}
      <div className="top-bar-section center">
        <button className="tool-btn" onClick={onGoHome} title="Dashboard">
          <AiOutlineHome /> Home
        </button>

        {/* --- NEW MAPS BUTTON --- */}
        <button className="tool-btn" onClick={onToggleMaps} title="Open Map List">
          <AiOutlinePartition /> Maps
        </button>
        {/* ----------------------- */}

        <button className="tool-btn" onClick={onToggleTasks}>
          <AiOutlineCalendar /> Tasks
        </button>
        <button className="tool-btn" onClick={onToggleGoals}>
          <AiOutlineTrophy /> Goals
        </button>
        <button className="tool-btn" onClick={onToggleJournal}>
          <AiOutlineBook /> Journal
        </button>

        <div className="divider-vertical"></div>

        <button className="tool-btn ai-tool" onClick={onInsights} title="AI Insights">
          <AiOutlineBulb /> Insights
        </button>
        <button className="tool-btn ai-tool" onClick={onChat} title="AI Chat">
          <AiOutlineRobot /> Chat
        </button>
        <button 
          className="tool-btn notification-btn" 
          onClick={onNotification} 
          title="Enable Notifications"
        >
          {notificationPermission === 'granted' ? <AiFillBell /> : <AiOutlineBell />}
        </button>
      </div>

      {/* RIGHT: Utilities */}
      <div className="top-bar-section right">
        <button className="icon-btn" onClick={onSearch} title="Search (Ctrl+K)">
          <AiOutlineSearch />
        </button>
        
        {currentMapTitle !== "Dashboard" && (
            <button className="icon-btn" onClick={onExport} title="Export Image">
            <AiOutlineDownload />
            </button>
        )}

        <button className="icon-btn" onClick={onToggleTheme} title="Switch Theme">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </div>
  );
}