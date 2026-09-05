import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { IReel } from '../models/Reel';
import dotenv from 'dotenv';

dotenv.config();

const llm = new ChatGoogleGenerativeAI({
  modelName: 'gemini-1.5-flash',
  apiKey: process.env.GOOGLE_API_KEY,
  temperature: 0,
});

const prompt = PromptTemplate.fromTemplate(`
You are a helpful assistant. Use ONLY the provided context to answer the user request.
Return ONLY the relevant Instagram Reel URLs along with a 1-sentence explanation of why it matches.

Context:
{context}

User Prompt: {user_prompt}
`);

const outputParser = new StringOutputParser();

export async function generateChatResponse(userPrompt: string, retrievedReels: IReel[]): Promise<string> {
  // Format context
  const contextText = retrievedReels.map(reel => {
    return `URL: ${reel.reelUrl}\nCaption: ${reel.caption}\nTags: ${reel.tags.join(', ')}`;
  }).join('\n\n');

  const chain = prompt.pipe(llm).pipe(outputParser);

  const response = await chain.invoke({
    context: contextText,
    user_prompt: userPrompt
  });

  return response;
}
