import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEventV2 } from 'aws-lambda';

const dynamoClient = new DynamoDBClient({});
export const docClient = DynamoDBDocumentClient.from(dynamoClient);

/**
 * Extract and validate Cloudflare Access authenticated user email
 * Cloudflare Access passes the user email in the cf-access-authenticated-user-email header
 */
export function getAuthenticatedUserEmail(event: APIGatewayProxyEventV2): string {
  const headers = event.headers || {};
  const email = headers['cf-access-authenticated-user-email'] || 
                headers['CF-Access-Authenticated-User-Email'] ||
                headers['x-authenticated-user-email']; // Fallback for local testing

  if (!email) {
    throw new Error('Unauthorized: Missing authentication header');
  }

  return email as string;
}

/**
 * Generate a unique note ID
 */
export function generateNoteId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create partition and sort keys
 */
export function createKeys(userId: string, noteId?: string) {
  return {
    PK: `USER#${userId}`,
    SK: noteId ? `NOTE#${noteId}` : `NOTE#${generateNoteId()}`,
  };
}

/**
 * Success response builder
 */
export function successResponse(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(body),
  };
}

/**
 * Error response builder
 */
export function errorResponse(statusCode: number, message: string) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({ error: message }),
  };
}

/**
 * Extract note ID from path parameter
 */
export function getNoteIdFromPath(event: APIGatewayProxyEventV2): string {
  const noteId = event.pathParameters?.noteId;
  if (!noteId) {
    throw new Error('Missing noteId path parameter');
  }
  return noteId;
}

/**
 * Extract search query from path parameter
 */
export function getSearchQueryFromPath(event: APIGatewayProxyEventV2): string {
  const query = event.pathParameters?.query;
  if (!query) {
    throw new Error('Missing query path parameter');
  }
  return decodeURIComponent(query);
}

/**
 * Normalize text for searching (lowercase, trim, etc.)
 */
export function normalizeSearchText(text: string): string {
  return text.toLowerCase().trim();
}
