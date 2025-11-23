import React, { useState } from 'react';
import { AiOutlinePlus, AiOutlineDelete, AiOutlineMenu } from 'react-icons/ai';
import './Sidebar.css';

export default function Sidebar({ 
  maps, 
  currentMapId, 
  onSelectMap, 
  onCreateMap, 
  onDeleteMap,
  isOpen,
  toggleSidebar
}) {
  const [newMapTitle, setNewMapTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newMapTitle.trim()) return;
    await onCreateMap(newMapTitle);
    setNewMapTitle("");
    setIsCreating(false);
  };

  return (
    <>
      {/* Toggle Button (Visible when sidebar is closed) */}
      {!isOpen && (
        <button className="sidebar-toggle-btn" onClick={toggleSidebar}>
          <AiOutlineMenu />
        </button>
      )}

      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h3>My Maps</h3>
          <button className="close-btn" onClick={toggleSidebar}>×</button>
        </div>

        <div className="maps-list">
          {maps.map((map) => (
            <div 
              key={map.id} 
              className={`map-item ${map.id === currentMapId ? 'active' : ''}`}
              onClick={() => onSelectMap(map.id)}
            >
              <span className="map-title">{map.title}</span>
              
              {/* Don't allow deleting the last map */}
              {maps.length > 1 && (
                <button 
                  className="delete-map-btn"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent selecting the map when deleting
                    if(window.confirm(`Delete "${map.title}"?`)) onDeleteMap(map.id);
                  }}
                >
                  <AiOutlineDelete />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Create New Map Section */}
        <div className="sidebar-footer">
          {isCreating ? (
            <form onSubmit={handleCreate} className="create-map-form">
  <textarea
    autoFocus
    placeholder="Map Name..."
    value={newMapTitle}
    onChange={(e) => setNewMapTitle(e.target.value)}
    onBlur={() => !newMapTitle && setIsCreating(false)}
    rows={1}   // starts as a single line
  />
  <button type="submit">Go</button>
</form>

          ) : (
            <button className="create-map-btn" onClick={() => setIsCreating(true)}>
              <AiOutlinePlus /> New Map
            </button>
          )}
        </div>
      </div>
    </>
  );
}