const API_BASE_URL = 'https://elz503evz1.execute-api.us-east-1.amazonaws.com';
const TEST_EMAIL = 'test@user.com';

const getHeaders = () => {
  return {
    'Content-Type': 'application/json',
    'x-authenticated-user-email': TEST_EMAIL,
  };
};

export interface Note {
  noteId: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface CreateNoteInput {
  title: string;
  content: string;
}

export interface UpdateNoteInput {
  title?: string;
  content?: string;
}

export const api = {
  async listNotes(): Promise<{ notes: Note[]; count: number }> {
    const response = await fetch(`${API_BASE_URL}/notes`, {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to list notes: ${response.statusText}`);
    }
    return response.json();
  },

  async getNote(noteId: string): Promise<{ note: Note }> {
    const response = await fetch(`${API_BASE_URL}/notes/${noteId}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to get note: ${response.statusText}`);
    }
    return response.json();
  },

  async createNote(input: CreateNoteInput): Promise<{ message: string; note: { noteId: string; title: string; createdAt: number } }> {
    const response = await fetch(`${API_BASE_URL}/notes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      throw new Error(`Failed to create note: ${response.statusText}`);
    }
    return response.json();
  },

  async updateNote(noteId: string, input: UpdateNoteInput): Promise<{ message: string; note: Partial<Note> }> {
    const response = await fetch(`${API_BASE_URL}/notes/${noteId}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      throw new Error(`Failed to update note: ${response.statusText}`);
    }
    return response.json();
  },

  async deleteNote(noteId: string): Promise<{ message: string; noteId: string }> {
    const response = await fetch(`${API_BASE_URL}/notes/${noteId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to delete note: ${response.statusText}`);
    }
    return response.json();
  },

  async searchNotes(query: string): Promise<{ query: string; notes: Note[]; count: number }> {
    const response = await fetch(`${API_BASE_URL}/notes/search/${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!response.ok) {
      throw new Error(`Failed to search notes: ${response.statusText}`);
    }
    return response.json();
  },
};
