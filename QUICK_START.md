# 🚀 Notes App - Quick Start Guide

## Welcome to the Notes App Backend!

This is a **production-ready serverless backend** for a secure notes application. Built with **AWS Lambda**, **DynamoDB**, and **Cloudflare Access**.

## ⚡ 60-Second Quick Start

```bash
# 1. Install dependencies
cd "/Users/apple/Documents/projects/Notes App"
npm install && cd lambdas && npm install && cd ..

# 2. Build
npm run build

# 3. Deploy
npx cdk deploy

# 4. Test (save the API endpoint from CDK output!)
API_ENDPOINT="https://xxxxx.execute-api.region.amazonaws.com"

# Create a note
curl -X POST "$API_ENDPOINT/notes" \
  -H "Content-Type: application/json" \
  -H "x-authenticated-user-email: you@example.com" \
  -d '{"title":"Hello","content":"World"}'

# List notes
curl "$API_ENDPOINT/notes" \
  -H "x-authenticated-user-email: you@example.com"
```

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [README.md](README.md) | Project overview and features |
| [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | How to set up and deploy |
| [API_REFERENCE.md](API_REFERENCE.md) | Complete API documentation |
| [DESIGN_DECISIONS.md](DESIGN_DECISIONS.md) | Architecture and trade-offs |
| [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md) | Local development and debugging |

## 🎯 Key Features

✅ **Secure**: Cloudflare Access authentication  
✅ **Scalable**: Serverless auto-scaling  
✅ **Affordable**: Pay-per-request pricing (~$2/month)  
✅ **Fast**: HTTP API with minimal latency  
✅ **Simple**: 6 endpoints for complete CRUD  
✅ **Searchable**: Bonus search feature  

## 📊 Architecture

```
[Client with Cloudflare Access Auth]
           ↓
    [API Gateway HTTP API]
           ↓
    [6 Lambda Functions]
           ↓
    [DynamoDB Table]
```

## 🔌 API Endpoints

```
POST   /notes                      Create a note
GET    /notes                      List all notes
GET    /notes/{noteId}             Get one note
PUT    /notes/{noteId}             Update a note
DELETE /notes/{noteId}             Delete a note
GET    /notes/search/{query}       Search notes ⭐
```

## 💾 Data Model

Each note contains:
- `noteId` - Unique identifier
- `title` - Note title
- `content` - Note body
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp

## 🔐 Authentication

All requests require authentication via one of:
- `x-authenticated-user-email` header (development)
- `cf-access-authenticated-user-email` header (Cloudflare Access)

## 💰 Estimated Costs

| Service | Cost | Notes |
|---------|------|-------|
| DynamoDB | $0/month | Within free tier |
| Lambda | $0/month | Within free tier |
| API Gateway | $0.35 per 1M calls | For 1M calls/month |
| **Total** | **~$0-2/month** | For small app |

Costs scale linearly. See [DESIGN_DECISIONS.md](DESIGN_DECISIONS.md) for cost optimization strategies.

## 🛠️ Tech Stack

- **Frontend**: React/Vue (to be built)
- **API**: AWS HTTP API Gateway
- **Compute**: AWS Lambda (Node.js 20)
- **Database**: AWS DynamoDB (on-demand)
- **Auth**: Cloudflare Access
- **IaC**: AWS CDK (TypeScript)
- **Hosting**: AWS (serverless)

## 📁 Project Structure

```
lambdas/
├── shared-utils.ts       ← Shared code (auth, helpers)
├── create-note/          ← POST /notes
├── read-note/            ← GET /notes/{id}
├── update-note/          ← PUT /notes/{id}
├── delete-note/          ← DELETE /notes/{id}
├── list-notes/           ← GET /notes
└── search-notes/         ← GET /notes/search/{query}

lib/
└── notes app-stack.ts    ← CDK infrastructure

bin/
└── notes_app.ts          ← CDK app entry point
```

## ✨ Bonus Features

🔎 **Full-Text Search** - Search notes by keyword in title or content  
⏱️ **Timestamps** - Track creation and update times  
❌ **Error Handling** - Comprehensive error messages  
📝 **Type Safety** - Built with TypeScript  

## 🚀 Next Steps

### For Deployment
1. Read [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
2. Configure AWS credentials
3. Run `npx cdk deploy`

### For Development
1. Read [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md)
2. Make changes to handlers in `lambdas/`
3. Test with `curl` or Postman

### For API Integration
1. Read [API_REFERENCE.md](API_REFERENCE.md)
2. Integrate with your frontend
3. Celebrate! 🎉

## 🔍 Understanding the Code

### Lambda Handler Pattern

Every Lambda handler follows this pattern:

```typescript
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    // 1. Get authenticated user
    const userEmail = getAuthenticatedUserEmail(event);
    
    // 2. Parse input
    const body = JSON.parse(event.body || '{}');
    
    // 3. Validate
    if (!body.required_field) {
      return errorResponse(400, 'Missing required field');
    }
    
    // 4. Process (DynamoDB, business logic)
    const result = await docClient.send(new PutCommand({...}));
    
    // 5. Return success
    return successResponse(201, result);
  } catch (error) {
    // 6. Handle errors
    return errorResponse(500, 'Something went wrong');
  }
};
```

### Authentication Pattern

Every handler starts with:
```typescript
const userEmail = getAuthenticatedUserEmail(event);
```

This ensures only authenticated users can call the API.

### DynamoDB Pattern

Uses single-table design with:
- **PK (Partition Key)**: `USER#{userId}` - Groups by user
- **SK (Sort Key)**: `NOTE#{noteId}` - Unique per user

This ensures users can only access their own notes.

## 🐛 Troubleshooting

**Q: Where's the API endpoint?**  
A: Check CDK deploy output or run `npx cdk outputs`

**Q: Getting "Unauthorized" error?**  
A: Make sure you're sending the auth header

**Q: Getting "Note not found"?**  
A: Check the noteId is correct and belongs to the same user

**Q: Local build failing?**  
A: Ensure Node.js 18+ is installed: `node --version`

**Q: Deployment failing?**  
A: Check AWS credentials: `aws sts get-caller-identity`

For more troubleshooting, see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md#troubleshooting)

## 📚 Learning Resources

- [AWS Lambda Docs](https://docs.aws.amazon.com/lambda/)
- [AWS CDK Docs](https://docs.aws.amazon.com/cdk/)
- [DynamoDB Guide](https://docs.aws.amazon.com/amazondynamodb/)
- [Cloudflare Access Docs](https://developers.cloudflare.com/cloudflare-one/access/)

## ⚙️ Key Files to Know

- `lib/notes app-stack.ts` - Infrastructure definition
- `lambdas/shared-utils.ts` - Shared utilities
- `lambdas/*/index.ts` - Handler implementations
- `package.json` - Dependencies
- `cdk.json` - CDK configuration

## 🎓 What You Can Learn From This Project

- ✅ How to build serverless APIs with AWS Lambda
- ✅ How to use AWS CDK for Infrastructure as Code
- ✅ How to design DynamoDB tables efficiently
- ✅ How to structure modular Lambda functions
- ✅ How to implement authentication patterns
- ✅ How to write type-safe TypeScript on AWS
- ✅ How to deploy to AWS with zero servers to manage

## 🤝 Contributing

This is your project! Feel free to:
- Add new endpoints
- Improve error handling
- Optimize performance
- Add monitoring
- Implement new features

## 📄 License

MIT - Use freely for learning and development

---

## 🎉 You're Ready!

**Time to deploy:** 5 minutes  
**Learning curve:** Beginner-friendly  
**Cost to run:** ~$2/month  
**Fun factor:** 📈 HIGH

Start with [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) and you'll have an API running in minutes!

Questions? Check the relevant documentation:
- Deploying? → [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- Developing? → [DEVELOPMENT_GUIDE.md](DEVELOPMENT_GUIDE.md)
- Using the API? → [API_REFERENCE.md](API_REFERENCE.md)
- Understanding architecture? → [DESIGN_DECISIONS.md](DESIGN_DECISIONS.md)

**Ready to deploy? Run:**
```bash
npx cdk deploy
```

Good luck! 🚀
