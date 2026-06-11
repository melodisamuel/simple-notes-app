import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import {
  getAuthenticatedUserEmail,
  docClient,
  successResponse,
  errorResponse,
  getNoteIdFromPath,
  normalizeSearchText,
} from './shared-utils';

const TABLE_NAME = process.env.NOTES_TABLE || 'notes';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    // Get authenticated user
    const userEmail = getAuthenticatedUserEmail(event);

    // Get note ID from path parameter
    const noteId = getNoteIdFromPath(event);

    // Parse request body
    const body = event.body ? JSON.parse(event.body) : {};
    const { title, content } = body;

    if (!title && !content) {
      return errorResponse(400, 'At least title or content must be provided');
    }

    const now = Date.now();
    const updateExpressionParts: string[] = ['UpdatedAt = :now'];
    const expressionAttributeValues: Record<string, unknown> = { ':now': now };

    if (title) {
      updateExpressionParts.push('Title = :title');
      expressionAttributeValues[':title'] = title;
    }

    if (content) {
      updateExpressionParts.push('Content = :content');
      expressionAttributeValues[':content'] = content;
    }

    if (title || content) {
      updateExpressionParts.push('SearchText = :searchText');
      const searchContent = [title, content].filter(Boolean).join(' ');
      expressionAttributeValues[':searchText'] = normalizeSearchText(searchContent);
    }

    // Update item in DynamoDB
    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userEmail}`,
          SK: `NOTE#${noteId}`,
        },
        UpdateExpression: `SET ${updateExpressionParts.join(', ')}`,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      })
    );

    if (!result.Attributes) {
      return errorResponse(404, 'Note not found');
    }

    return successResponse(200, {
      message: 'Note updated successfully',
      note: {
        noteId: result.Attributes.NoteId,
        title: result.Attributes.Title,
        content: result.Attributes.Content,
        updatedAt: result.Attributes.UpdatedAt,
      },
    });
  } catch (error) {
    console.error('Error updating note:', error);

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return errorResponse(401, error.message);
    }

    return errorResponse(500, 'Failed to update note');
  }
};
