# Development Guide - Notes App

## Project Structure

```
Notes App/
│
├── bin/
│   └── notes_app.ts              # CDK app entry point
│
├── lib/
│   └── notes app-stack.ts        # Main CDK stack with infrastructure
│
├── lambdas/
│   ├── shared-utils.ts           # Shared utilities (auth, DynamoDB helpers)
│   ├── create-note/
│   │   └── index.ts              # POST /notes handler
│   ├── read-note/
│   │   └── index.ts              # GET /notes/{noteId} handler
│   ├── update-note/
│   │   └── index.ts              # PUT /notes/{noteId} handler
│   ├── delete-note/
│   │   └── index.ts              # DELETE /notes/{noteId} handler
│   ├── list-notes/
│   │   └── index.ts              # GET /notes handler
│   ├── search-notes/
│   │   └── index.ts              # GET /notes/search/{query} handler
│   ├── package.json
│   ├── tsconfig.json
│   └── dist/                     # Compiled JavaScript (after build)
│
├── test/
│   └── notes_app.test.ts         # CDK infrastructure tests
│
├── README.md                      # Main documentation
├── DESIGN_DECISIONS.md           # Architecture & trade-offs
├── DEPLOYMENT_GUIDE.md           # Setup & deployment instructions
├── API_REFERENCE.md              # API endpoint documentation
├── DEVELOPMENT_GUIDE.md          # This file
│
├── package.json                  # Main project dependencies
├── tsconfig.json                 # TypeScript configuration
├── jest.config.js                # Jest test configuration
├── cdk.json                      # CDK configuration
├── build.sh                      # Build script
└── .gitignore                    # Git ignore rules
```

## Development Workflow

### 1. Initial Setup

```bash
# Navigate to project directory
cd "/Users/apple/Documents/projects/Notes App"

# Install dependencies
npm install
cd lambdas && npm install && cd ..
```

### 2. Development Commands

```bash
# Build TypeScript to JavaScript
npm run build

# Watch for changes and rebuild
npm run watch

# Run tests
npm run test
```

### 3. Making Changes

#### Adding a New Endpoint

**Step 1: Create Lambda Handler**

Create a new file: `lambdas/new-operation/index.ts`

```typescript
import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { 
  getAuthenticatedUserEmail,
  successResponse,
  errorResponse,
  docClient 
} from '../shared-utils';

const TABLE_NAME = process.env.NOTES_TABLE || 'notes';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const userEmail = getAuthenticatedUserEmail(event);
    
    // Your logic here
    
    return successResponse(200, { message: 'Success' });
  } catch (error) {
    console.error('Error:', error);
    
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return errorResponse(401, error.message);
    }
    
    return errorResponse(500, 'Failed to process request');
  }
};
```

**Step 2: Add Lambda Function to CDK Stack**

Edit: `lib/notes app-stack.ts`

```typescript
const newOperationLambda = new lambda.Function(this, 'NewOperationFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset(path.join(__dirname, '../lambdas/new-operation')),
  role: lambdaRole,
  environment,
  timeout: cdk.Duration.seconds(30),
});
```

**Step 3: Add API Gateway Route**

```typescript
httpApi.addRoutes({
  path: '/new-endpoint',
  methods: [apigateway.HttpMethod.POST],
  integration: new apigatewayIntegrations.HttpLambdaIntegration(
    'NewOperationIntegration',
    newOperationLambda
  ),
});
```

**Step 4: Rebuild and Deploy**

```bash
npm run build
npx cdk deploy
```

#### Modifying Existing Handler

1. Edit the handler file: `lambdas/{operation}/index.ts`
2. Rebuild: `cd lambdas && npm run build && cd ..`
3. Redeploy: `npx cdk deploy`

#### Adding Shared Utilities

Edit: `lambdas/shared-utils.ts`

```typescript
export function myNewHelper(data: any) {
  // Implementation
  return data;
}
```

Import in handlers:
```typescript
import { myNewHelper } from '../shared-utils';
```

### 4. Local Testing

#### Option 1: Using AWS SAM (Local Testing)

```bash
# Install AWS SAM CLI
brew install aws-sam-cli

# Generate template
npx cdk synth --output sam-template

# Run locally
sam local start-api
```

#### Option 2: Manual Testing with cURL

```bash
# Start API Gateway (requires deployment first)
# Use the endpoint from CDK deploy output

API_ENDPOINT="https://xxxxx.execute-api.region.amazonaws.com"

# Test create note
curl -X POST "$API_ENDPOINT/notes" \
  -H "Content-Type: application/json" \
  -H "x-authenticated-user-email: dev@example.com" \
  -d '{
    "title": "Test Note",
    "content": "Testing locally"
  }'
```

#### Option 3: Using Postman

1. Import the API reference as a collection
2. Set variables: `{{api_endpoint}}`, `{{user_email}}`
3. Test each endpoint

### 5. Debugging

#### View Lambda Logs

```bash
# Stream logs in real-time
aws logs tail /aws/lambda/notes-app-NotesAppStack-CreateNoteFunction --follow

# View specific time range
aws logs filter-log-events \
  --log-group-name /aws/lambda/notes-app-NotesAppStack-CreateNoteFunction \
  --start-time $(date -d '1 hour ago' +%s)000
```

