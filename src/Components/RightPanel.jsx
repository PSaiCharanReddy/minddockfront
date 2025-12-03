import React from 'react';
import { AiOutlineClose, AiOutlineCalendar, AiOutlineTrophy, AiOutlineBook } from 'react-icons/ai';
import Timetable from './Timetable';
import Goals from './Goals';
import Journal from './Journal';
import './RightPanel.css';

export default function RightPanel({ isOpen, onClose, activeTab, onTabChange, taskRefreshTrigger, tasks, goals, notes }) {
  return (
    <div className={`right-panel-container ${isOpen ? 'open' : ''}`}>
      {/* --- TAB HEADER --- */}
      <div className="right-panel-header">
        <div className="panel-tabs">
          <button
            className={`panel-tab ${activeTab === 'tasks' ? 'active' : ''}`}
            onClick={() => onTabChange('tasks')}
            title="Tasks"
          >
            <AiOutlineCalendar /> Tasks
          </button>
          <button
            className={`panel-tab ${activeTab === 'goals' ? 'active' : ''}`}
            onClick={() => onTabChange('goals')}
            title="Goals"
          >
            <AiOutlineTrophy /> Goals
          </button>
          <button
            className={`panel-tab ${activeTab === 'journal' ? 'active' : ''}`}
            onClick={() => onTabChange('journal')}
            title="Journal"
          >
            <AiOutlineBook /> Journal
          </button>
        </div>
        <button className="panel-close-btn" onClick={onClose}>
          <AiOutlineClose />
        </button>
      </div>

      {/* --- CONTENT AREA --- */}
      <div className="right-panel-content">
        {activeTab === 'tasks' && (
          <Timetable
            isOpen={true} // Always open inside the panel
            toggleTimetable={() => { }}
            refreshTrigger={taskRefreshTrigger}
            onOpenFull={() => console.log("Full view")}
            isEmbedded={true} // New prop to remove internal headers
            tasks={tasks} // Pass tasks
          />
        )}
        {activeTab === 'goals' && (
          <Goals
            isOpen={true}
            toggleGoals={() => { }}
            isEmbedded={true}
            goals={goals} // Pass goals
          />
        )}
        {activeTab === 'journal' && (
          <Journal
            isOpen={true}
            toggleJournal={() => { }}
            isEmbedded={true}
            notes={notes} // Pass notes
          />
        )}
      </div>
    </div>
  );
}