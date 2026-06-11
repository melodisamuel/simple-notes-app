import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { DeleteCommand } from '@aws-sdk/lib-dynamodb';
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

    // Delete item from DynamoDB
    await docClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userEmail}`,
          SK: `NOTE#${noteId}`,
        },
      })
    );

    return successResponse(200, {
      message: 'Note deleted successfully',
      noteId,
    });
  } catch (error) {
    console.error('Error deleting note:', error);

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return errorResponse(401, error.message);
    }

    return errorResponse(500, 'Failed to delete note');
  }
};
