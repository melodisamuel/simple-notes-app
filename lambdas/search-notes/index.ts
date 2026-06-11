import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import {
  getAuthenticatedUserEmail,
  docClient,
  successResponse,
  errorResponse,
  getSearchQueryFromPath,
  normalizeSearchText,
} from './shared-utils';

const TABLE_NAME = process.env.NOTES_TABLE || 'notes';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    // Get authenticated user
    const userEmail = getAuthenticatedUserEmail(event);

    // Get search query from path parameter
    const searchQuery = getSearchQueryFromPath(event);

    if (!searchQuery || searchQuery.length < 2) {
      return errorResponse(400, 'Search query must be at least 2 characters');
    }

    const normalizedQuery = normalizeSearchText(searchQuery);

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

    // Filter notes based on search query (client-side filtering for simplicity)
    // In production, consider using DynamoDB Full-Text Search or Elasticsearch
    const filteredNotes = (result.Items || []).filter((item: any) => {
      const searchText = normalizeSearchText(`${item.Title || ''} ${item.Content || ''}`);
      return searchText.includes(normalizedQuery);
    });

    const notes = filteredNotes.map((item: any) => ({
      noteId: item.NoteId,
      title: item.Title,
      content: item.Content,
      createdAt: item.CreatedAt,
      updatedAt: item.UpdatedAt,
    }));

    return successResponse(200, {
      query: searchQuery,
      notes,
      count: notes.length,
    });
  } catch (error) {
    console.error('Error searching notes:', error);

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return errorResponse(401, error.message);
    }

    if (error instanceof Error && error.message.includes('Missing')) {
      return errorResponse(400, error.message);
    }

    return errorResponse(500, 'Failed to search notes');
  }
};
