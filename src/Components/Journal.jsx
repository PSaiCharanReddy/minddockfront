import { useState, useEffect } from 'react';
import { AiOutlinePlus, AiOutlineDelete, AiOutlineRobot, AiOutlineSearch } from 'react-icons/ai';
import apiClient from '../api';
import './Journal.css';

export default function Journal({ isOpen, toggleJournal }) {
  const [notes, setNotes] = useState([]);
  const [content, setContent] = useState("");
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const [loadingSummary, setLoadingSummary] = useState(false);

  useEffect(() => {
    if (isOpen) fetchNotes();
  }, [isOpen]);

  const fetchNotes = async () => {
    try {
      const res = await apiClient.get('/notes/');
      // Sort by newest first
      const sorted = res.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setNotes(sorted);
    } catch (error) {
      console.error("Failed to load notes", error);
    }
  };

  const createNote = async () => {
    if (!content.trim()) return;
    try {
      const res = await apiClient.post('/notes/', { content });
      setNotes([res.data, ...notes]);
      setContent("");
      setIsCreating(false);
    } catch (error) {
      console.error("Failed to save note", error);
    }
  };

  const deleteNote = async (id) => {
    // Notes don't have a delete endpoint in our MVP router yet, 
    // but we can hide it from UI or add the endpoint later.
    // For now, let's assume we just filter it out locally to simulate.
    if(!window.confirm("Delete this note?")) return;
    setNotes(notes.filter(n => n.id !== id));
    // In a real app: await apiClient.delete(`/notes/${id}`);
  };

  const generateAiSummary = async () => {
    setLoadingSummary(true);
    try {
      // We use the chat endpoint to summarize
      const noteText = notes.slice(0, 5).map(n => n.content).join("\n---\n");
      const res = await apiClient.post('/ai/chat', {
        messages: [{ from_user: true, text: `Summarize my recent journal entries:\n${noteText}` }],
        nodes: [], edges: [], tasks: [], goals: [] // Context not needed for this
      });
      setAiSummary(res.data.reply);
    } catch (error) {
      console.error("AI Summary failed", error);
    } finally {
      setLoadingSummary(false);
    }
  };

  // Filter notes by search
  const filteredNotes = notes.filter(n => n.content.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className={`journal-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="journal-header">
        <h3>📖 My Journal</h3>
        <button onClick={toggleJournal} className="close-btn">×</button>
      </div>

      {/* AI Summary Section */}
      <div className="journal-ai-section">
        <button onClick={generateAiSummary} className="ai-summary-btn" disabled={loadingSummary}>
          <AiOutlineRobot /> {loadingSummary ? "Analyzing..." : "Analyze Patterns"}
        </button>
        {aiSummary && <div className="ai-summary-box">{aiSummary}</div>}
      </div>

      {/* Search & Add */}
      <div className="journal-controls">
        <div className="search-bar">
          <AiOutlineSearch />
          <input 
            type="text" 
            placeholder="Search notes..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="new-note-btn" onClick={() => setIsCreating(true)}>
          <AiOutlinePlus />
        </button>
      </div>

      {/* Creation Area */}
      {isCreating && (
        <div className="create-note-area">
          <textarea 
            placeholder="What's on your mind?" 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            autoFocus
          />
          <div className="create-actions">
            <button onClick={() => setIsCreating(false)}>Cancel</button>
            <button onClick={createNote} className="save-btn">Save</button>
          </div>
        </div>
      )}

      {/* Note List */}
      <div className="notes-list">
        {filteredNotes.map(note => (
          <div key={note.id} className="note-card">
            <div className="note-date">{new Date(note.created_at).toLocaleDateString()}</div>
            <p className="note-content">{note.content}</p>
            <button onClick={() => deleteNote(note.id)} className="delete-note-btn">
              <AiOutlineDelete />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}