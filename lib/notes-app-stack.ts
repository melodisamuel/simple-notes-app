import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigatewayIntegrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';

export class NotesAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Table for Notes
    // Partition Key: USER#{userId} | Sort Key: NOTE#{noteId}
    const notesTable = new dynamodb.Table(this, 'NotesTable', {
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'SK',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // Serverless billing
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For demo purposes
      tableName: 'notes',
    });

    // GSI for searching notes by title/content
    notesTable.addGlobalSecondaryIndex({
      indexName: 'SearchIndex',
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'SearchText',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // IAM Role for Lambda functions
    const lambdaRole = new iam.Role(this, 'NotesLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    // Grant DynamoDB permissions to Lambda
    notesTable.grantReadWriteData(lambdaRole);

    // Environment variables for Lambda
    const environment = {
      NOTES_TABLE: notesTable.tableName,
      NOTES_TABLE_INDEX: 'SearchIndex',
    };

    // Create Lambda functions
    const createNoteLambda = new lambda.Function(this, 'CreateNoteFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambdas/create-note')),
      role: lambdaRole,
      environment,
      timeout: cdk.Duration.seconds(30),
    });

    const readNoteLambda = new lambda.Function(this, 'ReadNoteFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambdas/read-note')),
      role: lambdaRole,
      environment,
      timeout: cdk.Duration.seconds(30),
    });

    const updateNoteLambda = new lambda.Function(this, 'UpdateNoteFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambdas/update-note')),
      role: lambdaRole,
      environment,
      timeout: cdk.Duration.seconds(30),
    });

    const deleteNoteLambda = new lambda.Function(this, 'DeleteNoteFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambdas/delete-note')),
      role: lambdaRole,
      environment,
      timeout: cdk.Duration.seconds(30),
    });

    const listNotesLambda = new lambda.Function(this, 'ListNotesFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambdas/list-notes')),
      role: lambdaRole,
      environment,
      timeout: cdk.Duration.seconds(30),
    });

    const searchNotesLambda = new lambda.Function(this, 'SearchNotesFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambdas/search-notes')),
      role: lambdaRole,
      environment,
      timeout: cdk.Duration.seconds(30),
    });

    // HTTP API Gateway
    const httpApi = new apigateway.HttpApi(this, 'NotesApi', {
      description: 'Notes App API',
      corsPreflight: {
        allowMethods: [
          apigateway.CorsHttpMethod.GET,
          apigateway.CorsHttpMethod.POST,
          apigateway.CorsHttpMethod.PUT,
          apigateway.CorsHttpMethod.DELETE,
          apigateway.CorsHttpMethod.OPTIONS,
        ],
        allowOrigins: ['*'],
        allowHeaders: ['*'],
      },
    });

    // POST /notes - Create a note
    httpApi.addRoutes({
      path: '/notes',
      methods: [apigateway.HttpMethod.POST],
      integration: new apigatewayIntegrations.HttpLambdaIntegration(
        'CreateNoteIntegration',
        createNoteLambda
      ),
    });

    // GET /notes/{noteId} - Read a single note
    httpApi.addRoutes({
      path: '/notes/{noteId}',
      methods: [apigateway.HttpMethod.GET],
      integration: new apigatewayIntegrations.HttpLambdaIntegration(
        'ReadNoteIntegration',
        readNoteLambda
      ),
    });

    // PUT /notes/{noteId} - Update a note
    httpApi.addRoutes({
      path: '/notes/{noteId}',
      methods: [apigateway.HttpMethod.PUT],
      integration: new apigatewayIntegrations.HttpLambdaIntegration(
        'UpdateNoteIntegration',
        updateNoteLambda
      ),
    });

    // DELETE /notes/{noteId} - Delete a note
    httpApi.addRoutes({
      path: '/notes/{noteId}',
      methods: [apigateway.HttpMethod.DELETE],
      integration: new apigatewayIntegrations.HttpLambdaIntegration(
        'DeleteNoteIntegration',
        deleteNoteLambda
      ),
    });

    // GET /notes - List all notes for user
    httpApi.addRoutes({
      path: '/notes',
      methods: [apigateway.HttpMethod.GET],
      integration: new apigatewayIntegrations.HttpLambdaIntegration(
        'ListNotesIntegration',
        listNotesLambda
      ),
    });

    // GET /notes/search/{query} - Search notes
    httpApi.addRoutes({
      path: '/notes/search/{query}',
      methods: [apigateway.HttpMethod.GET],
      integration: new apigatewayIntegrations.HttpLambdaIntegration(
        'SearchNotesIntegration',
        searchNotesLambda
      ),
    });

    // Output the API endpoint
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: httpApi.url || 'API endpoint not available',
      description: 'Notes App API Endpoint',
    });
  }
}
