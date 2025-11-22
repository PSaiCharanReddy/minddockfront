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
  AiOutlinePartition,
  AiOutlineCloudUpload,
  AiOutlineAudio // <-- Voice Icon
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
  currentMapTitle,
  onOpenFileCenter,
  onToggleVoice // <-- Receive as Prop
}) {
  return (
    <div className="top-bar">
      <div className="top-bar-section left">
        <button className="icon-btn main-menu-btn" onClick={onToggleMaps} title="My Maps">
          <AiOutlineMenu />
        </button>
        <span className="app-title">MindDock</span>
        <span className="divider">/</span>
        <span className="map-title">{currentMapTitle || "Select a Map"}</span>
      </div>

      <div className="top-bar-section center">
        <button className="tool-btn" onClick={onGoHome} title="Dashboard"><AiOutlineHome /> Home</button>
        <button className="tool-btn" onClick={onToggleMaps} title="Maps"><AiOutlinePartition /> Maps</button>
        <button className="tool-btn" onClick={onOpenFileCenter} title="Upload Files"><AiOutlineCloudUpload /> Files</button>
        
        <button className="tool-btn" onClick={onToggleTasks}><AiOutlineCalendar /> Tasks</button>
        <button className="tool-btn" onClick={onToggleGoals}><AiOutlineTrophy /> Goals</button>
        <button className="tool-btn" onClick={onToggleJournal}><AiOutlineBook /> Journal</button>

        <div className="divider-vertical"></div>

        <button className="tool-btn ai-tool" onClick={onInsights} title="AI Insights"><AiOutlineBulb /> Insights</button>
        <button className="tool-btn ai-tool" onClick={onChat} title="AI Chat"><AiOutlineRobot /> Chat</button>
        
        {/* --- VOICE BUTTON --- */}
        <button className="tool-btn ai-tool" onClick={onToggleVoice} title="Voice Mode">
          <AiOutlineAudio /> Voice
        </button>
        
        <button className="tool-btn notification-btn" onClick={onNotification} title="Notifications">
          {notificationPermission === 'granted' ? <AiFillBell /> : <AiOutlineBell />}
        </button>
      </div>

      <div className="top-bar-section right">
        <button className="icon-btn" onClick={onSearch} title="Search (Ctrl+K)"><AiOutlineSearch /></button>
        {currentMapTitle !== "Dashboard" && <button className="icon-btn" onClick={onExport} title="Export"><AiOutlineDownload /></button>}
        <button className="icon-btn" onClick={onToggleTheme} title="Theme">{theme === 'dark' ? '☀️' : '🌙'}</button>
      </div>
    </div>
  );
}