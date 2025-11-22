import { useState, useEffect, useRef } from 'react';
import { AiOutlineAudio, AiOutlineClose, AiOutlineEye } from 'react-icons/ai';
import { toPng } from 'html-to-image'; 
import apiClient from '../api';
import './VoiceAgent.css';

// 1. We accept the data props here
export default function VoiceAgent({ isOpen, onClose, appRef, onAction, tasks, goals, notes, nodes, edges }) {
  const [status, setStatus] = useState("idle"); // idle, listening, processing, speaking
  const [transcript, setTranscript] = useState("");
  const recognition = useRef(null);
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

  const startListening = () => {
    if (!isContinuous.current) return;

    if (!('webkitSpeechRecognition' in window)) {
      alert("Voice not supported. Try Chrome.");
      return;
    }

    if (recognition.current) recognition.current.abort();

    recognition.current = new window.webkitSpeechRecognition();
    recognition.current.continuous = false;
    recognition.current.interimResults = false;
    recognition.current.lang = 'en-US';

    recognition.current.onstart = () => setStatus("listening");
    
    recognition.current.onresult = async (event) => {
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

    recognition.current.onerror = (event) => {
      if (event.error === 'no-speech' && isContinuous.current) {
        recognition.current.stop(); 
      } else {
        setStatus("idle");
      }
    };

    recognition.current.onend = () => {
      if (status === "listening" && isContinuous.current) {
        startListening();
      }
    };

    try { recognition.current.start(); } catch (e) { console.error(e); }
  };

  const stopListening = () => {
    isContinuous.current = false;
    if (recognition.current) recognition.current.abort();
    if (synth) synth.cancel(); 
    setStatus("idle");
  };

  const handleVoiceCommand = async (text) => {
    setStatus("processing");
    
    // 1. VISION CHECK
    let imageData = null;
    if (['screen', 'look', 'see', 'analyze map'].some(w => text.toLowerCase().includes(w))) {
      try {
        const viewport = document.querySelector('.react-flow__viewport'); 
        if (viewport) {
            const dataUrl = await toPng(viewport, { pixelRatio: 1 }); 
            imageData = dataUrl.split(',')[1]; 
        }
      } catch (e) { console.error("Vision failed", e); }
    }

    // 2. SEND TO AI (NOW WITH FULL CONTEXT)
    try {
      // Clean nodes just like in AIChat
      const cleanNodes = nodes ? nodes.map(({ selected, dragging, ...n }) => n) : [];

      const response = await apiClient.post('/ai/chat', {
        messages: [{ from_user: true, text: text }],
        
        // --- FIX: PASS THE REAL DATA, NOT EMPTY ARRAYS ---
        nodes: cleanNodes, 
        edges: edges || [], 
        tasks: tasks || [], 
        goals: goals || [], 
        notes: notes || [],
        // -------------------------------------------------
        
        fileData: imageData, 
        mimeType: imageData ? "image/png" : null
      });

      const reply = response.data.reply;
      
      // 3. SPEAK BACK
      speakResponse(reply);

      // 4. EXECUTE ACTIONS
      if (response.data.newMapData) {
        onAction(response.data.newMapData);
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
          {status === "processing" && transcript.toLowerCase().includes("screen") && <AiOutlineEye className="eye-icon" />}
        </div>
      </div>
      
      <div className="voice-feedback">
        <p className="voice-status">
            {status === "listening" ? "Listening..." : 
             status === "processing" ? "Thinking..." : 
             status === "speaking" ? "Speaking..." : "Ready"}
        </p>
        {transcript && <p className="voice-transcript">"{transcript}"</p>}
      </div>

      <button onClick={onClose} className="voice-close-btn"><AiOutlineClose /></button>
    </div>
  );
}