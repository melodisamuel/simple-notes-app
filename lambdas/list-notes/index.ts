import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import {
  getAuthenticatedUserEmail,
  docClient,
  successResponse,
  errorResponse,
} from './shared-utils';

const TABLE_NAME = process.env.NOTES_TABLE || 'notes';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    // Get authenticated user
    const userEmail = getAuthenticatedUserEmail(event);

    // Query all notes for this user
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `USER#${userEmail}`,
        },
      })
    );

    const notes = (result.Items || []).map((item: any) => ({
      noteId: item.NoteId,
      title: item.Title,
      content: item.Content,
      createdAt: item.CreatedAt,
      updatedAt: item.UpdatedAt,
    }));

    return successResponse(200, {
      notes,
      count: notes.length,
    });
  } catch (error) {
    console.error('Error listing notes:', error);

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return errorResponse(401, error.message);
    }

    return errorResponse(500, 'Failed to list notes');
  }
};
