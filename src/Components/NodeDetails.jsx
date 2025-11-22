import { useState, useEffect } from 'react';
import { AiOutlineClose, AiOutlineSave, AiOutlineLink } from 'react-icons/ai';
import './NodeDetails.css'; // We will create this next

export default function NodeDetails({ node, isOpen, onClose, onSave }) {
  const [notes, setNotes] = useState("");
  const [link, setLink] = useState("");

  // Load node data when the node changes
  useEffect(() => {
    if (node) {
      setNotes(node.data.notes || "");
      setLink(node.data.link || "");
    }
  }, [node]);

  const handleSave = () => {
    onSave(node.id, { notes, link });
  };

  if (!node) return null;

  return (
    <div className={`details-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="details-header">
        <h3>📝 Node Details</h3>
        <button onClick={onClose} className="close-btn">×</button>
      </div>

      <div className="details-content">
        <h2 className="details-title">{node.data.label}</h2>
        
        <div className="details-group">
          <label><AiOutlineLink /> Resource Link</label>
          <input 
            type="text" 
            placeholder="https://youtube.com/..." 
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
          {link && (
            <a href={link} target="_blank" rel="noopener noreferrer" className="visit-link">
              Open Link ↗
            </a>
          )}
        </div>

        <div className="details-group full-height">
          <label>Notes & Ideas</label>
          <textarea 
            placeholder="Type your detailed notes here..." 
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <button onClick={handleSave} className="save-details-btn">
          <AiOutlineSave /> Save Changes
        </button>
      </div>
    </div>
  );
}