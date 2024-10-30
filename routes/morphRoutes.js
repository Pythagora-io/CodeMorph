const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('./middleware/authMiddleware');
const { morphRepository } = require('../services/morphService');
const User = require('../models/User');
const Repository = require('../models/Repository');
const { decrypt } = require('../utils/encryption');
const { UnsupportedLanguageError, APIError, handleMorphingError } = require('../utils/errorHandler');

router.post('/morph-repo', isAuthenticated, async (req, res) => {
  const { source, target, repoUrl } = req.body;
  console.log('Starting morphing process:', { source, target, repoUrl });

  try {
    const repository = await Repository.findOne({ url: repoUrl, user: req.session.userId });

    if (!repository) {
      throw new MorphingError('Repository not found. Please fetch the repository first.', 400);
    }

    const repoStructure = repository.fileStructure;

    const user = await User.findById(req.session.userId);
    if (!user || !user.openaiKey) {
      throw new MorphingError('OpenAI API key not found. Please update your profile.', 400);
    }

    const decryptedApiKey = decrypt(user.openaiKey);

    // Check if the language combination is supported
    if (!isSupportedLanguageCombination(source, target)) {
      throw new UnsupportedLanguageError(`Unsupported language combination: ${source} to ${target}`);
    }

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Transfer-Encoding': 'chunked'
    });

    const sendProgress = (progress) => {
      if (isFinite(progress)) {
        console.log('Sending progress:', progress);
        res.write(JSON.stringify({ progress }));
      } else {
        console.log('Invalid progress value:', progress);
      }
    };

    const morphedFiles = await morphRepository(repoStructure, source, target, decryptedApiKey, sendProgress);
    console.log('Morphed files:', morphedFiles.map(file => file.path));

    // After morphing is complete, store the morphed structure in the session
    req.session.morphedFileStructure = morphedFiles;
    console.log('Stored morphed file structure in session:', req.session.morphedFileStructure.map(file => file.path));

    // Update the repository details in the database
    repository.sourceLanguage = source;
    repository.targetLanguage = target;
    repository.morphedFileStructure = morphedFiles;
    await repository.save();

    res.write(JSON.stringify({ success: true, message: 'Morphing process completed successfully', morphedFiles }));
    res.end();
  } catch (error) {
    console.error('Error during morphing process:', error);
    console.error(error.stack);
    handleMorphingError(error, res);
  }
});

function isSupportedLanguageCombination(source, target) {
  // Add logic to check if the language combination is supported
  // For now, we'll assume all combinations are supported
  return true;
}

module.exports = router;