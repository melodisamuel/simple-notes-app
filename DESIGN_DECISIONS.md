# Design Decisions & Architecture

## System Overview

The Notes App backend is built using a **serverless architecture** with AWS Lambda, API Gateway, and DynamoDB. This design prioritizes scalability, cost-efficiency, and ease of deployment.

## 1. Architecture Pattern

### Chosen: Serverless (Lambda + API Gateway + DynamoDB)

**Why?**
- Auto-scaling: Handles any number of concurrent users without provisioning
- Cost-efficient: Pay only for what you use (pay-per-request)
- Fast deployment: Deploy infrastructure with a single command
- Reduced operational overhead: No server management

**Alternative Considered: Traditional Backend (Express.js on EC2/ECS)**
- Pro: More control, familiar patterns
- Con: Requires manual scaling, higher baseline costs, more operational work

---

## 2. Authentication Strategy

### Chosen: Cloudflare Access Headers

**How it works:**
1. Cloudflare Access acts as the authentication gate
2. Only authenticated users get past Cloudflare
3. Cloudflare adds `cf-access-authenticated-user-email` header
4. Lambda trusts this header (Cloudflare has already validated the token)

**Why?**
- Zero Trust Security: No exposed API keys
- Edge-level enforcement: Authentication happens before reaching Lambda
- User-friendly: Works with existing Cloudflare deployments
- Scalable: Cloudflare handles millions of auth requests

**Alternative Considered: API Key in Request**
- Pro: Simple to implement
- Con: Requires key rotation, harder to revoke, less secure

**Alternative Considered: JWT in Authorization Header**
- Pro: Stateless, industry standard
- Con: Requires Lambda to validate signatures, adds latency

---

## 3. Database Design

### Chosen: DynamoDB Single-Table Design

**Key Schema:**
```
PK:  USER#{userId}        (Partition Key)
SK:  NOTE#{noteId}        (Sort Key)
```

**Why Single Table?**
- Cost: One table + GSI cheaper than multiple tables
- Performance: Efficient queries for all access patterns
- Scalability: DynamoDB scales per partition key
- Simplicity: Easier to manage permissions and backup

**Access Patterns:**
1. Create note: PutItem with new noteId
2. Read note: GetItem by PK + SK
3. List notes: Query with PK
4. Update note: UpdateItem
5. Delete note: DeleteItem
6. Search: Query with PK + client-side filter

**Alternative Considered: Multi-Table (Notes + Users)**
- Pro: Cleaner separation of concerns
- Con: More complex, higher costs, need joins

---

## 4. API Design

### Chosen: HTTP API (AWS API Gateway v2)

**Endpoints:**
- `POST /notes` - Create
- `GET /notes` - List all
- `GET /notes/{noteId}` - Read one
- `PUT /notes/{noteId}` - Update
- `DELETE /notes/{noteId}` - Delete
- `GET /notes/search/{query}` - Search

**Why HTTP API?**
- 40% cheaper than REST API
- Lower latency
- Supports HTTP/2
- Sufficient for CRUD operations

**Alternative Considered: GraphQL**
- Pro: More flexible queries, better for complex schemas
- Con: Overkill for simple CRUD, slower cold starts

**Alternative Considered: WebSockets**
- Pro: Real-time updates
- Con: More complex, higher costs
- Future: Can be added with API Gateway WebSocket API

---

## 5. Lambda Function Organization

### Chosen: Modular Per-Operation Functions

Each CRUD operation gets its own Lambda function:
- `create-note`
- `read-note`
- `update-note`
- `delete-note`
- `list-notes`
- `search-notes`

**Why?**
- Granular scaling: Each function scales independently
- Easier debugging: One function per operation
- Role-based permissions: Different permissions per operation if needed
- Independent deployment: Update one function without redeploying others

**Alternative Considered: Single Monolithic Function**
- Pro: Simpler to manage, shared code
- Con: All scaled together, all deployed together, harder to debug

**Alternative Considered: Nested Functions (Layer Pattern)**
- Pro: Efficient cold starts
- Con: More complex, less granular control

---

## 6. Search Implementation

### Chosen: Client-Side Filtering (Lambda-based)

**How it works:**
1. Lambda queries all notes for user (small dataset)
2. Filters notes in memory based on search query
3. Returns matching notes

**Why?**
- Simple to implement
- Works with any dataset size (for reasonable user note counts)
- No additional services needed
- Fast for small datasets (<1000 notes)

**Limitations:**
- Not efficient for users with 10,000+ notes
- Case-sensitive (currently normalized to lowercase)

**Alternative Considered: Global Secondary Index (GSI)**
- Pro: More efficient queries
- Con: Limited to prefix search only
- Could be added: `SearchText` GSI for better performance

**Alternative Considered: ElasticSearch**
- Pro: Full-text search, complex queries
- Con: Added cost, operational overhead
- Recommendation: Use this if search becomes a bottleneck

