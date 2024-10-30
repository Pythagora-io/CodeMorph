// services/morphService.js

const { sendLLMRequest, writeCode } = require('./llm');

async function identifyRelevantFiles(repoStructure, sourceLanguage, targetLanguage, apiKey) {
  const instructions = `
Given the following file structure, source language (${sourceLanguage}), and target language (${targetLanguage}),
identify which files are relevant for morphing. Return a JSON object where keys are file paths and values are
boolean (true if relevant, false if not).
`;

  const fileStructureContent = repoStructure.map(file => `${file.path}: ${file.summary?.brief || 'No summary'}`).join('\n');

  try {
    const response = await sendLLMRequest('gpt-4', instructions, fileStructureContent, apiKey);
    return response; // Removed JSON.parse() here
  } catch (error) {
    console.error('Error identifying relevant files:', error);
    throw error;
  }
}

async function createMorphedFileStructure(repoStructure, relevantFiles, sourceLanguage, targetLanguage, apiKey) {
  console.log('Original repoStructure:', JSON.stringify(repoStructure, null, 2));
  console.log('Relevant files:', JSON.stringify(relevantFiles, null, 2));

  const relevantFileStructure = repoStructure.filter(file => relevantFiles[file.path]);
  console.log('Filtered relevantFileStructure:', JSON.stringify(relevantFileStructure, null, 2));

  const instructions = `
Given the following file structure for files relevant to morphing from ${sourceLanguage} to ${targetLanguage},
create a morphed file structure. For each file, provide a summary including 'brief', 'original_flow_covered' (in the natural language),
'dependencies', and set 'action' to 'morph' without any reference to the original file structure. Preserve the original flow and business logic for a seamless experience.
Return the result as a JSON object where keys are file paths and values are the summary objects.
`;

  const relevantFileContent = relevantFileStructure.map(file => `
${file.path}:
  Dependencies: ${file.summary?.dependencies || 'None'}
  Flow: ${file.summary?.flow || 'Not specified'}
  Contribution: ${file.summary?.contribution || 'Not specified'}
`).join('\n');

  try {
    const morphedStructure = await sendLLMRequest('gpt-4', instructions, relevantFileContent, apiKey);
    console.log('Morphed structure:', JSON.stringify(morphedStructure, null, 2));
    return morphedStructure; // Removed JSON.parse() here
  } catch (error) {
    console.error('Error creating morphed file structure:', error);
    throw error;
  }
}

async function morphFile(filePath, summary, targetLanguage, apiKey, morphedStructure) {
  try {
    let code = await writeCode(filePath, summary, targetLanguage, apiKey, morphedStructure);
    let reviewResult = await reviewCode(filePath, code, summary, targetLanguage, apiKey, morphedStructure);

    let attempts = 1;
    while (reviewResult.result === 'Fail' && attempts < 3) {
      console.log('CODE (', filePath, '): ', code)
      console.log('REVIEW RESULT: ', reviewResult)
      code = await writeCode(filePath, summary, targetLanguage, apiKey, morphedStructure);
      reviewResult = await reviewCode(filePath, code, summary, targetLanguage, apiKey, morphedStructure);
      attempts++;
    }

    if (reviewResult.result === 'Pass') {
      return code;
    } else {
      throw new Error(`Failed to generate satisfactory code for ${filePath} after 3 attempts`);
    }
  } catch (error) {
    console.error(`Error morphing file ${filePath}:`, error);
    throw error;
  }
}

async function reviewCode(filePath, code, summary, targetLanguage, apiKey, morphedStructure) {
  const instructions = `
Act as a senior tech lead and senior developer, and you're skilled and well-versed in all programming languages and frameworks. Provide your review as a JSON object with keys:
- 'result': 'Pass' if the code meets the requirements, 'Fail' otherwise
- 'review_notes': Your comments on the code quality and adherence to the original flow and business logic

Consider the following morphed structure for context:
${JSON.stringify(morphedStructure, null, 2)}
`

  const content = `
Review the following ${targetLanguage} code for ${filePath} based on the provided summary and morphed structure.
Summary: ${JSON.stringify(summary)}

Code to review:
${code}
`;

  try {
    const review = await sendLLMRequest('gpt-4', instructions, content, apiKey);
    return review;
  } catch (error) {
    console.error(`Error reviewing code for ${filePath}:`, error);
    throw error;
  }
}

async function morphRepository(repoStructure, sourceLanguage, targetLanguage, apiKey, sendProgress) {
  const relevantFiles = await identifyRelevantFiles(repoStructure, sourceLanguage, targetLanguage, apiKey);
  const morphedStructure = await createMorphedFileStructure(repoStructure, relevantFiles, sourceLanguage, targetLanguage, apiKey);
  console.log('Morphed structure in morphRepository:', JSON.stringify(morphedStructure, null, 2));
  const morphedFiles = [];
  const totalFiles = Object.keys(morphedStructure).length;
  let processedFiles = 0;

  for (const [path, summary] of Object.entries(morphedStructure)) {
    if (summary.action === 'morph') {
      console.log(`Starting to morph file: ${path}`);
      try {
        const content = await morphFile(path, summary, targetLanguage, apiKey, morphedStructure);
        morphedFiles.push({ path, type: 'blob', content });
        console.log(`Successfully morphed file: ${path}`);
      } catch (error) {
        console.error(`Error morphing file ${path}:`, error);
        morphedFiles.push({
          path,
          type: 'blob',
          content: `Error: ${error.message}`
        });
      }
    } else {
      const originalFile = repoStructure.find(file => file.path === path);
      morphedFiles.push(originalFile);
      console.log(`Kept original file: ${path}`);
    }

    processedFiles++;
    const progress = Math.round((processedFiles / totalFiles) * 100);
    console.log('Calculated progress:', progress);
    sendProgress(progress);
  }

  return morphedFiles;
}

module.exports = {
  morphRepository
};