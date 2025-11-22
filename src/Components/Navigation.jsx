import React, { useState } from 'react';
import { 
  AiOutlineMenu, 
  AiOutlineClose, 
  AiOutlineFolderOpen, 
  AiOutlineCalendar,   
  AiOutlineTrophy,     
  AiOutlineBook,       
  AiOutlineDownload,   
  AiOutlineBgColors,
  AiOutlineHome // <-- NEW ICON
} from 'react-icons/ai';

export default function Navigation({ 
  onGoHome, // <-- NEW PROP
  toggleSidebar, 
  toggleTimetable, 
  toggleGoals, 
  toggleJournal, 
  toggleTheme, 
  onDownload 
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleAction = (action) => {
    action();
    setIsOpen(false); // Auto-close menu after clicking
  };

  return (
    <div className="nav-container">
      {/* Main Menu Button */}
      <button 
        className="menu-toggle-btn" 
        onClick={() => setIsOpen(!isOpen)}
        title="Menu"
      >
        {isOpen ? <AiOutlineClose /> : <AiOutlineMenu />}
      </button>

      {/* Expanding Horizontal Bar */}
      {isOpen && (
        <div className="nav-menu-bar">
          {/* --- NEW HOME TAB --- */}
          <button className="nav-item" onClick={() => handleAction(onGoHome)}>
            <AiOutlineHome className="nav-icon" />
            <span>Home</span>
          </button>

          <div style={{width:1, height:20, background:'var(--border-color)', margin:'0 5px'}}></div>

          <button className="nav-item" onClick={() => handleAction(toggleSidebar)}>
            <AiOutlineFolderOpen className="nav-icon" />
            <span>Maps</span>
          </button>
          
          <button className="nav-item" onClick={() => handleAction(toggleTimetable)}>
            <AiOutlineCalendar className="nav-icon" />
            <span>Tasks</span>
          </button>
          
          <button className="nav-item" onClick={() => handleAction(toggleGoals)}>
            <AiOutlineTrophy className="nav-icon" />
            <span>Goals</span>
          </button>
          
          <button className="nav-item" onClick={() => handleAction(toggleJournal)}>
            <AiOutlineBook className="nav-icon" />
            <span>Journal</span>
          </button>

          <div style={{width:1, height:20, background:'var(--border-color)', margin:'0 5px'}}></div>

          <button className="nav-item" onClick={() => handleAction(toggleTheme)}>
            <AiOutlineBgColors className="nav-icon" />
            <span>Theme</span>
          </button>
          
          <button className="nav-item" onClick={() => handleAction(onDownload)}>
            <AiOutlineDownload className="nav-icon" />
            <span>Export</span>
          </button>
        </div>
      )}
    </div>
  );
}