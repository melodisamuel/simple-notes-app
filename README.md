# Notes App - Serverless Backend

A secure, scalable notes application built with **AWS Lambda**, **DynamoDB**, and **Cloudflare Access** for authentication. This project demonstrates a clean, efficient fullstack system using serverless architecture.

## 🎯 Features

- **Secure Authentication**: Cloudflare Access integration for user authentication
- **CRUD Operations**: Create, Read, Update, and Delete notes
- **List Notes**: Retrieve all notes for authenticated user
- **Search Notes**: Filter notes by keyword in title or content (Bonus Feature)
- **Serverless Architecture**: Fully managed AWS services with pay-per-request billing
- **Scalable Database**: DynamoDB with optimized single-table design

## 🏗️ Architecture

### Backend Stack
- **API Gateway**: HTTP API for REST endpoints
- **Lambda Functions**: Modular handlers for each operation
- **DynamoDB**: NoSQL database with single-table design
- **IAM**: Fine-grained access control
- **CloudFormation**: Infrastructure as Code via AWS CDK

### Database Design
- **Table Name**: `notes`
- **Partition Key (PK)**: `USER#{userId}` - Groups notes by user
- **Sort Key (SK)**: `NOTE#{noteId}` - Unique note identifier
- **Global Secondary Index (GSI)**: `SearchIndex` for efficient searching

### Endpoints
```
POST   /notes                    - Create a new note
GET    /notes                    - List all user's notes
GET    /notes/{noteId}           - Read a specific note
PUT    /notes/{noteId}           - Update a note
DELETE /notes/{noteId}           - Delete a note
GET    /notes/search/{query}     - Search notes by keyword
```

## 📋 Prerequisites

- Node.js 20.x or later
- React/Vite development environment
- AWS Account with appropriate permissions
- AWS CLI configured with credentials
- AWS CDK CLI installed globally

```bash
npm install -g aws-cdk
```

## 🚀 Setup & Deployment

### 1. Clone and Install Dependencies

```bash
cd "/Users/apple/Documents/projects/Notes App"
npm install

# Install Lambda dependencies
cd lambdas
npm install
cd ..

# Install Frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Build the Project

```bash
npm run build
cd lambdas && npm run build && cd ..
```

### 3. Deploy with CDK

```bash
# List the stacks
npx cdk list

# Deploy (requires AWS credentials)
npx cdk deploy

# View outputs including API endpoint
npx cdk outputs
```

### 4. Run the Frontend (Local Development)

To run the React/Vite frontend application locally:

```bash
cd frontend
npm run dev
```

The frontend local development server will start (typically at `http://localhost:5173` or `http://127.0.0.1:5173`). 

Ensure you update `frontend/src/services/api.ts` with your deployed CDK API Endpoint URL (e.g. `https://elz503evz1.execute-api.us-east-1.amazonaws.com` without the `/default` suffix).

### 5. Configure Cloudflare Access (Optional for Production)

In production, you'll need to:
1. Set up Cloudflare Access with your identity provider
2. Configure the policy to add the `cf-access-authenticated-user-email` header
3. The header will be automatically passed to Lambda functions

For local testing, you can use the `x-authenticated-user-email` header instead.

## 💡 Design Decisions & Trade-offs

### 1. **Single Table Design**
- **Decision**: One DynamoDB table with composite keys
- **Rationale**: Simplifies access patterns, reduces costs, easier to manage
- **Trade-off**: Requires careful key design but scales better than multiple tables

### 2. **HTTP API vs REST API**
- **Decision**: AWS HTTP API instead of REST API
- **Rationale**: ~40% cheaper, lower latency, faster Cold starts
- **Trade-off**: Fewer features than REST API, but sufficient for CRUD operations

### 3. **Pay-Per-Request Billing**
- **Decision**: DynamoDB on-demand pricing
- **Rationale**: Automatic scaling, no capacity planning needed
- **Trade-off**: Higher per-request cost for high-traffic applications; consider provisioned capacity at scale

### 4. **Client-Side Search Filtering**
- **Decision**: Query all notes and filter on Lambda
- **Rationale**: Simple to implement, works well for small datasets
- **Trade-off**: Less efficient for users with many notes; would recommend ElasticSearch or DynamoDB Full-Text Search for production

