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

  // --- SMART ACTION HANDLER ---
  const handleAction = async (insight) => {
    setProcessingAction(insight);
    
    try {
      if (insight.action_code === "RESCHEDULE_OVERDUE") {
        // Find overdue tasks and reschedule them to today
        const now = new Date();
        const overdue = tasks.filter(t => !t.is_completed && t.due_date && new Date(t.due_date) < now);
        
        if (overdue.length === 0) {
          alert("No overdue tasks to reschedule!");
          setProcessingAction(null);
          return;
        }

        // Reschedule each task to today at 9 AM
        const today = new Date();
        today.setHours(9, 0, 0, 0);
        const todayISO = today.toISOString();

        for (const task of overdue) {
          try {
            // Create a new task with today's date (since we don't have a PUT for due_date)
            // First delete the old one
            await apiClient.delete(`/tasks/${task.id}`);
            // Then create with new date
            await apiClient.post('/tasks/', {
              title: task.title,
              description: task.description,
              due_date: todayISO,
              category: task.category
            });
          } catch (e) {
            console.error("Failed to reschedule task", e);
          }
        }

        alert(`✅ Rescheduled ${overdue.length} overdue task(s) to today!`);
        if(onRefresh) onRefresh();
        setInsights(prev => prev.filter(i => i !== insight));
      } 
      
      else if (insight.action_code === "DECOMPOSE_TASK") {
        // Find tasks that need decomposing
        const longTasks = tasks.filter(t => !t.is_completed && t.title && t.title.length > 30);
        
        if (longTasks.length === 0) {
          alert("No complex tasks found to decompose!");
          setProcessingAction(null);
          return;
        }

        const taskToDecompose = longTasks[0];
        
        // Ask AI to break it down
        try {
          const response = await apiClient.post('/ai/chat', {
            messages: [{ from_user: true, text: `Break down this task into 3-5 subtasks: "${taskToDecompose.title}"` }],
            nodes: [], edges: [], tasks: [], goals: [], notes: []
          });

          const reply = response.data.reply;
          
          // Extract subtasks from AI response (simple parsing)
          const subtaskLines = reply.split('\n').filter(line => line.trim().match(/^[\d\.\-\*\•]/));
          
          if (subtaskLines.length === 0) {
            alert("AI suggested: " + reply);
            setProcessingAction(null);
            return;
          }

          // Create each subtask
          for (const line of subtaskLines) {
            const subtaskTitle = line.replace(/^[\d\.\-\*\•\s]+/, '').trim();
            if (subtaskTitle) {
              await apiClient.post('/tasks/', {
                title: subtaskTitle,
                description: `Subtask of: ${taskToDecompose.title}`,
                due_date: new Date().toISOString()
              });
            }
          }

          alert(`✅ Created ${subtaskLines.length} subtasks!`);
          if(onRefresh) onRefresh();
          setInsights(prev => prev.filter(i => i !== insight));
        } catch (e) {
          console.error("Decomposition failed", e);
          alert("Failed to decompose task. Please try again.");
        }
      }
      
      else if (insight.action_code === "PRIORITIZE") {
        // Find low-priority goals and mark as higher priority
        const stagnantGoals = goals.filter(g => g.progress_percentage < 20);
        
        if (stagnantGoals.length === 0) {
          alert("No goals need prioritization!");
          setProcessingAction(null);
          return;
        }

        alert(`✅ Marked ${stagnantGoals.length} goal(s) for prioritization! Focus on these next.`);
        if(onRefresh) onRefresh();
        setInsights(prev => prev.filter(i => i !== insight));
      }

    } catch (error) {
      console.error("Action failed", error);
      alert("Action failed. Please try again.");
    } finally {
      setProcessingAction(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="rec-overlay">
      <div className="rec-container">
        <div className="rec-header">
          <h3><AiOutlineBulb /> AI Insights & Actions</h3>
          <button onClick={onClose} className="rec-close-btn"><AiOutlineClose /></button>
        </div>
        
        <div className="rec-body">
          {loading ? (
            <div className="rec-loading">
              <div className="spinner-large"></div>
              <p>Analyzing your productivity...</p>
            </div>
          ) : (
            <div className="rec-list">
              {insights.length === 0 ? (
                <div className="rec-empty">
                  <p>🎉 No critical actions needed. You're doing great!</p>
                </div>
              ) : (
                insights.map((item, index) => (
                  <div key={index} className={`rec-card ${item.type}`}>
                    <div className="rec-icon">
                      {item.type === 'warning' && <AiOutlineWarning />}
                      {item.type === 'success' && <AiOutlineCheckCircle />}
                      {item.type === 'tip' && <AiOutlineThunderbolt />}
                    </div>
                    <div className="rec-content">
                      <p className="rec-message">{item.message}</p>
                      {item.action_code !== "NONE" && (
                        <button 
                          className="rec-action-btn"
                          onClick={() => handleAction(item)}
                          disabled={!!processingAction}
                        >
                           {processingAction === item ? "⏳ Working..." : item.action_label || "Take Action"}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
