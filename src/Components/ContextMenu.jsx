import { useCallback } from 'react';

export default function ContextMenu({
  id,
  type,
  top,
  left,
  onAction,
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
      onContextMenu={(e) => e.preventDefault()}
    >
      {type === 'node' && (
        <>
          {/* --- NEW BUTTON --- */}
          <button onClick={() => handleAction('selectGroup')}>
            🔗 Select Entire Group
          </button>
          
          <button onClick={() => handleAction('generateRoadmap')}>
            🤖 Generate Roadmap
          </button>
          
          <p>Node Color</p>
          {/* ... (colors remain the same) ... */}
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