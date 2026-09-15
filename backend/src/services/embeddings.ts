import { OpenAIEmbeddings } from '@langchain/openai';
import { loadSettings } from './settings';

/**
 * Generates an embedding for the given text using the configured API key.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const settings = loadSettings();
    const embeddingsModel = new OpenAIEmbeddings({
      openAIApiKey: settings.openaiApiKey || undefined,
      modelName: 'text-embedding-3-small',
    });
    const embedding = await embeddingsModel.embedQuery(text);
    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}
