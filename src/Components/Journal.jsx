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
    if(!window.confirm("Delete this note?")) return;
    try {
      await apiClient.delete(`/notes/${id}`);
      setNotes(notes.filter(n => n.id !== id));
    } catch (error) {
      console.error("Failed to delete note", error);
      alert("Failed to delete the note");
    }
  };

  const generateAiSummary = async () => {
    // Check if there are any notes
    if (notes.length === 0) {
      setAiSummary("📝 You haven't written any journal entries yet. Start by clicking the + button to create your first entry!");
      return;
    }

    setLoadingSummary(true);
    setAiSummary(""); // Clear previous summary
    
    try {
      // Use up to 10 most recent notes for analysis
      const recentNotes = notes.slice(0, 10);
      const noteText = recentNotes.map((n, idx) => `Entry ${idx + 1} (${new Date(n.created_at).toLocaleDateString()}):\n${n.content}`).join("\n\n---\n\n");
      
      const res = await apiClient.post('/ai/chat', {
        messages: [{ 
          from_user: true, 
          text: `Analyze my recent journal entries and identify patterns, themes, emotions, and insights. Provide actionable suggestions:\n\n${noteText}` 
        }],
        nodes: [], edges: [], tasks: [], goals: [], notes: [] // Context not needed for this
      });
      
      setAiSummary(res.data.reply);
    } catch (error) {
      console.error("AI Summary failed", error);
      setAiSummary("❌ Failed to generate insights. Please try again.");
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
        {filteredNotes.length === 0 && notes.length === 0 ? (
          <div className="empty-state">
            <p>📝 No journal entries yet</p>
            <p className="empty-hint">Click the + button above to start writing</p>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="empty-state">
            <p>🔍 No matching entries found</p>
            <p className="empty-hint">Try a different search term</p>
          </div>
        ) : (
          filteredNotes.map(note => (
            <div key={note.id} className="note-card">
              <div className="note-date">{new Date(note.created_at).toLocaleDateString()}</div>
              <p className="note-content">{note.content}</p>
              <button onClick={() => deleteNote(note.id)} className="delete-note-btn">
                <AiOutlineDelete />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
