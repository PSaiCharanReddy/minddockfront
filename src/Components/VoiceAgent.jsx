import { useState, useEffect, useRef } from 'react';
import { AiOutlineAudio, AiOutlineClose, AiOutlineEye } from 'react-icons/ai';
import { toPng } from 'html-to-image'; 
import apiClient from '../api';
import './VoiceAgent.css';

export default function VoiceAgent({ 
  isOpen, 
  onClose, 
  appRef, 
  onAction,
  onCreateGoal,
  onCreateTask,
  onDeleteAction,
  onNavigate,
  tasks, 
  goals, 
  notes, 
  nodes, 
  edges 
}) {
  const [status, setStatus] = useState("idle");
  const [transcript, setTranscript] = useState("");
  const [recognition, setRecognition] = useState(null);
  const synth = window.speechSynthesis;
  const isContinuous = useRef(true);

  useEffect(() => {
    if (isOpen) {
      isContinuous.current = true;
      startListening();
    } else {
      isContinuous.current = false;
      stopListening();
    }
    return () => stopListening();
  }, [isOpen]);

  // CLEAN TEXT FOR VOICE (Remove emojis and unwanted chars)
  const cleanTextForVoice = (text) => {
    return text
      .replace(/⏳/g, '')
      .replace(/📅/g, '')
      .replace(/✅/g, '')
      .replace(/🔥/g, '')
      .replace(/🎯/g, '')
      .replace(/🗑️/g, '')
      .replace(/📝/g, '')
      .replace(/[\s\s]+/g, ' ')
      .trim();
  };

  const startListening = () => {
    if (!isContinuous.current) return;

    if (!('webkitSpeechRecognition' in window)) {
      alert("Voice not supported. Try Chrome.");
      return;
    }

    if (recognition) recognition.abort();

    const newRecognition = new window.webkitSpeechRecognition();
    newRecognition.continuous = false;
    newRecognition.interimResults = false;
    newRecognition.lang = 'en-US';

    newRecognition.onstart = () => setStatus("listening");
    
    newRecognition.onresult = async (event) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      
      if (['stop', 'exit', 'close', 'goodbye'].some(cmd => text.toLowerCase().includes(cmd))) {
        speakResponse("Goodbye!");
        isContinuous.current = false;
        setTimeout(onClose, 1500);
        return;
      }

      handleVoiceCommand(text);
    };

    newRecognition.onerror = (event) => {
      if (event.error === 'no-speech' && isContinuous.current) {
        newRecognition.stop(); 
      } else {
        setStatus("idle");
      }
    };

    newRecognition.onend = () => {
      if (status === "listening" && isContinuous.current) {
        startListening();
      }
    };

    setRecognition(newRecognition);
    try { newRecognition.start(); } catch (e) { console.error(e); }
  };

  const stopListening = () => {
    isContinuous.current = false;
    if (recognition) recognition.abort();
    if (synth) synth.cancel(); 
    setStatus("idle");
  };

  const handleVoiceCommand = async (text) => {
    setStatus("processing");
    const textLower = text.toLowerCase();
    
    // ========================================
    // VOICE NAVIGATION COMMANDS - Direct page transitions
    // ========================================
    
    // Dashboard / Home
    if (['dashboard', 'home', 'go home', 'main menu', 'back to dashboard', 'homepage'].some(cmd => textLower.includes(cmd))) {
      speakResponse("Taking you to dashboard");
      if (onNavigate) onNavigate('dashboard');
      return;
    }

    // Tasks / Timetable / Schedule
    if (['task', 'tasks', 'to do', 'todos', 'timetable', 'schedule', 'go to task', 'my tasks', 'show tasks', 'list tasks'].some(cmd => textLower.includes(cmd))) {
      speakResponse("Opening your tasks and schedule");
      if (onNavigate) onNavigate('tasks');
      return;
    }

    // Goals / Objectives
    if (['goal', 'goals', 'target', 'targets', 'objective', 'go to goal', 'my goals', 'show goals', 'objective'].some(cmd => textLower.includes(cmd))) {
      speakResponse("Opening your goals");
      if (onNavigate) onNavigate('goals');
      return;
    }

    // Journal / Notes / Diary
    if (['journal', 'journal entries', 'note', 'notes', 'diary', 'entries', 'go to journal', 'my journal', 'my notes'].some(cmd => textLower.includes(cmd))) {
      speakResponse("Opening your journal");
      if (onNavigate) onNavigate('journal');
      return;
    }

    // Maps - Open Maps View
    if (['show maps', 'maps view', 'go to maps', 'map list', 'all maps', 'open maps'].some(cmd => textLower.includes(cmd))) {
      speakResponse("Opening your mind maps");
      if (onNavigate) onNavigate('maps');
      return;
    }

    // ========================================
    // AI-POWERED COMMANDS (Create, Brainstorm, etc)
    // ========================================
    // Don't return after detection - let AI process it below
    // This ensures proper mindmap creation, task creation, etc.

    // ANALYSIS CHECK (for vision)
    let imageData = null;
    if (['screen', 'look', 'see', 'analyze map', 'analyze', 'analyze this'].some(w => textLower.includes(w))) {
      try {
        const viewport = document.querySelector('.react-flow__viewport'); 
        if (viewport) {
          const dataUrl = await toPng(viewport, { pixelRatio: 1 }); 
          imageData = dataUrl.split(',')[1]; 
        }
      } catch (e) { console.error("Vision failed", e); }
    }

    // SEND TO AI WITH FULL CONTEXT
    try {
      const cleanNodes = nodes ? nodes.map(({ selected, dragging, ...n }) => n) : [];

      const response = await apiClient.post('/ai/chat', {
        messages: [{ from_user: true, text: text }],
        nodes: cleanNodes, 
        edges: edges || [], 
        tasks: tasks || [], 
        goals: goals || [], 
        notes: notes || [],
        selectedNodes: [],
        uploads: imageData ? [{ data: imageData, mime_type: "image/png" }] : []
      });

      const reply = response.data.reply;
      const cleanReply = cleanTextForVoice(reply);
      
      // SPEAK CLEANED RESPONSE
      speakResponse(cleanReply);

      // EXECUTE ACTIONS
      // 1. Map Generation (highest priority)
      if (response.data.newMapData && response.data.newMapData.nodes && response.data.newMapData.nodes.length > 0) {
        console.log("📍 Voice: Creating map with", response.data.newMapData.nodes.length, "nodes");
        onAction(response.data.newMapData);
        // Auto-navigate to maps after creating
        setTimeout(() => {
          if (onNavigate) onNavigate('maps');
        }, 500);
      }

      // 2. Goal Creation
      if (response.data.newGoal && onCreateGoal) {
        onCreateGoal(response.data.newGoal);
      }

      // 3. Task Creation
      if (response.data.newTask && onCreateTask) {
        onCreateTask(response.data.newTask);
      }

      // 4. Delete Actions
      if (response.data.action_command && onDeleteAction) {
        onDeleteAction(response.data.action_command, response.data.target_id);
      }

    } catch (error) {
      console.error("Voice AI Error", error);
      speakResponse("I'm sorry, I encountered an error.");
    }
  };

  const speakResponse = (text) => {
    setStatus("speaking");
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    utterance.onend = () => {
      if (isContinuous.current) {
        setStatus("listening");
        startListening();
      } else {
        setStatus("idle");
      }
    };
    synth.speak(utterance);
  };

  if (!isOpen) return null;

  return (
    <div className="voice-overlay">
      <div className={`voice-orb ${status}`}>
        <div className="orb-core">
          {status === "listening" && <AiOutlineAudio className="mic-icon" />}
          {status === "processing" && <div className="pulse-animation"></div>}
          {status === "speaking" && <div className="wave-animation"></div>}
        </div>
      </div>
      
      <div className="voice-feedback">
        <p className="voice-status">
          {status === "listening" ? "🎤 Listening..." : 
           status === "processing" ? "🤔 Processing..." : 
           status === "speaking" ? "🔊 Speaking..." : "Ready"}
        </p>
        {transcript && <p className="voice-transcript">"{transcript}"</p>}
        
        <div className="voice-commands">
          <p className="commands-title">💡 Navigation & Creation:</p>
          <ul>
            <li>🗺️ Navigation: "Go to dashboard", "Show tasks", "Open goals", "My journal", "Maps view"</li>
            <li>📝 Create: "Create task: buy milk", "Create goal: learn coding"</li>
            <li>🛣️ Maps: "Create roadmap for Python", "Brainstorm ideas for app"</li>
            <li>❌ Delete: "Delete task eat", "Clear all tasks"</li>
            <li>📊 Query: "List my tasks", "Show all goals", "Analyze my progress"</li>
            <li>❌ Exit: Say "stop", "exit", "close", or "goodbye"</li>
          </ul>
        </div>
      </div>

      <button onClick={onClose} className="voice-close-btn"><AiOutlineClose /></button>
    </div>
  );
}
