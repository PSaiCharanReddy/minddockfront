import { useState, useEffect, useMemo } from 'react';
import { AiOutlineBulb, AiOutlineClose, AiOutlineWarning, AiOutlineCheckCircle, AiOutlineThunderbolt, AiOutlineBarChart, AiOutlineRocket } from 'react-icons/ai';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import apiClient from '../api';
import './Recommendations.css';

export default function Recommendations({ isOpen, onClose, tasks, goals, notes, onRefresh }) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingAction, setProcessingAction] = useState(null);

  // Load dismissed keys from localStorage
  const [dismissedKeys, setDismissedKeys] = useState(() => {
    const saved = localStorage.getItem('minddock_dismissed_insights');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  // Save dismissed keys to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('minddock_dismissed_insights', JSON.stringify([...dismissedKeys]));
  }, [dismissedKeys]);

  // --- ANALYTICS DATA ---
  const goalData = useMemo(() => {
    return goals.map(g => ({
      name: g.title.substring(0, 10) + (g.title.length > 10 ? '...' : ''),
      progress: g.progress_percentage
    })).slice(0, 5); // Top 5 goals
  }, [goals]);

  const productivityScore = useMemo(() => {
    if (tasks.length === 0) return 0;
    const completed = tasks.filter(t => t.is_completed).length;
    return Math.round((completed / tasks.length) * 100);
  }, [tasks]);

  useEffect(() => {
    if (isOpen) generateInsights();
  }, [isOpen]); // Only run on open to avoid constant re-fetching

  const generateInsights = async () => {
    setLoading(true);

    try {
      // 1. Static Checks (Immediate feedback)
      const staticInsights = [];
      const now = new Date();

      // Overdue
      const overdue = tasks.filter(t => !t.is_completed && t.due_date && new Date(t.due_date) < now);
      if (overdue.length > 0 && !dismissedKeys.has('RESCHEDULE_OVERDUE')) {
        staticInsights.push({
          type: 'warning',
          message: `You have ${overdue.length} overdue task(s). Reschedule them to get back on track!`,
          action_code: 'RESCHEDULE_OVERDUE',
          action_label: 'Reschedule to Today'
        });
      }

      // 2. AI Strategic Insights (Async)
      // Only fetch if we haven't dismissed the general "AI_STRATEGY" key recently (optional, but good for cost)
      // For now, let's fetch every time to be "live" as requested.

      const context = {
        task_count: tasks.length,
        completed_count: tasks.filter(t => t.is_completed).length,
        goals: goals.map(g => g.title).join(", "),
        recent_notes: notes.slice(0, 3).map(n => n.title).join(", ")
      };

      const prompt = `Analyze this user's productivity context: ${JSON.stringify(context)}. 
      Provide 2 short, strategic, actionable insights to improve their workflow or suggest a new topic/goal. 
      Format: "Insight: [Your insight here] | Action: [Action Label]"
      Keep it brief and motivating.`;

      const aiResponse = await apiClient.post('/ai/chat', {
        messages: [{ from_user: true, text: prompt }],
        nodes: [], edges: [], tasks: [], goals: [], notes: []
      });

      const aiReply = aiResponse.data.reply;
      const aiInsights = [];

      // Parse AI response (simple heuristic)
      const lines = aiReply.split('\n');
      lines.forEach((line, idx) => {
        if (line.includes("Insight:") && !dismissedKeys.has(`AI_INSIGHT_${idx}`)) {
          const parts = line.split("|");
          const message = parts[0].replace("Insight:", "").trim();
          const actionLabel = parts[1] ? parts[1].replace("Action:", "").trim() : "Got it";

          aiInsights.push({
            type: 'tip',
            message: message,
            action_code: `AI_INSIGHT_${idx}`, // Unique-ish ID for this session
            action_label: actionLabel,
            is_ai: true
          });
        }
      });

      setInsights([...staticInsights, ...aiInsights]);

      if (staticInsights.length === 0 && aiInsights.length === 0) {
        setInsights([{
          type: 'success',
          message: '🎉 You are crushing it! No immediate actions needed.',
          action_code: 'NONE',
          action_label: null
        }]);
      }

    } catch (error) {
      console.error("Failed to generate insights:", error);
      // Fallback to static only if AI fails
    } finally {
      setLoading(false);
    }
  };

  // --- ACTION HANDLER ---
  const handleAction = async (insight) => {
    setProcessingAction(insight);

    // Optimistically hide
    setDismissedKeys(prev => {
      const newSet = new Set(prev);
      newSet.add(insight.action_code);
      return newSet;
    });
    setInsights(prev => prev.filter(i => i !== insight));

    try {
      if (insight.action_code === "RESCHEDULE_OVERDUE") {
        const today = new Date();
        today.setHours(9, 0, 0, 0);
        const overdue = tasks.filter(t => !t.is_completed && t.due_date && new Date(t.due_date) < new Date());

        for (const task of overdue) {
          await apiClient.delete(`/tasks/${task.id}`);
          await apiClient.post('/tasks/', { ...task, due_date: today.toISOString(), id: undefined });
        }
        alert(`✅ Rescheduled ${overdue.length} tasks!`);
        if (onRefresh) onRefresh();
      }
      else if (insight.is_ai) {
        // For generic AI insights, the action is usually just acknowledgement or a simple "create"
        // If the label implies creation, we could try to parse it, but for now let's treat it as "Dismiss/Done"
        // or maybe trigger a generic "Help me do this" chat?
        // Let's keep it simple: It's a "Mark as Done" / "I'll do it" button.
      }

    } catch (error) {
      console.error("Action failed", error);
      // Un-dismiss if failed
      setDismissedKeys(prev => {
        const newSet = new Set(prev);
        newSet.delete(insight.action_code);
        return newSet;
      });
    } finally {
      setProcessingAction(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="rec-overlay">
      <div className="rec-container">
        <div className="rec-header">
          <h3><AiOutlineBarChart /> Analytics & Insights</h3>
          <button onClick={onClose} className="rec-close-btn"><AiOutlineClose /></button>
        </div>

        <div className="rec-body">
          {/* --- ANALYTICS DASHBOARD --- */}
          <div className="analytics-grid">
            {/* Redesigned Score Card */}
            <div className="analytics-card score-card-modern">
              <div className="score-header">Productivity Score</div>
              <div className="score-display">
                <span className="score-number">{productivityScore}</span>
                <span className="score-max">/100</span>
              </div>
              <div className="score-bar-bg">
                <div className="score-bar-fill" style={{ width: `${productivityScore}%` }}></div>
              </div>
            </div>

            {/* Goal Chart (Expanded) */}
            <div className="analytics-card chart-card wide">
              <h4>Goal Progress</h4>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={goalData}>
                  <XAxis dataKey="name" stroke="#888" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#333', border: 'none' }} />
                  <Bar dataKey="progress" fill="#82ca9d" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <h4 className="insights-title"><AiOutlineRocket /> Smart Recommendations</h4>

          {loading ? (
            <div className="rec-loading">
              <div className="spinner-large"></div>
              <p>Consulting AI Strategist...</p>
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
                        {processingAction === item ? "Working..." : item.action_label}
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
