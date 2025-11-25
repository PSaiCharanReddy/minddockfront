import React, { useState, useEffect } from 'react';
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
  const [newMapIds, setNewMapIds] = useState(new Set()); // Track newly created maps

  // Mark maps as "seen" when clicked
  const handleMapSelect = (mapId) => {
    setNewMapIds(prev => {
      const updated = new Set(prev);
      updated.delete(mapId);
      return updated;
    });
    onSelectMap(mapId);
  };

  // When new maps are added, mark them as new
  useEffect(() => {
    if (maps.length > 0) {
      const mapIds = maps.map(m => m.id);
      // Keep only new IDs that are still in the maps list
      setNewMapIds(prev => {
        const updated = new Set(prev);
        mapIds.forEach(id => {
          if (!Array.from(updated).some(existingId => existingId === id)) {
            // If map is new (not yet in our tracking), check if it should be marked new
          }
        });
        return updated;
      });
    }
  }, [maps]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newMapTitle.trim()) return;
    
    // Get current map count
    const newMapData = await onCreateMap(newMapTitle);
    
    // Mark this new map as "unseen"
    if (newMapData && newMapData.id) {
      setNewMapIds(prev => new Set([...prev, newMapData.id]));
    }
    
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
              className={`map-item ${map.id === currentMapId ? 'active' : ''} ${newMapIds.has(map.id) ? 'new-map' : ''}`}
              onClick={() => handleMapSelect(map.id)}
            >
              <span className="map-title">
                {map.title}
                {newMapIds.has(map.id) && <span className="new-badge">✨ NEW</span>}
              </span>
              
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
                rows={1}
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
