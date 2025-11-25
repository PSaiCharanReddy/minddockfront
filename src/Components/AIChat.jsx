import { useState, useEffect, useRef } from 'react';
import { AiOutlineClose, AiOutlineSend } from 'react-icons/ai';
import apiClient from '../api';
import './AIChat.css';

// We accept 'tasks', 'goals', 'notes' for context
// AND 'onAiAction', 'onAiCreateGoal', 'onAiCreateTask' for executing commands
function AIChat({ 
  nodes, edges, tasks, goals, notes, 
  onAiGeneratedMap, 
  onAiCreateGoal, // <-- New Prop
  onAiCreateTask, // <-- New Prop
  onAiAction,     // <-- New Prop (For Deleting)
  isOpen, toggleChat 
}) {
  const [messages, setMessages] = useState([
    { from: 'ai', text: 'Hello! How can I help you organize your mind?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatBodyRef = useRef(null); 

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (input.trim() === '' || isLoading) return;

    setIsLoading(true);
    
    const userMessage = { from: 'user', text: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');

    const apiMessages = newMessages.map(msg => ({
      from_user: msg.from === 'user',
      text: msg.text
    }));
    
    // Clean circular references from nodes before sending
    const cleanNodes = nodes ? nodes.map(({ selected, dragging, ...node }) => node) : [];

    try {
      const response = await apiClient.post('/ai/chat', {
        messages: apiMessages,
        nodes: cleanNodes,
        edges: edges || [],
        tasks: tasks || [], 
        goals: goals || [],
        notes: notes || []
      });

      const data = response.data;
      const aiReply = { from: 'ai', text: data.reply };
      setMessages([...newMessages, aiReply]);

      // --- HANDLE AI ACTIONS ---

      // 1. Generate Map
      if (data.newMapData && data.newMapData.nodes && data.newMapData.nodes.length > 0) {
        onAiGeneratedMap(data.newMapData);
      }

      // 2. Create Goal
      if (data.newGoal && onAiCreateGoal) {
        onAiCreateGoal(data.newGoal);
      }

      // 3. Create Task
      if (data.newTask && onAiCreateTask) {
        onAiCreateTask(data.newTask);
      }

      // 4. System Commands (DELETE)
      if (data.action_command && onAiAction) {
        // For specific deletions, pass both the command and target ID
        onAiAction(data.action_command, data.target_id);
      }

    } catch (error) {
      console.error("Error calling AI chat:", error);
      const errorReply = { from: 'ai', text: 'Sorry, I ran into an error. Please try again.' };
      setMessages([...newMessages, errorReply]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`chat-window ${isOpen ? 'open' : ''}`}>
      <div className="chat-header">
        <h3>MindDock AI</h3>
        <button onClick={toggleChat} className="chat-close-btn">
          <AiOutlineClose />
        </button>
      </div>
      
      <div className="chat-body" ref={chatBodyRef}>
        {messages.map((msg, index) => (
          <div key={index} className={`chat-message ${msg.from}`}>
            <p>{msg.text}</p>
          </div>
        ))}
        {isLoading && (
          <div className="chat-message ai">
            <p>Thinking...</p>
          </div>
        )}
      </div>
      
      <div className="chat-input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your tasks, goals, or maps..."
          disabled={isLoading}
        />
        <button onClick={handleSend} className="chat-send-btn" disabled={isLoading}>
          <AiOutlineSend />
        </button>
      </div>
    </div>
  );
}

export default AIChat;
