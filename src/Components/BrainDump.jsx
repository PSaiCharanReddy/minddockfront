import { useState, useEffect, useRef } from 'react';
import { AiOutlineAudio, AiOutlineSend, AiOutlineCheck, AiOutlineDelete, AiOutlineThunderbolt, AiOutlineClockCircle, AiOutlineSchedule, AiOutlineTeam } from 'react-icons/ai';
import apiClient from '../api';
import './BrainDump.css';

export default function BrainDump({ onRefresh }) {
    const [nodes, setNodes] = useState([]);
    const [inputValue, setInputValue] = useState("");
    const [isListening, setIsListening] = useState(false);
    const [sortingMode, setSortingMode] = useState(false);
    const [currentNodeIndex, setCurrentNodeIndex] = useState(0);
    const [matrix, setMatrix] = useState({
        do_now: [],   // Imp & Urg
        schedule: [], // Imp & Not Urg
        delegate: [], // Not Imp & Urg
        delete: []    // Not Imp & Not Urg
    });

    // Voice Recognition Ref
    const recognitionRef = useRef(null);
    const synthRef = useRef(window.speechSynthesis);

    // Voice State
    const [voices, setVoices] = useState([]);
    const [selectedVoice, setSelectedVoice] = useState(null);
    const [showVoiceSettings, setShowVoiceSettings] = useState(false);

    useEffect(() => {
        // Initialize Speech Recognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.lang = 'en-US';
            recognition.interimResults = false;

            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                if (sortingMode) {
                    handleSortingVoiceInput(transcript);
                } else {
                    setInputValue(prev => prev + (prev ? " " : "") + transcript);
                }
                setIsListening(false);
            };

            recognition.onerror = (event) => {
                console.error("Speech error", event);
                setIsListening(false);
            };

            recognition.onend = () => {
                setIsListening(false);
            };

            recognitionRef.current = recognition;
        }
    }, [sortingMode, currentNodeIndex]);

    useEffect(() => {
        const loadVoices = () => {
            const available = window.speechSynthesis.getVoices();
            setVoices(available);

            // Try to auto-select a good one if not set
            if (!selectedVoice) {
                const preferred = available.find(v => v.name.includes("Google US English")) ||
                    available.find(v => v.name.includes("Google")) ||
                    available.find(v => v.name.includes("Samantha")) ||
                    available.find(v => v.lang === 'en-US');
                if (preferred) setSelectedVoice(preferred);
            }
        };

        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }, [selectedVoice]);



    const startListening = () => {
        if (recognitionRef.current) {
            // Stop any existing session first to avoid errors
            try {
                recognitionRef.current.abort();
            } catch (e) {
                // Ignore abort errors
            }

            // Small delay to ensure clean state
            setTimeout(() => {
                try {
                    recognitionRef.current.start();
                    setIsListening(true);
                } catch (e) {
                    console.error("Failed to start recognition:", e);
                    // If start fails, try one more time after a longer delay
                    setTimeout(() => {
                        try {
                            recognitionRef.current.start();
                            setIsListening(true);
                        } catch (retryE) {
                            console.error("Retry failed:", retryE);
                        }
                    }, 500);
                }
            }, 100);
        }
    };

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            startListening();
        }
    };

    const addNode = () => {
        if (!inputValue.trim()) return;
        setNodes([...nodes, { id: Date.now(), text: inputValue, status: 'pending' }]);
        setInputValue("");
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            addNode();
        }
    };

    // --- SORTING LOGIC ---
    const [chatHistory, setChatHistory] = useState([]);

    const startSorting = () => {
        if (nodes.length === 0) return;
        setSortingMode(true);
        setCurrentNodeIndex(0);
        setChatHistory([]); // Reset history for new session

        // Initial Prompt
        const firstNode = nodes[0];
        const initialPrompt = `I need to sort this task: "${firstNode.text}". Help me decide if it's important and urgent.`;

        // Call AI to start
        handleAIChat(initialPrompt, true);
    };

    const speak = (text, onEnd) => {
        if (synthRef.current) {
            synthRef.current.cancel();
            if (isListening) {
                recognitionRef.current?.stop();
                setIsListening(false);
            }

            const utterance = new SpeechSynthesisUtterance(text);

            // IMPROVED VOICE SELECTION
            const voices = synthRef.current.getVoices();
            // Try to find a "Google" voice or a "Natural" voice
            const preferredVoice = voices.find(v => v.name.includes("Google US English")) ||
                voices.find(v => v.name.includes("Google")) ||
                voices.find(v => v.name.includes("Natural")) ||
                voices.find(v => v.lang === 'en-US');

            if (preferredVoice) {
                utterance.voice = preferredVoice;
                // Adjust pitch/rate for more natural feel
                utterance.pitch = 1.0;
                utterance.rate = 1.05;
            }

            utterance.onend = () => {
                if (onEnd) onEnd();
            };
            synthRef.current.speak(utterance);
        }
    };

    const handleAIChat = async (userText, isSystemInit = false) => {
        try {
            // If it's a system init, we don't add user text to history yet, just send it
            // If it's user voice, we add it

            const currentHistory = [...chatHistory];
            if (!isSystemInit) {
                currentHistory.push({ role: "user", content: userText });
                setChatHistory(currentHistory);
            }

            const res = await apiClient.post('/ai/eisenhower-chat', {
                task_text: userText,
                conversation_history: currentHistory
            });

            const { reply, decision } = res.data;

            // Add AI reply to history
            setChatHistory(prev => [...prev, { role: "assistant", content: reply }]);

            // Speak AI reply
            speak(reply, () => {
                // If decision is made, execute it
                if (decision) {
                    categorizeNode(nodes[currentNodeIndex], decision);
                } else {
                    // If no decision, keep listening for user answer
                    startListening();
                }
            });

        } catch (error) {
            console.error("AI Chat Error", error);
            speak("Sorry, I lost connection. Let's try that again.", () => startListening());
        }
    };

    const handleSortingVoiceInput = (text) => {
        // Send user voice directly to AI
        handleAIChat(text);
    };

    const categorizeNode = (node, category) => {
        setMatrix(prev => ({
            ...prev,
            [category]: [...prev[category], node]
        }));

        // Move to next
        const nextIndex = currentNodeIndex + 1;
        if (nextIndex < nodes.length) {
            setCurrentNodeIndex(nextIndex);
            setChatHistory([]); // Clear history for next node

            // Trigger AI for next node
            const nextNode = nodes[nextIndex];
            const nextPrompt = `Okay, next task: "${nextNode.text}". Help me sort it.`;
            handleAIChat(nextPrompt, true);

        } else {
            setSortingMode(false);
            speak("All done! You've sorted everything. Great job!");
            setNodes([]); // Clear pending list
        }
    };

    // Manual Categorization Handlers (for buttons)
    const manualCategorize = (category) => {
        categorizeNode(nodes[currentNodeIndex], category);
    };

    // --- FINAL CREATION ---
    const createTasks = async () => {
        try {
            // Do Now -> Priority High, Due Today
            for (const node of matrix.do_now) {
                await apiClient.post('/tasks/', {
                    title: node.text,
                    description: "From Brain Dump (Do Now)",
                    priority: "High",
                    due_date: new Date().toISOString()
                });
            }
            // Schedule -> Priority Medium, Due Tomorrow
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            for (const node of matrix.schedule) {
                await apiClient.post('/tasks/', {
                    title: node.text,
                    description: "From Brain Dump (Schedule)",
                    priority: "Medium",
                    due_date: tomorrow.toISOString()
                });
            }
            // Delegate -> Priority Low
            for (const node of matrix.delegate) {
                await apiClient.post('/tasks/', {
                    title: node.text,
                    description: "From Brain Dump (Delegate)",
                    priority: "Low"
                });
            }

            alert("Tasks created successfully!");
            setMatrix({ do_now: [], schedule: [], delegate: [], delete: [] });
            if (onRefresh) onRefresh();
        } catch (e) {
            console.error("Failed to create tasks", e);
            alert("Error creating tasks.");
        }
    };

    return (
        <div className="braindump-container">
            <div className="braindump-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2>🧠 Brain Dump & Sort</h2>
                        <p>Unload your mind, then let AI help you prioritize.</p>
                    </div>
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setShowVoiceSettings(!showVoiceSettings)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '20px' }}
                            title="Voice Settings"
                        >
                            ⚙️
                        </button>
                        {showVoiceSettings && (
                            <div className="voice-dropdown" style={{
                                position: 'absolute', top: '100%', right: 0,
                                background: 'var(--bg-panel)', border: '1px solid var(--border-color)',
                                padding: '10px', borderRadius: '8px', zIndex: 100, width: '250px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                            }}>
                                <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--text-muted)' }}>SELECT VOICE</h4>
                                <select
                                    value={selectedVoice?.name || ""}
                                    onChange={(e) => {
                                        const v = voices.find(voice => voice.name === e.target.value);
                                        setSelectedVoice(v);
                                        setShowVoiceSettings(false);
                                    }}
                                    style={{ width: '100%', padding: '5px', borderRadius: '4px', background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}
                                >
                                    {voices.map(v => (
                                        <option key={v.name} value={v.name}>
                                            {v.name.replace("Google", "").replace("English", "").trim()} ({v.lang})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="braindump-layout">
                {/* LEFT: CAPTURE & LIST */}
                <div className="capture-section">
                    <div className="input-row">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="What's on your mind?"
                            className="roam-input"
                        />
                        <button
                            className={`mic-btn ${isListening ? 'active' : ''}`}
                            onClick={toggleListening}
                            title="Voice Input (Click to Speak)"
                        >
                            <AiOutlineAudio />
                        </button>
                        <button
                            className="add-btn"
                            onClick={addNode}
                            title="Add Thought"
                        >
                            <AiOutlineSend />
                        </button>
                    </div>

                    <div className="roam-list">
                        {nodes.map((node, idx) => (
                            <div key={node.id} className={`roam-node ${sortingMode && idx === currentNodeIndex ? 'focused' : ''}`}>
                                <span className="bullet">•</span>
                                <span className="node-text">{node.text}</span>
                            </div>
                        ))}
                        {nodes.length === 0 && <div className="empty-hint">Start typing or speaking to add thoughts...</div>}
                    </div>

                    {nodes.length > 0 && !sortingMode && (
                        <button className="start-sort-btn" onClick={startSorting}>
                            <AiOutlineThunderbolt /> Start AI Sorting
                        </button>
                    )}

                    {sortingMode && (
                        <div className="sorting-controls">
                            <h4>Sorting: "{nodes[currentNodeIndex]?.text}"</h4>
                            <p>Is it Important? Is it Urgent?</p>
                            <div className="manual-buttons">
                                <button onClick={() => manualCategorize('do_now')}>Do Now (Imp/Urg)</button>
                                <button onClick={() => manualCategorize('schedule')}>Schedule (Imp/Not)</button>
                                <button onClick={() => manualCategorize('delegate')}>Delegate (Not/Urg)</button>
                                <button onClick={() => manualCategorize('delete')}>Delete (Not/Not)</button>
                            </div>
                            <button className="stop-sort-btn" onClick={() => setSortingMode(false)}>Stop</button>
                        </div>
                    )}
                </div>

                {/* RIGHT: EISENHOWER MATRIX */}
                <div className="matrix-section">
                    <div className="quadrant q1">
                        <div className="q-header">
                            <AiOutlineThunderbolt /> Do Now <span>(Important & Urgent)</span>
                        </div>
                        <div className="q-list">
                            {matrix.do_now.map(n => <div key={n.id} className="q-item">{n.text}</div>)}
                        </div>
                    </div>
                    <div className="quadrant q2">
                        <div className="q-header">
                            <AiOutlineSchedule /> Schedule <span>(Important & Not Urgent)</span>
                        </div>
                        <div className="q-list">
                            {matrix.schedule.map(n => <div key={n.id} className="q-item">{n.text}</div>)}
                        </div>
                    </div>
                    <div className="quadrant q3">
                        <div className="q-header">
                            <AiOutlineTeam /> Delegate <span>(Not Important & Urgent)</span>
                        </div>
                        <div className="q-list">
                            {matrix.delegate.map(n => <div key={n.id} className="q-item">{n.text}</div>)}
                        </div>
                    </div>
                    <div className="quadrant q4">
                        <div className="q-header">
                            <AiOutlineDelete /> Delete <span>(Not Important & Not Urgent)</span>
                        </div>
                        <div className="q-list">
                            {matrix.delete.map(n => <div key={n.id} className="q-item">{n.text}</div>)}
                        </div>
                    </div>
                </div>
            </div>

            {(matrix.do_now.length > 0 || matrix.schedule.length > 0 || matrix.delegate.length > 0) && (
                <div className="action-bar">
                    <button className="create-tasks-btn" onClick={createTasks}>
                        <AiOutlineCheck /> Create Tasks from Matrix
                    </button>
                </div>
            )}
        </div>
    );
}
