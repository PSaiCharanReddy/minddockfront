import { useCallback } from 'react';
import '../App.css'; // Ensure styles are loaded

export default function ContextMenu({
  id,
  type, // 'node' or 'edge'
  top,
  left,
  onAction, // This is our callback function
}) {
  const handleAction = useCallback(
    (action, payload) => {
      onAction(action, payload);
    },
    [onAction],
  );

  return (
    <div
      style={{ top, left }}
      className="context-menu"
      onContextMenu={(e) => e.preventDefault()} // Prevent default browser menu
    >
      {/* Show different items based on what we clicked */}
      {type === 'node' && (
        <>
          {/* --- ACTIONS --- */}
          <button onClick={() => handleAction('generateRoadmap')}>
            🤖 Generate Roadmap
          </button>
          
          <div style={{ height: 1, background: 'var(--border-color)', margin: '4px 0' }}></div>

          <button onClick={() => handleAction('addToTimetable')}>
            📅 Add Single to Today
          </button>
          
          <button onClick={() => handleAction('planRoadmap')}>
             🗓️ Plan Roadmap (1 Day/Node)
          </button>
          
          <button onClick={() => handleAction('addToGoals')}>
             🎯 Set as Goal
          </button>

          <div style={{ height: 1, background: 'var(--border-color)', margin: '4px 0' }}></div>

          <button onClick={() => handleAction('editDetails')}>
            📝 Edit Notes & Links
          </button>
          <button onClick={() => handleAction('selectGroup')}>
            🔗 Select Entire Group
          </button>
          
          <div style={{ height: 1, background: 'var(--border-color)', margin: '4px 0' }}></div>
          
          {/* --- COLORS --- */}
          <p style={{paddingLeft: 10, fontSize: '0.75rem', color: 'var(--text-muted)'}}>COLOR</p>
          <button onClick={() => handleAction('setNodeColor', { background: '#66bb6a', text: '#fff' })}>Green (Start)</button>
          <button onClick={() => handleAction('setNodeColor', { background: '#ef5350', text: '#fff' })}>Red (End)</button>
          <button onClick={() => handleAction('setNodeColor', { background: '#ffee58', text: '#222' })}>Yellow (Important)</button>
          <button onClick={() => handleAction('setNodeColor', { background: '#2a2a2a', text: '#f0f0f0' })}>Default</button>
        </>
      )}

      {type === 'edge' && (
        <>
          <p>Edge Style</p>
          <button onClick={() => handleAction('setEdgeStyle', 'default')}>Default (Relation)</button>
          <button onClick={() => handleAction('setEdgeStyle', 'directional')}>Directional (Flow)</button>
          <button onClick={() => handleAction('setEdgeStyle', 'dotted')}>Dotted (Optional)</button>
        </>
      )}
    </div>
  );
}