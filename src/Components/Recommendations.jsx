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
  }, [isOpen, tasks, goals, notes]);

  const generateInsights = async () => {
    setLoading(true);
    setInsights([]);
    
    try {
      // Generate smart insights based on actual user data
      const smartInsights = [];
      
      // Check for overdue tasks
      const now = new Date();
      const overdue = tasks.filter(t => !t.is_completed && t.due_date && new Date(t.due_date) < now);
      if (overdue.length > 0) {
        smartInsights.push({
          type: 'warning',
          message: `You have ${overdue.length} overdue task(s). Reschedule them to get back on track!`,
          action_code: 'RESCHEDULE_OVERDUE',
          action_label: 'Reschedule to Today'
        });
      }
      
      // Check for complex tasks that need decomposition
      const complexTasks = tasks.filter(t => 
        !t.is_completed && 
        t.title && 
        (t.title.length > 30 || t.title.toLowerCase().includes('project') || t.title.toLowerCase().includes('plan'))
      );
      if (complexTasks.length > 0) {
        smartInsights.push({
          type: 'tip',
          message: `Found ${complexTasks.length} complex task(s). Breaking them into subtasks can boost productivity!`,
          action_code: 'DECOMPOSE_TASK',
          action_label: 'Create Subtasks'
        });
      }
      
      // Check for stagnant goals
      const stagnantGoals = goals.filter(g => g.progress_percentage < 20);
      if (stagnantGoals.length > 0) {
        smartInsights.push({
          type: 'warning',
          message: `${stagnantGoals.length} goal(s) need attention. Time to focus and make progress!`,
          action_code: 'PRIORITIZE',
          action_label: 'Mark as Priority'
        });
      }
      
      // Check for task completion rate
      const completedTasks = tasks.filter(t => t.is_completed).length;
      const totalTasks = tasks.length;
      if (totalTasks > 0) {
        const completionRate = (completedTasks / totalTasks) * 100;
        if (completionRate > 70) {
          smartInsights.push({
            type: 'success',
            message: `Amazing! You've completed ${completionRate.toFixed(0)}% of your tasks. Keep up the great work! 🎉`,
            action_code: 'NONE',
            action_label: null
          });
        }
      }
      
      // Check if user has too many pending tasks
      const pendingTasks = tasks.filter(t => !t.is_completed);
      if (pendingTasks.length > 10) {
        smartInsights.push({
          type: 'tip',
          message: `You have ${pendingTasks.length} pending tasks. Consider archiving completed ones or delegating some work.`,
          action_code: 'REMOVE_DISTRACTION',
          action_label: 'Clean Up Tasks'
        });
      }
      
      // Check for goals without tasks
      const goalsWithoutTasks = goals.filter(goal => {
        const goalTasks = tasks.filter(t => t.goal_id === goal.id);
        return goalTasks.length === 0;
      });
      if (goalsWithoutTasks.length > 0) {
        smartInsights.push({
          type: 'tip',
          message: `${goalsWithoutTasks.length} goal(s) have no tasks linked. Create action items to start making progress!`,
          action_code: 'NONE',
          action_label: null
        });
      }
      
      // If no issues found
      if (smartInsights.length === 0) {
        smartInsights.push({
          type: 'success',
          message: '🎉 Everything looks great! You\'re staying on top of your tasks and goals. Keep it up!',
          action_code: 'NONE',
          action_label: null
        });
      }
      
      setInsights(smartInsights);
    } catch (error) {
      console.error("Failed to generate insights:", error);
      setInsights([{
        type: 'warning',
        message: 'Failed to generate insights. Please try again.',
        action_code: 'NONE',
        action_label: null
      }]);
    } finally {
      setLoading(false);
    }
  };

  // --- SMART ACTION HANDLER ---
  const handleAction = async (insight) => {
    setProcessingAction(insight);
    
    try {
      if (insight.action_code === "RESCHEDULE_OVERDUE") {
        const now = new Date();
        const overdue = tasks.filter(t => !t.is_completed && t.due_date && new Date(t.due_date) < now);
        
        if (overdue.length === 0) {
          alert("No overdue tasks to reschedule!");
          setProcessingAction(null);
          return;
        }

        const today = new Date();
        today.setHours(9, 0, 0, 0);

        for (const task of overdue) {
          try {
            await apiClient.delete(`/tasks/${task.id}`);
            await apiClient.post('/tasks/', {
              title: task.title,
              description: task.description,
              due_date: today.toISOString(),
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
        const complexTasks = tasks.filter(t => 
          !t.is_completed && 
          t.title && 
          (t.title.length > 30 || t.title.toLowerCase().includes('project') || t.title.toLowerCase().includes('plan'))
        );
        
        if (complexTasks.length === 0) {
          alert("No complex tasks found to decompose!");
          setProcessingAction(null);
          return;
        }

        const taskToDecompose = complexTasks[0];
        
        try {
          const response = await apiClient.post('/ai/chat', {
            messages: [{ 
              from_user: true, 
              text: `Break down this task into 3-5 actionable subtasks: "${taskToDecompose.title}"\n\nProvide a numbered list with clear, specific subtasks.` 
            }],
            nodes: [], edges: [], tasks: [], goals: [], notes: []
          });

          const reply = response.data.reply;
          const subtaskLines = reply.split('\n').filter(line => line.trim().match(/^[\d\.\-\*\•]/));
          
          if (subtaskLines.length === 0) {
            alert("AI suggested: " + reply);
            setProcessingAction(null);
            return;
          }

          for (const line of subtaskLines) {
            const subtaskTitle = line.replace(/^[\d\.\-\*\•\s]+/, '').trim();
            if (subtaskTitle) {
              await apiClient.post('/tasks/', {
                title: subtaskTitle,
                description: `Subtask of: ${taskToDecompose.title}`,
                due_date: new Date().toISOString(),
                goal_id: taskToDecompose.goal_id
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
      
      else if (insight.action_code === "REMOVE_DISTRACTION") {
        const completedTasks = tasks.filter(t => t.is_completed);
        
        if (completedTasks.length === 0) {
          alert("No completed tasks to clean up!");
          setProcessingAction(null);
          return;
        }

        if (!window.confirm(`Delete ${completedTasks.length} completed tasks?`)) {
          setProcessingAction(null);
          return;
        }

        for (const task of completedTasks) {
          try {
            await apiClient.delete(`/tasks/${task.id}`);
          } catch (e) {
            console.error("Failed to delete task", e);
          }
        }

        alert(`✅ Cleaned up ${completedTasks.length} completed tasks!`);
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
              {insights.map((item, index) => (
                <div key={index} className={`rec-card ${item.type}`}>
                  <div className="rec-icon">
                    {item.type === 'warning' && <AiOutlineWarning />}
                    {item.type === 'success' && <AiOutlineCheckCircle />}
                    {item.type === 'tip' && <AiOutlineThunderbolt />}
                  </div>
                  <div className="rec-content">
                    <p className="rec-message">{item.message}</p>
                    {item.action_code !== "NONE" && item.action_label && (
                      <button 
                        className="rec-action-btn"
                        onClick={() => handleAction(item)}
                        disabled={!!processingAction}
                      >
                         {processingAction === item ? "⏳ Working..." : item.action_label}
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
