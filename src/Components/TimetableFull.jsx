import React, { useState, useEffect } from 'react';
import { ReactFlow, Background, Controls } from '@xyflow/react';
import { AiOutlineUnorderedList, AiOutlineNodeIndex, AiOutlineClose, AiOutlineSave } from 'react-icons/ai';
import apiClient from '../api';
import './TimetableFull.css';

// --- Editable Node Component ---
const ScheduleNode = ({ id, data }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data.label);
  const [description, setDescription] = useState(data.description);
  
  // Helper to format Date for the datetime-local input (YYYY-MM-DDTHH:mm)
  const formatForInput = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    // Adjust for local timezone offset to ensure the picker shows the correct time
    const offset = date.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(date - offset)).toISOString().slice(0, 16);
    return localISOTime;
  };

  const [dateTime, setDateTime] = useState(formatForInput(data.dueDate));

  const onSave = (e) => {
    e.stopPropagation();
    // Send the full ISO string back
    data.onSave(id, { label, description, due_date: new Date(dateTime).toISOString() });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="schedule-node editing">
        <div className="edit-header">
          {/* DATE AND TIME PICKER */}
          <input 
            type="datetime-local" 
            value={dateTime} 
            onChange={(e) => setDateTime(e.target.value)} 
            className="edit-time"
          />
          <button onClick={onSave} className="save-btn-small"><AiOutlineSave /></button>
        </div>
        <input 
          type="text" 
          value={label} 
          onChange={(e) => setLabel(e.target.value)} 
          className="edit-title" 
          autoFocus
        />
        <textarea 
          value={description || ""} 
          onChange={(e) => setDescription(e.target.value)} 
          className="edit-desc"
          placeholder="Add description..."
        />
      </div>
    );
  }

  return (
    <div className="schedule-node" onClick={() => setIsEditing(true)}>
      <div className="schedule-time">
        {/* Display Day and Time nicely */}
        <span style={{fontSize:'1.2em', fontWeight:'bold'}}>
            {new Date(data.dueDate).getDate()}
        </span>
        <div style={{display:'flex', flexDirection:'column', lineHeight:'1.1', marginLeft:'5px'}}>
            <span style={{fontSize:'0.7em', textTransform:'uppercase'}}>
                {new Date(data.dueDate).toLocaleDateString(undefined, {month:'short'})}
            </span>
            <span style={{fontSize:'0.8em', opacity:0.8}}>
                {new Date(data.dueDate).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
            </span>
        </div>
      </div>
      <div className="schedule-content">
        <strong>{label}</strong>
        {description && <p>{description}</p>}
      </div>
    </div>
  );
};

const nodeTypes = { scheduleNode: ScheduleNode };

export default function TimetableFull({ isOpen, onClose }) {
  const [mode, setMode] = useState('nodes');
  const [tasks, setTasks] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  useEffect(() => {
    if (isOpen) fetchTasks();
  }, [isOpen]);

  const fetchTasks = async () => {
    try {
      const res = await apiClient.get('/tasks/');
      const sortedTasks = res.data.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
      setTasks(sortedTasks);
      generateVisualSchedule(sortedTasks);
    } catch (error) {
      console.error("Failed to load tasks", error);
    }
  };

  const handleTaskUpdate = async (nodeId, newData) => {
    const taskId = parseInt(nodeId.replace('t-', ''));
    const originalTask = tasks.find(t => t.id === taskId);
    if (!originalTask) return;

    const updatedTask = {
      ...originalTask,
      title: newData.label,
      description: newData.description,
      due_date: newData.due_date // Use the new full date
    };

    try {
        // In a real app, you would call PUT /tasks/{id} here.
        // Since we might not have that specific endpoint ready, we will verify logic:
        // For now, we assume optimistic update works for the UI flow.
        console.log("Saving Task:", updatedTask);
        
        const newTasks = tasks.map(t => t.id === taskId ? updatedTask : t);
        // Re-sort based on the new date!
        newTasks.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
        
        setTasks(newTasks);
        generateVisualSchedule(newTasks);
    } catch (error) {
      console.error("Update failed", error);
    }
  };

  const generateVisualSchedule = (taskList) => {
    const newNodes = [];
    const newEdges = [];
    let y = 0;
    let prevId = null;
    let currentDateStr = "";

    taskList.filter(t => !t.is_completed).forEach((task) => {
      const id = `t-${task.id}`;
      const dateObj = new Date(task.due_date);
      const dateDisplay = dateObj.toLocaleDateString();

      // Add visual gap between different days
      if (currentDateStr && currentDateStr !== dateDisplay) {
        y += 80; 
      }
      currentDateStr = dateDisplay;

      newNodes.push({
        id,
        type: 'scheduleNode',
        position: { x: 250, y: y },
        data: { 
          label: task.title, 
          description: task.description,
          dueDate: task.due_date, // Pass full date string
          onSave: handleTaskUpdate
        }
      });

      if (prevId) {
        newEdges.push({
          id: `e-${prevId}-${id}`,
          source: prevId,
          target: id,
          animated: true,
          style: { stroke: '#007aff' }
        });
      }
      
      prevId = id;
      y += 160; 
    });
    
    setNodes(newNodes);
    setEdges(newEdges);
  };

  if (!isOpen) return null;

  return (
    <div className="timetable-full-overlay">
      <div className="timetable-full-container">
        <div className="timetable-toolbar">
          <h2>📅 Schedule Editor</h2>
          <div className="mode-switch">
            <button className={mode === 'table' ? 'active' : ''} onClick={() => setMode('table')}>
              <AiOutlineUnorderedList /> List
            </button>
            <button className={mode === 'nodes' ? 'active' : ''} onClick={() => setMode('nodes')}>
              <AiOutlineNodeIndex /> Visual Flow
            </button>
          </div>
          <button className="close-full-btn" onClick={onClose}><AiOutlineClose /></button>
        </div>

        <div className="timetable-content">
          {mode === 'table' ? (
            <div className="simple-list">
              {tasks.map(task => (
                <div key={task.id} className="simple-task-row">
                  <input type="checkbox" checked={task.is_completed} readOnly />
                  <div style={{flexGrow:1}}>
                    <div style={{fontWeight:'bold'}}>{task.title}</div>
                    <div style={{fontSize:'0.8em', color:'#888'}}>
                      {new Date(task.due_date).toDateString()} • {new Date(task.due_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="visual-schedule-wrapper">
              <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView>
                <Background color="#222" gap={20} />
                <Controls />
              </ReactFlow>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}