---

## 7. Error Handling

### Strategy: Consistent HTTP Status Codes

```
200 OK              - Successful GET/PUT/DELETE
201 Created         - Successful POST
400 Bad Request     - Invalid input
401 Unauthorized    - Missing/invalid auth header
404 Not Found       - Note doesn't exist
500 Server Error    - Lambda/DynamoDB error
```

**Why?**
- RESTful conventions
- Clear for frontend error handling
- Easy to debug and monitor

---

## 8. Timestamps & Note IDs

### Chosen: Timestamp + Random ID

**Format:** `{Date.now()}-{random}`
- Example: `1696450032000-abc123xyz`

**Why?**
- Globally unique without coordination
- Collision-resistant
- Sortable by creation time
- Smaller than UUIDs

**Alternative Considered: UUID**
- Pro: Industry standard
- Con: Longer, not sortable, random distribution

**Alternative Considered: Incremental ID**
- Pro: Shorter
- Con: Needs central coordination, predictable

---

## 9. Cost Optimization

### DynamoDB: On-Demand Pricing

**Pricing Model:**
- Pay per read/write operation
- Auto-scaling, no capacity planning
- Suitable for unpredictable workloads

**Estimated Costs (Small App):**
- 1,000 reads/month: $0.25
- 1,000 writes/month: $1.25
- Total: ~$2/month

**When to Switch to Provisioned:**
- If your app exceeds 100,000 reads/month
- Need consistent, predictable traffic
- Provisioned becomes cheaper at scale

### Lambda: Included Free Tier

**Free Tier:** 1,000,000 invocations/month
- Most small/medium apps stay under free tier
- After that: $0.0000002 per invocation

### API Gateway: Small Per-Request Fee

**Cost:** $0.35 per million API calls
- 1,000,000 calls/month = $0.35

---

## 10. Scalability Considerations

### Current Bottlenecks & Solutions

**1. Note Count per User** (Search Performance)
- Current: O(n) client-side filtering
- Solution: Implement GSI or ElasticSearch

**2. Real-Time Collaboration**
- Current: None (single-user app)
- Solution: Add WebSocket API + DynamoDB Streams

**3. Large Content (10MB+ notes)**
- Current: Stored in DynamoDB item
- Solution: Store in S3, keep reference in DynamoDB

**4. Complex Permissions** (Shared notes)
- Current: Simple user isolation
- Solution: Add note-to-user mappings, GSI for access

---

## 11. Security Best Practices Implemented

✅ **Authentication via Cloudflare Access**
✅ **User-level data isolation** (PK-based)
✅ **No API keys exposed** (header-based auth)
✅ **CORS configured** (can be restricted)
✅ **Error messages don't leak data** (generic errors)
✅ **DynamoDB encryption at rest** (default)

**Additional Hardening for Production:**
- [ ] Enable VPC for Lambda
- [ ] Restrict API Gateway CORS to known domains
- [ ] Enable CloudTrail for audit logging
- [ ] Add rate limiting with WAF
- [ ] Encrypt DynamoDB with custom KMS keys

---

## 12. Deployment Strategy

### Infrastructure as Code (AWS CDK)

**Why CDK + TypeScript?**
- Type-safe infrastructure
- Version control for infrastructure
- Easy to test and validate
- Compile to CloudFormation

**Deployment Steps:**
1. Developer pushes code to GitHub
2. CI/CD runs `cdk deploy`
3. CloudFormation creates/updates resources
4. Lambda functions deployed

**Future: CI/CD Pipeline**
- Add GitHub Actions for automated deployment
- Add approval gates for production
- Add smoke tests after deployment

---

## Summary Table

| Aspect | Choice | Why | Trade-off |
|--------|--------|-----|-----------|
| **Architecture** | Serverless | Scalable, cost-effective | Less control |
| **API Type** | HTTP API | Cheap, fast | Fewer features |
| **Database** | DynamoDB (On-Demand) | Serverless, auto-scaling | Higher per-op cost |
| **Table Design** | Single Table | Efficient queries | Requires careful design |
| **Auth** | Cloudflare Access | Edge-level security | Requires Cloudflare |
| **Lambda** | Per-Operation | Granular scaling | More functions to manage |
| **Search** | Client-side | Simple | Scales to ~1000 notes |
| **IaC** | AWS CDK + TypeScript | Type-safe, version-controlled | Steeper learning curve |

---

## Next Steps for Production

1. **Add monitoring**: CloudWatch dashboards, alarms
2. **Add logging**: Structured logging to CloudWatch
3. **Add caching**: CloudFront for API responses
4. **Add CI/CD**: GitHub Actions for automated deployment
5. **Add analytics**: Track user activity, performance metrics
6. **Implement backup**: DynamoDB backups, point-in-time recovery
7. **Add API throttling**: Rate limiting per user
8. **Frontend deployment**: React app on CloudFront + S3
