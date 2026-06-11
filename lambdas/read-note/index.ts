import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import {
  getAuthenticatedUserEmail,
  docClient,
  successResponse,
  errorResponse,
  getNoteIdFromPath,
} from './shared-utils';

const TABLE_NAME = process.env.NOTES_TABLE || 'notes';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    // Get authenticated user
    const userEmail = getAuthenticatedUserEmail(event);

    // Get note ID from path parameter
    const noteId = getNoteIdFromPath(event);

    // Get item from DynamoDB
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userEmail}`,
          SK: `NOTE#${noteId}`,
        },
      })
    );

    if (!result.Item) {
      return errorResponse(404, 'Note not found');
    }

    return successResponse(200, {
      note: {
        noteId: result.Item.NoteId,
        title: result.Item.Title,
        content: result.Item.Content,
        createdAt: result.Item.CreatedAt,
        updatedAt: result.Item.UpdatedAt,
      },
    });
  } catch (error) {
    console.error('Error reading note:', error);

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return errorResponse(401, error.message);
    }

    return errorResponse(500, 'Failed to read note');
  }
};
