# API Reference - Notes App

## Base URL
```
https://{API_ENDPOINT}
```

Replace `{API_ENDPOINT}` with the URL from CDK deployment outputs.

## Authentication

All endpoints require the `x-authenticated-user-email` header (for local testing) or `cf-access-authenticated-user-email` header (production with Cloudflare Access).

Example:
```
x-authenticated-user-email: user@example.com
```

## Endpoints

### 1. Create Note

**Request:**
```
POST /notes
Content-Type: application/json

{
  "title": "My Note Title",
  "content": "The note content goes here"
}
```

**Response (201 Created):**
```json
{
  "message": "Note created successfully",
  "note": {
    "noteId": "1696450032000-abc123xyz",
    "title": "My Note Title",
    "createdAt": 1696450032000
  }
}
```

**Error (400 Bad Request):**
```json
{
  "error": "Title and content are required"
}
```

---

### 2. List All Notes

**Request:**
```
GET /notes
```

**Response (200 OK):**
```json
{
  "notes": [
    {
      "noteId": "1696450032000-abc123xyz",
      "title": "My Note Title",
      "content": "The note content",
      "createdAt": 1696450032000,
      "updatedAt": 1696450032000
    },
    {
      "noteId": "1696450033000-def456uvw",
      "title": "Another Note",
      "content": "More content",
      "createdAt": 1696450033000,
      "updatedAt": 1696450033000
    }
  ],
  "count": 2
}
```

---

### 3. Get Single Note

**Request:**
```
GET /notes/{noteId}
```

**Example:**
```
GET /notes/1696450032000-abc123xyz
```

**Response (200 OK):**
```json
{
  "note": {
    "noteId": "1696450032000-abc123xyz",
    "title": "My Note Title",
    "content": "The note content",
    "createdAt": 1696450032000,
    "updatedAt": 1696450032000
  }
}
```

**Error (404 Not Found):**
```json
{
  "error": "Note not found"
}
```

---

### 4. Update Note

**Request:**
```
PUT /notes/{noteId}
Content-Type: application/json

{
  "title": "Updated Title",
  "content": "Updated content"
}
```

**Note:** At least one of `title` or `content` is required. You can update just the title or just the content.

**Response (200 OK):**
```json
{
  "message": "Note updated successfully",
  "note": {
    "noteId": "1696450032000-abc123xyz",
    "title": "Updated Title",
    "content": "Updated content",
    "updatedAt": 1696450045000
  }
}
```

**Error (404 Not Found):**
```json
{
  "error": "Note not found"
}
```

---

### 5. Delete Note

**Request:**
```
DELETE /notes/{noteId}
```

**Response (200 OK):**
```json
{
  "message": "Note deleted successfully",
  "noteId": "1696450032000-abc123xyz"
}
```

**Error (404 Not Found):**
```json
{
  "error": "Note not found"
}
```

---

### 6. Search Notes (Bonus Feature)

**Request:**
```
GET /notes/search/{query}
```

**Example:**
```
GET /notes/search/important
```

**Response (200 OK):**
```json
{
  "query": "important",
  "notes": [
    {
      "noteId": "1696450032000-abc123xyz",
      "title": "Important Meeting",
      "content": "Details about the important meeting",
      "createdAt": 1696450032000,
      "updatedAt": 1696450032000
    }
  ],
  "count": 1
}
```

**Note:** Search is case-insensitive and searches both title and content.

**Error (400 Bad Request):**
```json
{
  "error": "Search query must be at least 2 characters"
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "Human-readable error message"
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success (GET, PUT, DELETE) |
| 201 | Created (POST) |
| 400 | Bad Request (invalid input) |
| 401 | Unauthorized (missing/invalid auth header) |
| 404 | Not Found (note doesn't exist) |
| 500 | Server Error (Lambda/DynamoDB error) |

---

## Rate Limiting

Currently there is no rate limiting. In production, consider adding:
- Per-user rate limits (e.g., 100 requests/minute)
- DDoS protection with CloudFlare WAF
- API Gateway throttling

---

## Example Requests

### Create a Note (cURL)

```bash
curl -X POST https://api.example.com/notes \
  -H "Content-Type: application/json" \
  -H "x-authenticated-user-email: user@example.com" \
  -d '{
    "title": "My First Note",
    "content": "This is my first note"
  }'
```

### Create a Note (JavaScript/Fetch)

```javascript
const response = await fetch('https://api.example.com/notes', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-authenticated-user-email': 'user@example.com'
  },
  body: JSON.stringify({
    title: 'My First Note',
    content: 'This is my first note'
  })
});

const data = await response.json();
console.log(data);
```

### List All Notes (JavaScript/Fetch)

```javascript
const response = await fetch('https://api.example.com/notes', {
  headers: {
    'x-authenticated-user-email': 'user@example.com'
  }
});

const data = await response.json();
console.log(data.notes);
```

### Search Notes (JavaScript/Fetch)

```javascript
const query = 'important';
const response = await fetch(`https://api.example.com/notes/search/${encodeURIComponent(query)}`, {
  headers: {
    'x-authenticated-user-email': 'user@example.com'
  }
});

const data = await response.json();
console.log(data.notes);
```

---

## Data Model

### Note Object

```json
{
  "noteId": "1696450032000-abc123xyz",
  "title": "Note Title",
  "content": "Note content",
  "createdAt": 1696450032000,
  "updatedAt": 1696450032000
}
```

**Fields:**
- `noteId` (string): Unique identifier for the note
- `title` (string): Title of the note (max 255 characters)
- `content` (string): Body content of the note
- `createdAt` (number): Unix timestamp of creation
- `updatedAt` (number): Unix timestamp of last update

---

## DynamoDB Table Structure

**Table Name:** `notes`

**Primary Keys:**
- **PK (Partition Key):** `USER#{userId}`
- **SK (Sort Key):** `NOTE#{noteId}`

**Attributes:**
- `Title` (String): Note title
- `Content` (String): Note content
- `SearchText` (String): Normalized text for search (lowercase)
- `CreatedAt` (Number): Creation timestamp
- `UpdatedAt` (Number): Last update timestamp
- `NoteId` (String): Note ID (for quick access)

**Global Secondary Index:**
- **Index Name:** `SearchIndex`
- **PK:** `PK` (User)
- **SK:** `SearchText` (For search queries)

---

## Pagination (Future Feature)

Currently not implemented, but can be added with:
- Limit parameter
- LastEvaluatedKey for DynamoDB scanning

Example (future):
```
GET /notes?limit=10&lastKey=...
```

---

## Webhooks (Future Feature)

Could be added to notify external services when notes change:
- Note created
- Note updated
- Note deleted

---

## WebSocket Support (Future Feature)

Real-time updates could be added with API Gateway WebSocket API for:
- Live note updates
- Collaborative editing
- Presence awareness
