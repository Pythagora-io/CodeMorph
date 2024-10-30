// services/languageFrameworkService.js

const { sendLLMRequest } = require('./llm');

async function identifyLanguageFrameworks(fileStructure, apiKey) {
  const fileSummaries = fileStructure
    .filter(file => file.fileType === 'blob' && file.summary)
    .map(file => `${file.path}: ${JSON.stringify(file.summary)}`)
    .join('\n');

  const instructions = `
Given the following file structure and summaries of a GitHub repository.

1. Identify the main programming frameworks used in this repository. That will be the source language frameworks.
2. For each identified framework, suggest possible relevant target frameworks - which are easy-to-translate (as for possible translations, if possible and relevant, prioritize node.js, django and flask on backend if applicable, and react, angular and vue.js on frontend if applicable, and shouldn't be in the source language framework already) - for translation that would logically fit and preserve the original flow and business logic.

IMPORTANT: Provide the response as a valid JSON object where keys are the unique source languages/frameworks and values are arrays of possible target languages/frameworks. Only these keys and values in the JSON object and nothing else and no text before or after it.
\n\nFile structure and summaries:
`;

  try {
    const initialResponse = await sendLLMRequest('gpt-4', instructions, fileSummaries, apiKey, temperature=0.1);
console.log(initialResponse);
    // New code to remove redundancy
    const refinementInstructions = `Act as a tech lead and you're skilled and well-versed in all the languages and frameworks. You specialize in identifying target languages/frameworks for source technologies.

Provide the response as a valid JSON object where keys are the unique source languages/frameworks and values are arrays of possible target languages/frameworks. Only these keys and values in the JSON object and nothing else and no text before or after it.
`;
    const content = `Given the following input - source languages/frameworks : target languages/frameworks array - language frameworks identified for a repository, remove logical redundancy in the keys by logically merging similar or alternative names/combinations among the keys of the same source language or framework - considering that the keys are source language frameworks and the values are the possible relevant language frameworks to which the source can be easily translated to. Thus, logically combine the values for redundant keys to create a refined list of possible target languages for each unique source language or framework. Upon merging, limit the maximum number of keys upto 5 or less - prioritize the most used/redundant framework in the keys and discard the rest.
Input:
${JSON.stringify(initialResponse, null, 2)}
`;
    const refinedResponse = await sendLLMRequest('gpt-4', refinementInstructions, content, apiKey, temperature=0);
    return refinedResponse;
  } catch (error) {
    console.error('Error identifying language frameworks:', error.message);
    console.error(error.stack);
    throw new Error('Failed to identify language frameworks');
  }
}

module.exports = {
  identifyLanguageFrameworks
};