import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import {
  getAuthenticatedUserEmail,
  docClient,
  successResponse,
  errorResponse,
  createKeys,
  normalizeSearchText,
} from './shared-utils';

const TABLE_NAME = process.env.NOTES_TABLE || 'notes';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    // Get authenticated user
    const userEmail = getAuthenticatedUserEmail(event);

    // Parse request body
    const body = event.body ? JSON.parse(event.body) : {};
    const { title, content } = body;

    if (!title || !content) {
      return errorResponse(400, 'Title and content are required');
    }

    // Create note item
    const { PK, SK } = createKeys(userEmail);
    const noteId = SK.replace('NOTE#', '');
    const now = Date.now();

    const noteItem = {
      PK,
      SK,
      NoteId: noteId,
      Title: title,
      Content: content,
      SearchText: normalizeSearchText(`${title} ${content}`),
      CreatedAt: now,
      UpdatedAt: now,
    };

    // Put item in DynamoDB
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: noteItem,
      })
    );

    return successResponse(201, {
      message: 'Note created successfully',
      note: {
        noteId,
        title,
        createdAt: now,
      },
    });
  } catch (error) {
    console.error('Error creating note:', error);

    // Return the actual error message instead of a generic string
    return errorResponse(500, error instanceof Error ? error.message : 'Unknown error');
  }
};
