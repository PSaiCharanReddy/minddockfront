import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { AiOutlineCloudUpload, AiOutlineFileText, AiOutlineClose, AiOutlineDelete, AiOutlineFile, AiOutlineAlignLeft, AiOutlineSearch } from 'react-icons/ai';
import apiClient from '../api';
import './FileCenter.css';

export default function FileCenter({ isOpen, onClose }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [context, setContext] = useState('');

  // Text Snippet State
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' or 'text'
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [textContext, setTextContext] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch files on mount
  useEffect(() => {
    if (isOpen) {
      fetchFiles();
    }
  }, [isOpen]);

  const fetchFiles = async () => {
    try {
      const res = await apiClient.get('/files/');
      setFiles(res.data);
    } catch (err) {
      console.error("Failed to fetch files", err);
    }
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    setUploading(true);
    for (const file of acceptedFiles) {
      const formData = new FormData();
      formData.append('file', file);
      if (context) formData.append('context', context);

      try {
        await apiClient.post('/files/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } catch (err) {
        console.error("Upload failed", err);
      }
    }
    setUploading(false);
    setContext('');
    fetchFiles();
  }, [context]);

  const handleTextSubmit = async () => {
    if (!textContent.trim()) return;
    setUploading(true);
    try {
      await apiClient.post('/files/text', {
        title: textTitle,
        content: textContent,
        context: textContext
      });
      setTextTitle('');
      setTextContent('');
      setTextContext('');
      fetchFiles();
      setActiveTab('upload'); // Switch back to list/upload view
    } catch (err) {
      console.error("Text upload failed", err);
    }
    setUploading(false);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this item?")) return;
    try {
      await apiClient.delete(`/files/${id}`);
      setFiles(files.filter(f => f.id !== id));
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const filteredFiles = files.filter(f =>
    f.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (f.context && f.context.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!isOpen) return null;

  return (
    <div className="file-center-overlay">
      <div className="file-center-container">
        <div className="file-header">
          <div className="header-title">
            <h2>Knowledge Base</h2>
            <span className="badge">{files.length} items</span>
          </div>
          <button className="close-btn" onClick={onClose}><AiOutlineClose /></button>
        </div>

        <div className="file-layout">
          {/* LEFT: SIDEBAR (Upload/Input) */}
          <div className="file-sidebar">

            {/* TABS */}
            <div className="tabs-container">
              <button
                className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
                onClick={() => setActiveTab('upload')}
              >
                Upload Files
              </button>
              <button
                className={`tab-btn ${activeTab === 'text' ? 'active' : ''}`}
                onClick={() => setActiveTab('text')}
              >
                Add Text / Note
              </button>
            </div>

            <div className="input-area">
              {activeTab === 'upload' ? (
                <div className="upload-section">
                  <input
                    type="text"
                    className="modern-input"
                    placeholder="Optional context (e.g. 'Project Specs')"
                    value={context}
                    onChange={e => setContext(e.target.value)}
                  />
                  <div className={`drop-zone ${isDragActive ? 'active' : ''}`} {...getRootProps()}>
                    <input {...getInputProps()} />
                    <div className="drop-content">
                      <AiOutlineCloudUpload className="upload-icon" />
                      <p>{uploading ? "Uploading..." : "Drop files here or click to upload"}</p>
                      <span className="sub-text">Supports PDF, Images, Docs</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-section">
                  <input
                    type="text"
                    className="modern-input"
                    placeholder="Title (Optional)"
                    value={textTitle}
                    onChange={e => setTextTitle(e.target.value)}
                  />
                  <textarea
                    className="modern-textarea"
                    placeholder="Paste text, code snippets, or notes here..."
                    value={textContent}
                    onChange={e => setTextContent(e.target.value)}
                  />
                  <input
                    type="text"
                    className="modern-input"
                    placeholder="Context (e.g. 'React Component')"
                    value={textContext}
                    onChange={e => setTextContext(e.target.value)}
                  />
                  <button
                    className="primary-btn"
                    onClick={handleTextSubmit}
                    disabled={uploading || !textContent.trim()}
                  >
                    {uploading ? "Saving..." : "Save to Knowledge Base"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: CONTENT LIST */}
          <div className="file-content-area">
            <div className="search-bar-container">
              <AiOutlineSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search your knowledge base..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="file-grid">
              {filteredFiles.map(file => (
                <div key={file.id} className="file-card">
                  <div className="file-card-icon">
                    {file.file_type === 'text/snippet' ? <AiOutlineAlignLeft className="icon-snippet" /> : <AiOutlineFileText className="icon-file" />}
                  </div>
                  <div className="file-card-info">
                    <div className="file-name" title={file.filename}>{file.filename}</div>
                    <div className="file-meta">
                      {new Date(file.created_at).toLocaleDateString()} • {file.file_type === 'text/snippet' ? 'Snippet' : 'File'}
                    </div>
                    {file.context && <div className="file-tag">{file.context}</div>}
                  </div>
                  <button className="delete-btn" onClick={(e) => handleDelete(file.id, e)}>
                    <AiOutlineDelete />
                  </button>
                </div>
              ))}
              {files.length === 0 && (
                <div className="empty-state">
                  <AiOutlineCloudUpload size={48} />
                  <p>Your knowledge base is empty.</p>
                  <span>Upload files or add text to get started.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}