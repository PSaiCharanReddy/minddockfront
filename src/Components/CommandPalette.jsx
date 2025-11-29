import { useState, useEffect, useRef } from 'react';
import { AiOutlineSearch, AiOutlineNodeIndex, AiOutlineCheckSquare, AiOutlineTrophy, AiOutlineBook } from 'react-icons/ai';
import './CommandPalette.css';

export default function CommandPalette({ 
  isOpen, 
  onClose, 
  nodes, 
  tasks, 
  goals, 
  notes,
  maps, // Add maps to search across
  onNavigate // This should handle navigation to different pages
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const lowerQuery = query.toLowerCase();
    
    // Search nodes with map information
    const filteredNodes = nodes.map(n => ({ 
      ...n, 
      type: 'node'
    })).filter(n => n.data.label.toLowerCase().includes(lowerQuery));
      
    const filteredTasks = tasks.map(t => ({ ...t, type: 'task' }))
      .filter(t => t.title.toLowerCase().includes(lowerQuery));
      
    const filteredGoals = goals.map(g => ({ ...g, type: 'goal' }))
      .filter(g => g.title.toLowerCase().includes(lowerQuery));

    const filteredNotes = (notes || []).map(n => ({...n, type: 'note'}))
       .filter(n => (n.content || '').toLowerCase().includes(lowerQuery));

    setResults([...filteredNodes, ...filteredTasks, ...filteredGoals, ...filteredNotes]);
    setSelectedIndex(0);
  }, [query, nodes, tasks, goals, notes]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, results.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + results.length) % Math.max(1, results.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleSelect = (item) => {
    console.log('🔍 Selected item:', item);
    onNavigate(item);
    onClose();
    setQuery("");
  };

  if (!isOpen) return null;

  return (
    <div className="palette-overlay" onClick={onClose}>
      <div className="palette-container" onClick={e => e.stopPropagation()}>
        <div className="palette-header">
          <AiOutlineSearch className="search-icon" />
          <input 
            ref={inputRef}
            type="text" 
            placeholder="Search nodes, tasks, goals, notes..." 
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <span className="esc-hint">ESC to close</span>
        </div>
        
        <div className="palette-results">
          {results.length === 0 && !query && (
            <div className="search-hint">
              <p>🔍 <strong>Quick Search</strong></p>
              <p>Search across all your content:</p>
              <ul>
                <li>📍 <strong>Nodes</strong> - Find and zoom to map nodes</li>
                <li>✅ <strong>Tasks</strong> - Jump to task panel</li>
                <li>🎯 <strong>Goals</strong> - Open goal details</li>
                <li>📝 <strong>Notes</strong> - View journal entries</li>
              </ul>
              <p className="tip">💡 Type to start searching...</p>
            </div>
          )}
          {results.length === 0 && query && (
            <div className="no-results">
              <p>No results found for "{query}"</p>
              <p className="tip">Try searching for task names, goal titles, or node labels</p>
            </div>
          )}
          {results.map((item, index) => (
            <div 
              key={item.id + item.type} 
              className={`result-item ${index === selectedIndex ? 'selected' : ''}`}
              onClick={() => handleSelect(item)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="result-icon">
                {item.type === 'node' && <AiOutlineNodeIndex />}
                {item.type === 'task' && <AiOutlineCheckSquare />}
                {item.type === 'goal' && <AiOutlineTrophy />}
                {item.type === 'note' && <AiOutlineBook />}
              </div>
              <div className="result-info">
                <div className="result-title-group">
                  <span className="result-title">
                    {item.type === 'node' ? item.data.label : (item.title || (item.content ? item.content.substring(0, 40) + '...' : 'Untitled'))}
                  </span>
                  {item.type === 'node' && item.mapTitle && (
                    <span className="result-map-badge">{item.mapTitle}</span>
                  )}
                </div>
                <span className="result-type">{item.type.toUpperCase()}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="palette-footer">
          <span className="shortcut">↑↓ Navigate</span>
          <span className="shortcut">↵ Select</span>
          <span className="shortcut">ESC Close</span>
        </div>
      </div>
    </div>
  );
}
