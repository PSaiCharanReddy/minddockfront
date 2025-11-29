import { useState, useEffect, useRef } from 'react';
import { AiOutlineAudio, AiOutlineClose } from 'react-icons/ai';
import apiClient from '../api';
import './VoiceAgent.css';

export default function VoiceAgent({ 
  isOpen, onClose, onAction, onCreateGoal, onCreateTask, onDeleteAction, onNavigate, onCreateMap,
  tasks, goals, notes, nodes, edges 
}) {
  const [status, setStatus] = useState("idle");
  const [transcript, setTranscript] = useState("");
  const [recognition, setRecognition] = useState(null);
  const synth = window.speechSynthesis;
  const isContinuous = useRef(true);

  useEffect(() => {
    if (isOpen) {
      isContinuous.current = true;
      setTranscript("");
      startListening();
    } else {
      isContinuous.current = false;
      stopListening();
      setTranscript("");
    }
    return () => stopListening();
  }, [isOpen]);

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
      
      if (['stop', 'exit', 'close', 'goodbye', 'cancel'].some(cmd => text.toLowerCase().includes(cmd))) {
        speakResponse("Goodbye!");
        isContinuous.current = false;
        setTimeout(onClose, 1500);
        return;
      }

      await handleVoiceCommand(text);
    };

    newRecognition.onerror = (event) => {
      if (event.error === 'no-speech' && isContinuous.current) {
        setTimeout(() => {
          if (isContinuous.current) startListening();
        }, 100);
      } else if (event.error !== 'aborted' && isContinuous.current) {
        setTimeout(() => startListening(), 1000);
      }
    };

    newRecognition.onend = () => {
      if (isContinuous.current) {
        setTimeout(() => {
          if (isContinuous.current) startListening();
        }, 100);
      } else {
        setStatus("idle");
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

    // Check if this is a roadmap/brainstorm command - create NEW map for it
    if (textLower.includes('roadmap') || textLower.includes('road map') || textLower.includes('brainstorm') || textLower.includes('brain storm')) {
      const isRoadmap = textLower.includes('roadmap') || textLower.includes('road map');
      const topic = text
        .replace(/roadmap/gi, '')
        .replace(/road map/gi, '')
        .replace(/brainstorm/gi, '')
        .replace(/brain storm/gi, '')
        .replace(/create/gi, '')
        .replace(/for/gi, '')
        .replace(/a/gi, '')
        .trim();
      
      if (!topic || topic.length < 2) {
        speakResponse("Please specify a topic");
        return;
      }

      const mapName = `${isRoadmap ? 'Roadmap' : 'Brainstorm'}: ${topic}`;
      speakResponse(`Creating ${isRoadmap ? 'roadmap' : 'brainstorm'} for ${topic}`);
      
      try {
        // Create new map
        const newMapRes = await apiClient.post('/map/', { title: mapName });
        
        // Call AI to generate content
        const cleanNodes = [];
        const response = await apiClient.post('/ai/chat', {
          messages: [{ from_user: true, text: isRoadmap ? `roadmap for ${topic}` : `brainstorm ${topic}` }],
          nodes: cleanNodes,
          edges: [],
          tasks: tasks || [],
          goals: goals || [],
          notes: notes || [],
          selectedNodes: [],
          uploads: []
        });

        if (response.data.newMapData && response.data.newMapData.nodes && response.data.newMapData.nodes.length > 0) {
          // Save to the new map
          await apiClient.put(`/map/${newMapRes.data.id}`, {
            title: mapName,
            nodes: response.data.newMapData.nodes,
            edges: response.data.newMapData.edges || []
          });
          
          // Navigate to the new map
          if (onCreateMap) {
            await onCreateMap(mapName);
          }
          
          speakResponse(`${isRoadmap ? 'Roadmap' : 'Brainstorm'} created with ${response.data.newMapData.nodes.length} items!`);
        } else {
          speakResponse("Could not generate content. Try again");
        }
      } catch (error) {
        console.error("Voice command error:", error);
        speakResponse("Sorry, something went wrong");
      }
      return;
    }

    // For all other commands, use AI Chat API
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
        uploads: []
      });

      const data = response.data;
      
      // Speak AI response
      if (data.reply) {
        speakResponse(data.reply);
      }

      // Handle map generation (for current map)
      if (data.newMapData && data.newMapData.nodes && data.newMapData.nodes.length > 0) {
        onAction(data.newMapData);
      }

      // Handle goal creation
      if (data.newGoal && onCreateGoal) {
        await onCreateGoal(data.newGoal);
      }

      // Handle task creation
      if (data.newTask && onCreateTask) {
        await onCreateTask(data.newTask);
      }

      // Handle commands
      if (data.action_command && onDeleteAction) {
        onDeleteAction(data.action_command, data.target_id);
      }

    } catch (error) {
      console.error("Voice command error:", error);
      speakResponse("Sorry, something went wrong. Please try again.");
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
          {status === "listening" ? "🎤 LISTENING..." : 
           status === "processing" ? "🤔 Processing..." : 
           status === "speaking" ? "🔊 Speaking..." : "Ready"}
        </p>
        {transcript && <p className="voice-transcript">"{transcript}"</p>}
        
        <div className="voice-commands">
          <p className="commands-title">💡 Just speak naturally!</p>
          <div className="command-categories">
            <div className="command-group">
              <strong>Examples:</strong>
              <ul>
                <li>"create roadmap for Python"</li>
                <li>"brainstorm app ideas"</li>
                <li>"create goal to learn React"</li>
                <li>"create task buy groceries"</li>
                <li>"list all tasks"</li>
                <li>"open tasks"</li>
              </ul>
            </div>
          </div>
          <p className="tip-text">ℹ️ Say "stop" to exit</p>
        </div>
      </div>

      <button onClick={onClose} className="voice-close-btn"><AiOutlineClose /></button>
    </div>
  );
}
