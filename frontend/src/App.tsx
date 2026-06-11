import { useState, useEffect } from 'react';
import { api, Note } from './services/api';

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Load notes on mount
  useEffect(() => {
    fetchNotes();
  }, []);

  // Fetch all notes
  const fetchNotes = async () => {
    setLoading(true);
    try {
      const data = await api.listNotes();
      setNotes(data.notes || []);
    } catch (err: any) {
      console.error(err);
      showMsg(err.message || 'Failed to load notes', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Helper to show messages
  const showMsg = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  // Handle Search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      fetchNotes();
      return;
    }
    if (searchQuery.trim().length < 2) {
      showMsg('Search query must be at least 2 characters', 'error');
      return;
    }
    setLoading(true);
    try {
      const data = await api.searchNotes(searchQuery);
      setNotes(data.notes || []);
      showMsg(`Found ${data.notes.length} note(s)`, 'success');
    } catch (err: any) {
      console.error(err);
      showMsg(err.message || 'Search failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle Create or Update Note
  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      showMsg('Title and content are required', 'error');
      return;
    }

    setLoading(true);
    try {
      if (editingNote) {
        // Update existing note
        await api.updateNote(editingNote.noteId, { title, content });
        showMsg('Note updated successfully', 'success');
      } else {
        // Create new note
        await api.createNote({ title, content });
        showMsg('Note created successfully', 'success');
      }
      // Reset form and reload
      handleCancelEdit();
      fetchNotes();
    } catch (err: any) {
      console.error(err);
      showMsg(err.message || 'Failed to save note', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle Delete Note
  const handleDeleteNote = async (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening in editor when clicking delete
    if (!window.confirm('Are you sure you want to delete this note?')) return;

    setLoading(true);
    try {
      await api.deleteNote(noteId);
      showMsg('Note deleted successfully', 'success');
      if (editingNote?.noteId === noteId) {
        handleCancelEdit();
      }
      fetchNotes();
    } catch (err: any) {
      console.error(err);
      showMsg(err.message || 'Failed to delete note', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Select a note for editing
  const handleSelectNote = (note: Note) => {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content);
  };

  // Clear editing state
  const handleCancelEdit = () => {
    setEditingNote(null);
    setTitle('');
    setContent('');
  };

  return (
    <div className="container">
      <header>
        <h1>📝 Simple Notes App</h1>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '5px' }}>
          <input
            type="text"
            className="search-box"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit" className="btn btn-secondary">Search</button>
          {searchQuery && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSearchQuery('');
                fetchNotes();
              }}
            >
              Clear
            </button>
          )}
        </form>
      </header>

      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Editor Panel */}
      <form onSubmit={handleSaveNote} className="editor-form">
        <h2>{editingNote ? 'Edit Note' : 'Create New Note'}</h2>
        <div className="form-group">
          <label>Title</label>
          <input
            type="text"
            placeholder="Enter note title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={loading}
          />
        </div>
        <div className="form-group">
          <label>Content</label>
          <textarea
            placeholder="Enter note content..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={loading}
          ></textarea>
        </div>
        <div className="actions">
          <button type="submit" className="btn" disabled={loading}>
            {editingNote ? 'Update Note' : 'Create Note'}
          </button>
          {editingNote && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCancelEdit}
              disabled={loading}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Notes List */}
      <div>
        <h2>Notes ({notes.length})</h2>
        {loading && <p>Loading...</p>}
        {!loading && notes.length === 0 && (
          <p style={{ textAlign: 'center', color: '#666', marginTop: '20px' }}>
            No notes found. Create your first note above!
          </p>
        )}
        <div className="notes-list">
          {notes.map((note) => (
            <div
              key={note.noteId}
              className="note-card"
              onClick={() => handleSelectNote(note)}
            >
              <h3>{note.title}</h3>
              <p>{note.content.substring(0, 150)}{note.content.length > 150 ? '...' : ''}</p>
              <div className="meta">
                <span>
                  Updated: {new Date(note.updatedAt).toLocaleString()}
                </span>
                <button
                  className="btn btn-danger"
                  style={{ padding: '4px 8px', fontSize: '12px' }}
                  onClick={(e) => handleDeleteNote(note.noteId, e)}
                  disabled={loading}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