#### Add Logging to Lambda

```typescript
export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  console.log('Headers:', event.headers);
  console.log('Body:', event.body);
  
  // Rest of handler
};
```

#### Check DynamoDB Items

```bash
# Scan table (get all items)
aws dynamodb scan --table-name notes

# Query for specific user
aws dynamodb query \
  --table-name notes \
  --key-condition-expression "PK = :pk" \
  --expression-attribute-values '{":pk": {"S": "USER#dev@example.com"}}'

# Get specific note
aws dynamodb get-item \
  --table-name notes \
  --key '{"PK": {"S": "USER#dev@example.com"}, "SK": {"S": "NOTE#123456-abc"}}'
```

### 6. Testing Patterns

#### Test Creating a Note

```bash
# Create
curl -X POST https://api/notes \
  -H "Content-Type: application/json" \
  -H "x-authenticated-user-email: user@example.com" \
  -d '{"title": "Test", "content": "Test content"}'

# List to verify
curl https://api/notes \
  -H "x-authenticated-user-email: user@example.com"

# Search to verify
curl https://api/notes/search/Test \
  -H "x-authenticated-user-email: user@example.com"
```

#### Test Error Handling

```bash
# Missing auth header
curl https://api/notes

# Empty title
curl -X POST https://api/notes \
  -H "Content-Type: application/json" \
  -H "x-authenticated-user-email: user@example.com" \
  -d '{"content": "No title"}'

# Note not found
curl https://api/notes/invalid-id \
  -H "x-authenticated-user-email: user@example.com"
```

### 7. Performance Testing

#### Using Apache Bench

```bash
# Load test - 1000 requests, 10 concurrent
ab -n 1000 -c 10 \
  -H "x-authenticated-user-email: user@example.com" \
  https://api/notes
```

#### Using Artillery.io

```bash
# Install
npm install -g artillery

# Create artillery.yml
cat > artillery.yml << EOF
config:
  target: "https://api.example.com"
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Note Operations"
    flow:
      - get:
          url: "/notes"
          headers:
            x-authenticated-user-email: user@example.com
EOF

# Run test
artillery run artillery.yml
```

### 8. Security Testing

#### Check Lambda Permissions

```bash
# View Lambda IAM role
aws iam get-role --role-name notes-app-NotesLambdaRole

# View inline policies
aws iam list-role-policies --role-name notes-app-NotesLambdaRole

# View attached policies
aws iam list-attached-role-policies --role-name notes-app-NotesLambdaRole
```

#### Check API Gateway CORS

```bash
# Make OPTIONS request
curl -X OPTIONS https://api/notes \
  -H "Origin: http://localhost:3000" \
  -v
```

### 9. Monitoring in Production

#### Create CloudWatch Dashboard

```bash
# View available metrics
aws cloudwatch list-metrics --namespace AWS/Lambda

# Create alarm for errors
aws cloudwatch put-metric-alarm \
  --alarm-name LambdaErrors \
  --alarm-description "Alert when Lambda has errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold
```

#### Enable X-Ray Tracing

```bash
# Add to CDK stack
createNoteLambda.addEnvironment('_X_AMZN_TRACE_ID', '1');

// Rebuild and deploy
```

### 10. Cost Optimization

#### Estimate Costs

```bash
# Using AWS Pricing Calculator
# DynamoDB: https://calculator.aws/
# Lambda: https://calculator.aws/
# API Gateway: https://calculator.aws/
```

#### Optimize Lambda Performance

```typescript
// Reuse clients outside handler
const client = new DynamoDBClient({});

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  // Client reused across invocations
  // Reduces cold start time
};
```

### 11. CI/CD Integration

#### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to AWS

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '20'
      
      - run: npm install
      - run: npm run build
      - run: npx cdk deploy --require-approval never
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

### 12. Common Issues & Solutions

**Issue: "Cannot find module '@aws-sdk/client-dynamodb'"**
```bash
Solution: npm install in both root and lambdas directories
```

**Issue: Lambda timeout errors**
```bash
Solution: 
1. Check DynamoDB query performance
2. Increase Lambda timeout in CDK stack
3. Add more concurrent Lambda instances
```

**Issue: Cold start latency**
```bash
Solution:
1. Use Lambda provisioned concurrency
2. Keep Lambda warm with EventBridge
3. Optimize package size
```

**Issue: DynamoDB throttling**
```bash
Solution:
1. Already on-demand, should auto-scale
2. Check for hot partitions
3. Consider GSI for better distribution
```

## Best Practices

✅ **Always test locally before deploying**
✅ **Add comprehensive error handling**
✅ **Log important operations**
✅ **Use environment variables for configuration**
✅ **Keep Lambda functions small and focused**
✅ **Use shared utilities to avoid code duplication**
✅ **Monitor costs regularly**
✅ **Run security audits**
✅ **Keep dependencies up to date**
✅ **Use TypeScript for type safety**

## Resources

- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [AWS CDK Best Practices](https://docs.aws.amazon.com/cdk/latest/guide/best-practices.html)
- [DynamoDB Design Patterns](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [API Gateway Limits](https://docs.aws.amazon.com/apigateway/latest/developerguide/limits.html)