### 5. **Cloudflare Access Authentication**
- **Decision**: Trust `cf-access-authenticated-user-email` header
- **Rationale**: Cloudflare Access handles token validation at the edge
- **Trade-off**: Requires Cloudflare Access enterprise; doesn't work with standard API Gateway authentication

### 6. **Timestamp-based Note IDs**
- **Decision**: `{timestamp}-{random}` for uniqueness and chronological ordering
- **Rationale**: Distributed generation without central coordination
- **Trade-off**: Slightly longer IDs than UUIDs, but collision-resistant and sortable

## 🧪 Local Testing

### Using Postman or cURL

```bash
# Create a note (replace {API_ENDPOINT} with actual endpoint)
curl -X POST https://{API_ENDPOINT}/notes \
  -H "Content-Type: application/json" \
  -H "x-authenticated-user-email: user@example.com" \
  -d '{"title": "My Note", "content": "Note content here"}'

# List notes
curl -X GET https://{API_ENDPOINT}/notes \
  -H "x-authenticated-user-email: user@example.com"

# Search notes
curl -X GET https://{API_ENDPOINT}/notes/search/keyword \
  -H "x-authenticated-user-email: user@example.com"

# Read a note
curl -X GET https://{API_ENDPOINT}/notes/{noteId} \
  -H "x-authenticated-user-email: user@example.com"

# Update a note
curl -X PUT https://{API_ENDPOINT}/notes/{noteId} \
  -H "Content-Type: application/json" \
  -H "x-authenticated-user-email: user@example.com" \
  -d '{"title": "Updated Title"}'

# Delete a note
curl -X DELETE https://{API_ENDPOINT}/notes/{noteId} \
  -H "x-authenticated-user-email: user@example.com"
```

## 📦 Project Structure

```
Notes App/
├── bin/                          # CDK entry point
│   └── notes_app.ts
├── lib/                          # CDK stack definitions
│   └── notes app-stack.ts       # Main infrastructure
├── lambdas/                      # Lambda function handlers
│   ├── shared-utils.ts          # Shared utilities & helpers
│   ├── create-note/             # POST /notes
│   ├── read-note/               # GET /notes/{noteId}
│   ├── update-note/             # PUT /notes/{noteId}
│   ├── delete-note/             # DELETE /notes/{noteId}
│   ├── list-notes/              # GET /notes
│   ├── search-notes/            # GET /notes/search/{query}
│   ├── package.json
│   └── tsconfig.json
├── test/                        # CDK unit tests
├── package.json
├── tsconfig.json
├── cdk.json
└── README.md
```

## 🔐 Security Considerations

- **Authentication**: Cloudflare Access ensures only authenticated users can call the API
- **Authorization**: Each Lambda function verifies the user email from the header
- **Data Isolation**: Partition key ensures users can only access their own notes
- **CORS**: Configured to allow requests from any origin (can be restricted in production)
- **Environment Variables**: Sensitive data (table names) are passed via environment variables

## 🎁 Bonus Features Implemented

1. **Search Endpoint**: `/notes/search/{query}` - Filter notes by keyword
2. **Normalized Search**: Case-insensitive search for better UX
3. **Detailed Timestamps**: Track `CreatedAt` and `UpdatedAt` for each note
4. **Error Handling**: Comprehensive error messages with appropriate HTTP status codes

## 📈 Future Improvements

- [ ] Implement full-text search with ElasticSearch
- [ ] Add pagination for list and search endpoints
- [ ] Add tags/categories for notes
- [ ] Add sharing functionality for collaborative notes
- [ ] Implement soft deletes with recovery
- [ ] Add CloudWatch logging and monitoring
- [ ] Implement rate limiting
- [ ] Add note versioning/history
- [ ] Deploy frontend with React/Vue
- [ ] Add CI/CD pipeline with GitHub Actions

## 🧹 Cleanup

To delete all AWS resources:

```bash
npx cdk destroy
```

## 📝 License

MIT License - Feel free to use this for learning and development

---

**Built with ❤️ for serverless applications**

