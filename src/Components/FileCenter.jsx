// FileCenter.jsx
import React, { useState, useEffect, useRef } from "react";

import { useDropzone } from 'react-dropzone';
import { AiOutlineCloudUpload, AiOutlineFileText, AiOutlineRobot, AiOutlineClose, AiOutlineDelete, AiOutlineSend } from 'react-icons/ai';
import apiClient from '../api';
import './FileCenter.css';

export default function FileCenter({ isOpen, onClose, onAiGeneratedMap }) {
  const [files, setFiles] = useState([]); // Array of files
  const [input, setInput] = useState("");
  const [chatHistory, setChatHistory] = useState([
    { from: 'ai', text: 'Upload files here and ask me anything about them!' }
  ]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // --- 1. PASTE HANDLER (Global Window) ---
  useEffect(() => {
    const handlePaste = (e) => {
      if (!isOpen) return;
      const items = e.clipboardData.items;
      const newFiles = [];

      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
          newFiles.push(items[i].getAsFile());
        }
      }
      
      if (newFiles.length > 0) {
        setFiles(prev => [...prev, ...newFiles]);
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  // --- 2. DROP HANDLER ---
  const onDrop = (acceptedFiles) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  // --- 3. REMOVE FILE ---
  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  // --- 4. SEND MESSAGE ---
  const handleSend = async () => {
    if (!input.trim() && files.length === 0) return;
    
    const userMsg = { from: 'user', text: input || "Analyze these files." };
    setChatHistory(prev => [...prev, userMsg]);
    setLoading(true);
    setInput("");

    try {
      // Convert ALL files to Base64
      const filePromises = files.map(file => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve({
            data: reader.result.split(',')[1], // Remove prefix
            mime_type: file.type
          });
          reader.onerror = error => reject(error);
        });
      });

      const uploadedFiles = await Promise.all(filePromises);

      const response = await apiClient.post('/ai/chat', {
        messages: [{ from_user: true, text: userMsg.text }], // Simplified history for file context
        nodes: [], edges: [], tasks: [], goals: [], notes: [], // Minimal context
        uploads: uploadedFiles // Send list of files
      });

      const aiMsg = { from: 'ai', text: response.data.reply };
      setChatHistory(prev => [...prev, aiMsg]);

      if (response.data.newMapData) {
        onAiGeneratedMap(response.data.newMapData);
        onClose();
      }

    } catch (error) {
      console.error(error);
      setChatHistory(prev => [...prev, { from: 'ai', text: "Error processing your request." }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="file-center-overlay">
      <div className="file-center-container">
        <div className="file-header">
          <h2>📂 Knowledge Base</h2>
          <button className="close-btn" onClick={onClose}><AiOutlineClose /></button>
        </div>
        
        <div className="file-layout">
          
          {/* LEFT: FILES */}
          <div className="file-sidebar">
            <div className={`drop-zone ${isDragActive ? 'active' : ''}`} {...getRootProps()}>
              <input {...getInputProps()} />
              <AiOutlineCloudUpload className="upload-icon" />
              <p>Drop files or Paste (Ctrl+V)</p>
            </div>

            <div className="file-list">
              {files.map((file, index) => (
                <div key={index} className="file-item">
                  <div className="file-info">
                    <AiOutlineFileText />
                    <span className="file-name">{file.name}</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); removeFile(index); }}>
                    <AiOutlineDelete />
                  </button>
                </div>
              ))}
              {files.length === 0 && <p className="no-files">No files attached</p>}
            </div>
          </div>

          {/* RIGHT: CHAT */}
          <div className="file-chat-section">
            <div className="chat-messages">
              {chatHistory.map((msg, i) => (
                <div key={i} className={`chat-bubble ${msg.from}`}>
                  {msg.text}
                </div>
              ))}
              {loading && <div className="chat-bubble ai">Analysis in progress...</div>}
              <div ref={chatEndRef} />
            </div>

            <div className="chat-input-box">
              <input 
                type="text" 
                placeholder="Ask about the files..." 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                disabled={loading}
              />
              <button onClick={handleSend} disabled={loading}>
                <AiOutlineSend />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}