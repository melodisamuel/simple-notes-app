# Deployment Guide - Notes App Backend

## Prerequisites

1. **AWS Account**: Active AWS account with appropriate permissions
2. **AWS CLI**: Configured with credentials
   ```bash
   aws configure
   ```
3. **Node.js**: Version 18+ installed
4. **AWS CDK**: Install globally
   ```bash
   npm install -g aws-cdk
   ```

## Setup Steps

### 1. Install Project Dependencies

```bash
cd /Users/apple/Documents/projects/Notes\ App

# Install main project dependencies
npm install

# Install Lambda function dependencies
cd lambdas
npm install
cd ..
```

### 2. Build the Project

```bash
# Build CDK stack (TypeScript → JavaScript)
npm run build

# Build Lambda functions
cd lambdas
npm run build
cd ..
```

### 3. Verify AWS Credentials

```bash
aws sts get-caller-identity
```

You should see your AWS account ID, user ARN, and account number.

### 4. Synthesize CloudFormation Template (Optional)

To preview what will be deployed:

```bash
npx cdk synth
```

This generates a CloudFormation template that you can review before deployment.

### 5. Deploy with CDK

```bash
# Deploy to AWS
npx cdk deploy

# Confirm deployment when prompted (type 'y' and press Enter)
```

CDK will:
- Create the DynamoDB table
- Create Lambda functions
- Create API Gateway HTTP API
- Output the API endpoint URL

### 6. Save the API Endpoint

The deployment output will show something like:

```
✨ Synthesis time: 12.34s

Stack notes-app/NotesAppStack
  Resources
  [+] AWS::DynamoDB::Table | NotesTable
  [+] AWS::IAM::Role | NotesLambdaRole
  [+] AWS::Lambda::Function | CreateNoteFunction
  [+] AWS::Lambda::Function | ReadNoteFunction
  [+] AWS::Lambda::Function | UpdateNoteFunction
  [+] AWS::Lambda::Function | DeleteNoteFunction
  [+] AWS::Lambda::Function | ListNotesFunction
  [+] AWS::Lambda::Function | SearchNotesFunction
  [+] AWS::ApiGatewayV2::Api | NotesApi
  [+] AWS::ApiGatewayV2::Stage | NotesApi/default-stage
  
Outputs:
NotesAppStack.ApiEndpoint = https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/
```

**Save the API endpoint URL** - you'll need it for testing.

## Testing the API

### Using cURL

```bash
# Set your API endpoint
API_ENDPOINT="https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com"
USER_EMAIL="test@example.com"

# Create a note
curl -X POST "$API_ENDPOINT/notes" \
  -H "Content-Type: application/json" \
  -H "x-authenticated-user-email: $USER_EMAIL" \
  -d '{
    "title": "My First Note",
    "content": "This is a test note"
  }'

# List notes
curl -X GET "$API_ENDPOINT/notes" \
  -H "x-authenticated-user-email: $USER_EMAIL"

# Search notes
curl -X GET "$API_ENDPOINT/notes/search/test" \
  -H "x-authenticated-user-email: $USER_EMAIL"
```

### Using Postman

1. Open Postman
2. Create a new request
3. Set method to POST
4. Set URL to `https://{API_ENDPOINT}/notes`
5. Add headers:
   - `Content-Type: application/json`
   - `x-authenticated-user-email: test@example.com`
6. Add body (JSON):
   ```json
   {
     "title": "My Note",
     "content": "Note content"
   }
   ```
7. Send request

## Cloudflare Access Integration (Production)

For production with Cloudflare Access:

1. **Set up Cloudflare Access** on your domain
2. **Create an Access Policy** to protect your API
3. **Configure the policy** to add the `cf-access-authenticated-user-email` header
4. **Update Lambda** to use `cf-access-authenticated-user-email` instead of `x-authenticated-user-email`

The key change in shared-utils.ts:
```typescript
export function getAuthenticatedUserEmail(event: APIGatewayProxyEventV2): string {
  const headers = event.headers || {};
  const email = headers['cf-access-authenticated-user-email']; // Production
  
  if (!email) {
    throw new Error('Unauthorized: Missing authentication header');
  }

  return email as string;
}
```

## Monitoring & Debugging

### View Lambda Logs

```bash
# View logs for a specific Lambda function
aws logs tail /aws/lambda/notes-app-NotesAppStack-CreateNoteFunction --follow

# View all Lambda logs
aws logs tail /aws/lambda --follow
```

### View DynamoDB Table

```bash
# List items in the table
aws dynamodb scan --table-name notes

# Query items for a specific user
aws dynamodb query \
  --table-name notes \
  --key-condition-expression "PK = :pk" \
  --expression-attribute-values '{":pk": {"S": "USER#test@example.com"}}'
```

### View API Metrics

```bash
# Get API Gateway metrics
aws apigatewayv2 get-apis

# View invocation metrics in CloudWatch
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name Count \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Sum
```

## Costs

### Estimated Monthly Costs (For Small App)

- **DynamoDB**: $0 - $2 (on-demand, under free tier)
- **Lambda**: $0 - $1 (under free tier: 1M invocations)
- **API Gateway**: ~$0.35 per 1M API calls
- **Data Transfer**: $0 (within AWS, or $0.09/GB egress)

**Total**: $0-3/month for typical usage

## Troubleshooting

### Issue: "Unauthorized" Error

**Cause**: Missing authentication header
**Solution**: Add `x-authenticated-user-email` header to all requests

### Issue: "Note not found"

**Cause**: Note doesn't exist or belongs to different user
**Solution**: 
- Verify the noteId is correct
- Make sure you're using the same user email

### Issue: Lambda timeout

**Cause**: DynamoDB query or update taking too long
**Solution**: 
- Check DynamoDB capacity (though on-demand should handle most cases)
- Review Lambda CloudWatch logs

### Issue: Permission denied when deploying

**Cause**: AWS credentials don't have required permissions
**Solution**:
```bash
aws sts get-caller-identity  # Verify credentials
aws iam get-user  # Check if user has permissions
```

## Cleanup

To delete all AWS resources and avoid charges:

```bash
# List what will be deleted
npx cdk destroy

# Confirm deletion when prompted
```

This will delete:
- DynamoDB table
- Lambda functions
- API Gateway
- IAM roles
- CloudWatch logs

## Next Steps

1. **Deploy frontend**: React/Vue app to CloudFront
2. **Add monitoring**: CloudWatch alarms and dashboards
3. **Setup CI/CD**: GitHub Actions for automated deployment
4. **Add authentication UI**: Login flow with Cloudflare Access
5. **Scale infrastructure**: As traffic grows, consider:
   - CloudFront caching
   - ElasticSearch for better search
   - Lambda layers for shared code

## Support Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [AWS DynamoDB Documentation](https://docs.aws.amazon.com/dynamodb/)
- [Cloudflare Access Documentation](https://developers.cloudflare.com/cloudflare-one/access/)
