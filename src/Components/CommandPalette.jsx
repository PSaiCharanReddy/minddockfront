import { useState, useEffect, useRef } from 'react';
import { AiOutlineSearch, AiOutlineNodeIndex, AiOutlineCheckSquare, AiOutlineTrophy, AiOutlineBook } from 'react-icons/ai';
import './CommandPalette.css';

export default function CommandPalette({ 
  isOpen, 
  onClose, 
  nodes, 
  tasks, 
  goals, 
  notes, // Assuming we pass notes in App.jsx
  onNavigate 
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
    
    const filteredNodes = nodes.map(n => ({ ...n, type: 'node' }))
      .filter(n => n.data.label.toLowerCase().includes(lowerQuery));
      
    const filteredTasks = tasks.map(t => ({ ...t, type: 'task' }))
      .filter(t => t.title.toLowerCase().includes(lowerQuery));
      
    const filteredGoals = goals.map(g => ({ ...g, type: 'goal' }))
      .filter(g => g.title.toLowerCase().includes(lowerQuery));

    // Assuming notes are passed or available
    const filteredNotes = (notes || []).map(n => ({...n, type: 'note'}))
       .filter(n => n.content.toLowerCase().includes(lowerQuery));

    setResults([...filteredNodes, ...filteredTasks, ...filteredGoals, ...filteredNotes]);
    setSelectedIndex(0);
  }, [query, nodes, tasks, goals, notes]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      setSelectedIndex(prev => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleSelect = (item) => {
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
            placeholder="Type to search..." 
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <span className="esc-hint">ESC to close</span>
        </div>
        
        <div className="palette-results">
          {results.length === 0 && query && (
            <div className="no-results">No results found.</div>
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
                <span className="result-title">
                  {item.type === 'node' ? item.data.label : (item.title || item.content.substring(0, 30) + '...')}
                </span>
                <span className="result-type">{item.type.toUpperCase()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}