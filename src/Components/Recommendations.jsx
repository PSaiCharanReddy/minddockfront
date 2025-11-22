import { useState, useEffect } from 'react';
import { AiOutlineBulb, AiOutlineClose, AiOutlineWarning, AiOutlineCheckCircle, AiOutlineThunderbolt } from 'react-icons/ai';
import apiClient from '../api';
import './Recommendations.css';

export default function Recommendations({ isOpen, onClose, tasks, goals, notes, onRefresh }) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingAction, setProcessingAction] = useState(null);

  useEffect(() => {
    if (isOpen) generateInsights();
  }, [isOpen]);

  const generateInsights = async () => {
    setLoading(true);
    try {
      const response = await apiClient.post('/ai/chat', {
        messages: [{ from_user: true, text: "Analyze my progress" }],
        nodes: [], edges: [], tasks: tasks, goals: goals, notes: notes
      });
      if (response.data.insights) setInsights(response.data.insights);
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  // --- THE SMART ACTION HANDLER ---
  const handleAction = async (insight) => {
    setProcessingAction(insight);
    
    try {
      if (insight.action_code === "RESCHEDULE_OVERDUE") {
        // 1. Find overdue tasks
        const now = new Date();
        const overdue = tasks.filter(t => !t.is_completed && new Date(t.due_date) < now);
        
        // 2. Update them to Today
        const today = new Date().toISOString();
        for (const task of overdue) {
            // We'd use a bulk update endpoint ideally, but loop works for now
            await apiClient.put(`/tasks/${task.id}/status?completed=false`); // Just touching it to refresh, real app would send date
            // Hack: Since we don't have a dedicated 'update date' endpoint in this MVP router yet,
            // we will delete and re-create them as "Rescheduled" (or you can add the PATCH endpoint).
            // For this demo, let's assume we just alert the user:
            alert("Feature: In full version, this moves dates to today.");
        }
      } 
      
      else if (insight.action_code === "DECOMPOSE_TASK" && insight.target_id) {
        // 1. Find the big task
        const bigTask = tasks.find(t => t.id === parseInt(insight.target_id));
        if (bigTask) {
            // 2. Ask AI for subtasks
            const res = await apiClient.post('/ai/decompose', { task_title: bigTask.title });
            const subtasks = res.data.steps;
            
            // 3. Create them
            for (const sub of subtasks) {
                await apiClient.post('/tasks/', {
                    title: sub,
                    description: `Subtask of: ${bigTask.title}`,
                    due_date: new Date().toISOString()
                });
            }
            alert(`Created ${subtasks.length} subtasks for you!`);
        }
      }
      
      // Refresh data
      if(onRefresh) onRefresh(); 
      
      // Remove this insight as it's "Solved"
      setInsights(prev => prev.filter(i => i !== insight));

    } catch (error) {
      console.error("Action failed", error);
    } finally {
      setProcessingAction(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="rec-overlay">
      <div className="rec-container">
        <div className="rec-header">
          <h3><AiOutlineBulb /> AI Actions</h3>
          <button onClick={onClose}><AiOutlineClose /></button>
        </div>
        
        <div className="rec-body">
          {loading ? (
            <div className="rec-loading"><div className="spinner-large"></div>Checking your workflow...</div>
          ) : (
            <div className="rec-list">
              {insights.length === 0 && <p>No critical actions needed. You're doing great!</p>}
              {insights.map((item, index) => (
                <div key={index} className={`rec-card ${item.type}`}>
                  <div className="rec-icon">
                    {item.type === 'warning' && <AiOutlineWarning />}
                    {item.type === 'success' && <AiOutlineCheckCircle />}
                    {item.type === 'tip' && <AiOutlineThunderbolt />}
                  </div>
                  <div className="rec-content">
                    <p>{item.message}</p>
                    {item.action_code !== "NONE" && (
                      <button 
                        className="rec-action-btn"
                        onClick={() => handleAction(item)}
                        disabled={!!processingAction}
                      >
                         {processingAction === item ? "Working..." : item.action_label || "Fix it"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}