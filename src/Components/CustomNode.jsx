import { useState, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { AiOutlineEye, AiOutlineEyeInvisible, AiOutlineLoading } from 'react-icons/ai';

function CustomNode({ 
  id, data, selected, 
  onLabelChange, onSummaryChange, 
  aiLoadingNode 
}) {
  
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [label, setLabel] = useState(data.label);
  const [summary, setSummary] = useState(data.summary || '');
  const [showSummary, setShowSummary] = useState(false);

  // Close summary/editors when node is deselected
  useEffect(() => {
    if (!selected) {
      setShowSummary(false);
      setIsEditingLabel(false);
      setIsEditingSummary(false);
    }
  }, [selected]);

  // --- Label Editing ---
  const handleDoubleClickLabel = () => setIsEditingLabel(true);
  const handleLabelChange = (e) => setLabel(e.target.value);
  const saveLabel = () => {
    setIsEditingLabel(false);
    if (data.label !== label) onLabelChange(id, label);
  };
  const handleLabelKeyDown = (e) => {
    if (e.key === 'Enter') saveLabel();
  };

  // --- Summary Editing ---
  const handleAddSummaryClick = () => {
    setIsEditingSummary(true);
    setShowSummary(true);
  };
  const handleSummaryChange = (e) => setSummary(e.target.value);
  const saveSummary = () => {
    setIsEditingSummary(false);
    if (data.summary !== summary) onSummaryChange(id, summary);
  };
  const handleSummaryKeyDown = (e) => {
    if (e.key === 'Enter') saveSummary();
  };

  // --- Toggle Summary Visibility ---
  const handleToggleSummary = () => setShowSummary(!showSummary);

  const isLoading = aiLoadingNode === id;

  return (
    <>
      <div className="custom-node" style={data.style}>
        <Handle type="target" position={Position.Top} />

        <div className="node-header">
          <div className="node-content" onDoubleClick={handleDoubleClickLabel}>
            {isEditingLabel ? (
              <input
                type="text"
                value={label}
                onChange={handleLabelChange}
                onBlur={saveLabel}
                onKeyDown={handleLabelKeyDown}
                autoFocus
                className="node-input"
              />
            ) : (
              <div className="node-label">{label}</div>
            )}
          </div>
        </div>
        
        <div className="summary-controls">
          {isLoading && (
            <div className="spinner">
              <AiOutlineLoading />
            </div>
          )}

          {!isLoading && (summary || isEditingSummary) ? (
            <button className="summary-toggle-btn" onClick={handleToggleSummary}>
              {showSummary ? <AiOutlineEye /> : <AiOutlineEyeInvisible />}
            </button>
          ) : (
            !isLoading && <button className="add-summary-btn" onClick={handleAddSummaryClick}>
              +
            </button>
          )}
        </div>

        <Handle type="source" position={Position.Bottom} />
      </div>

      {(showSummary || isEditingSummary) && (
        <div className="node-summary-container">
          {isEditingSummary ? (
            <textarea
              value={summary}
              onChange={handleSummaryChange}
              onBlur={saveSummary}
              onKeyDown={handleSummaryKeyDown}
              autoFocus
              placeholder="Enter summary (AI or user generated)"
              className="summary-textarea"
            />
          ) : (
            <p className="node-summary" onClick={() => setIsEditingSummary(true)}>
              {summary || 'Click to add summary...'}
            </p>
          )}
        </div>
      )}
    </>
  );
}

export default CustomNode;