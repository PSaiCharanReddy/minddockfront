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
  onCreateMap,  // NEW: callback to create named map
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
    
    console.log("🎤 Voice Input:", textLower);
    
    // ========================================
    // DIRECT ACTIONS (No AI needed)
    // ========================================

    // Delete Task - DIRECT EXECUTION
    if (textLower.includes("delete task") || textLower.includes("remove task")) {
      const taskName = textLower
        .replace("delete task", "").replace("remove task", "")
        .trim().replace(/[.,!?;:]/g, '');
      
      console.log("🗑️ Direct Delete Task:", taskName);
      
      if (taskName) {
        const matchingTask = tasks.find(t => 
          t.title.toLowerCase().includes(taskName) || 
          taskName.includes(t.title.toLowerCase())
        );
        
        if (matchingTask) {
          speakResponse(`Deleted task ${matchingTask.title}`);
          if (onDeleteAction) onDeleteAction("DELETE_SPECIFIC_TASK", matchingTask.id);
          return;
        } else {
          speakResponse(`Task ${taskName} not found`);
          return;
        }
      }
    }

    // Delete Goal - DIRECT EXECUTION
    if (textLower.includes("delete goal") || textLower.includes("remove goal")) {
      const goalName = textLower
        .replace("delete goal", "").replace("remove goal", "")
        .trim().replace(/[.,!?;:]/g, '');
      
      console.log("🗑️ Direct Delete Goal:", goalName);
      
      if (goalName) {
        const matchingGoal = goals.find(g => 
          g.title.toLowerCase().includes(goalName) || 
          goalName.includes(g.title.toLowerCase())
        );
        
        if (matchingGoal) {
          speakResponse(`Deleted goal ${matchingGoal.title}`);
          if (onDeleteAction) onDeleteAction("DELETE_SPECIFIC_GOAL", matchingGoal.id);
          return;
        } else {
          speakResponse(`Goal ${goalName} not found`);
          return;
        }
      }
    }

    // Clear All Tasks
    if (textLower.includes("clear all task") || textLower.includes("delete all task")) {
      console.log("🗑️ Clear All Tasks");
      speakResponse("Cleared all tasks");
      if (onDeleteAction) onDeleteAction("DELETE_ALL_TASKS", null);
      return;
    }

    // Clear All Goals
    if (textLower.includes("clear all goal") || textLower.includes("delete all goal")) {
      console.log("🗑️ Clear All Goals");
      speakResponse("Cleared all goals");
      if (onDeleteAction) onDeleteAction("DELETE_ALL_GOALS", null);
      return;
    }

    // NEW: Create Named Map
    if (textLower.includes("create map") || textLower.includes("new map")) {
      const mapName = textLower
        .replace("create map", "").replace("new map", "")
        .trim().replace(/[.,!?;:]/g, '') || "Untitled Map";
      
      console.log("🗺️ Creating Named Map:", mapName);
      speakResponse(`Creating new map: ${mapName}`);
      
      if (onCreateMap) {
        await onCreateMap(mapName);
      }
      return;
    }

    // ========================================
    // VOICE NAVIGATION COMMANDS
    // ========================================
    
    if (['dashboard', 'home', 'go home', 'main menu', 'homepage'].some(cmd => textLower.includes(cmd))) {
      speakResponse("Taking you to dashboard");
      if (onNavigate) onNavigate('dashboard');
      return;
    }

    if (['task', 'tasks', 'to do', 'todos', 'timetable', 'schedule', 'show tasks'].some(cmd => textLower.includes(cmd))) {
      speakResponse("Opening your tasks");
      if (onNavigate) onNavigate('tasks');
      return;
    }

    if (['goal', 'goals', 'target', 'targets', 'show goals'].some(cmd => textLower.includes(cmd))) {
      speakResponse("Opening your goals");
      if (onNavigate) onNavigate('goals');
      return;
    }

    if (['journal', 'notes', 'diary'].some(cmd => textLower.includes(cmd))) {
      speakResponse("Opening your journal");
      if (onNavigate) onNavigate('journal');
      return;
    }

    if (['show maps', 'maps view', 'go to maps', 'map list'].some(cmd => textLower.includes(cmd))) {
      speakResponse("Opening your mind maps");
      if (onNavigate) onNavigate('maps');
      return;
    }

    // ========================================
    // AI-POWERED COMMANDS (Create, Roadmap, etc)
    // ========================================

    let imageData = null;
    if (['screen', 'look', 'see', 'analyze map', 'analyze'].some(w => textLower.includes(w))) {
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
      
      speakResponse(cleanReply);

      // 1. Map Generation
      if (response.data.newMapData && response.data.newMapData.nodes && response.data.newMapData.nodes.length > 0) {
        console.log("📍 Creating AI map with", response.data.newMapData.nodes.length, "nodes");
        onAction(response.data.newMapData);
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

      // 4. Delete Actions (from AI)
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
          <p className="commands-title">💡 Voice Commands:</p>
          <ul>
            <li>🗺️ "Create map: [name]" - Creates new map with name</li>
            <li>🛣️ "Create roadmap for [topic]" - AI roadmap</li>
            <li>🧠 "Brainstorm [topic]" - AI brainstorm</li>
            <li>✅ "Create task: [what]" - Add task</li>
            <li>🎯 "Create goal: [goal]" - Add goal</li>
            <li>🗑️ "Delete task: [name]" - Delete task</li>
            <li>🗑️ "Delete goal: [name]" - Delete goal</li>
            <li>📊 "Show tasks", "Show goals", "Open journal"</li>
            <li>❌ "Stop" - Exit voice</li>
          </ul>
        </div>
      </div>

      <button onClick={onClose} className="voice-close-btn"><AiOutlineClose /></button>
    </div>
  );
}
