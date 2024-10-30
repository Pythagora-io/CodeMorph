const axios = require('axios');
const OpenAI = require('openai');
const dotenv = require('dotenv');
const { decrypt } = require('../utils/encryption');

dotenv.config();

const MAX_RETRIES = 12;
const RETRY_DELAY = 1000;
const MAX_TOKENS = 4000; // Adjust this based on your OpenAI plan

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendRequestToOpenAI(model, messages, apiKey, temperature) {
  const openai = new OpenAI({ apiKey });
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const requestOptions = {
        model: model,
        messages: messages,
        max_tokens: MAX_TOKENS,
      };

      if (temperature !== undefined) {
        requestOptions.temperature = temperature;
      }

      const response = await openai.chat.completions.create(requestOptions);
      return response.choices[0].message.content;
    } catch (error) {
      console.error(`Error sending request to OpenAI (attempt ${i + 1}):`, error.message);
      if (i === MAX_RETRIES - 1) throw error;
      await sleep(RETRY_DELAY);
    }
  }
}

async function sendLLMRequest(model, instructions, content, apiKey, temperature, expectsCode = false) {
  const chunks = chunkContent(content);
  let combinedResponse = {};

  for (const chunk of chunks) {
    const messages = [
      { role: 'system', content: instructions },
      { role: 'user', content: chunk }
    ];

    let response;
    for (let i = 0; i < MAX_RETRIES; i++) {
      try {
        response = await sendRequestToOpenAI(model, messages, apiKey, temperature);
        if (expectsCode) {
          const codeMatch = response.match(/```(?:\w+)?\n([\s\S]*?)\n```/);
          response = codeMatch ? codeMatch[1] : response;
        } else {
          response = extractJsonFromResponse(response);
        }
        break;
      } catch (error) {
        console.error(`Error parsing response (attempt ${i + 1}):`, error.message);
        if (i === MAX_RETRIES - 1) {
          console.log(`Messages:\n${messages}\n`);
          console.log(`Response:\n${response}\n`);
          throw error;
        }
      }
    }

    if (expectsCode) {
      return response; // Return the code directly
    } else {
      combinedResponse = { ...combinedResponse, ...response };
    }
  }

  return combinedResponse;
}

function chunkContent(content, maxChunkSize = 2700) {
  const words = content.split(/\s+/);
  const chunks = [];
  let currentChunk = [];

  for (const word of words) {
    if (currentChunk.length >= maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
      currentChunk = [];
    }
    currentChunk.push(word);
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '));
  }

  return chunks;
}

function extractJsonFromResponse(response) {
  const jsonMatch = response.match(/```json.*?[\s\S]*({[\s\S]*})\n```/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[1]);
  } else {
    const jsonString = response.match(/({[\s\S]*})/);
    return JSON.parse(jsonString ? jsonString[1] : response);
  }
}

async function generateFileSummary(fileName, fileContent, encryptedOpenaiApiKey) {
  const instructions = `Analyze the following file named "${fileName}" and provide a summary that includes:
1. A short one-sentence brief about the file's purpose
2. Any dependencies used in the file (if any)
3. The original flow of the file
4. How this file contributes to the app as a whole, both technically and logically

Provide the response as a JSON object with keys: brief, dependencies, flow, and contribution. Only these keys with valid values. JSON object returned must be a valid json in correct structure - only as the keys mentioned - and no text before or after it.
\n\nFile Content (or the chunk of file content):
`;

  try {
    const decryptedApiKey = decrypt(encryptedOpenaiApiKey);
    const summary = await sendLLMRequest('gpt-4', instructions, fileContent, decryptedApiKey, undefined);
    return summary;
  } catch (error) {
    console.error(`Error generating summary for ${fileName}:`, error.message);
    return { error: 'Unable to generate summary' };
  }
}

async function translateCode(code, sourceLanguage, targetLanguage, apiKey) {
  const instructions = `Translate the following ${sourceLanguage} code to ${targetLanguage}. Provide the response as a JSON object with a single key 'translatedCode' containing the translated code.`;

  try {
    const translatedCode = await sendLLMRequest('gpt-4', instructions, code, apiKey);
    return translatedCode.translatedCode;
  } catch (error) {
    console.error(`Error translating code:`, error.message);
    throw new Error(`Failed to translate code: ${error.message}`);
  }
}

async function writeCode(filePath, summary, targetLanguage, apiKey, morphedStructure) {
  const instructions = `Act as a senior full stack developer and you're skilled and well-versed in all programming languages and frameworks. Provide only the code in your response, without any additional text before or after. Fill all the placeholder-comments with actual code, don't leave any placeholders-comments in your response.

Consider the following morphed structure for context:
${JSON.stringify(morphedStructure, null, 2)}
`
  const content = `Write code for a file - File Path '${filePath}' - in ${targetLanguage} based on the following summary and morphed structure:
${JSON.stringify(summary)}
`;

  try {
    const response = await sendLLMRequest('gpt-4', instructions, content, apiKey, 0.3, true); // Set expectsCode to true
    return response;
  } catch (error) {
    console.error(`Error writing code for ${filePath}:`, error.message);
    throw new Error(`Failed to write code: ${error.message}`);
  }
}

module.exports = {
  sendLLMRequest,
  generateFileSummary,
  translateCode,
  writeCode
};