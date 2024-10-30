const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('./middleware/authMiddleware');
const { fetchRepoContents } = require('../services/githubService');
const { generateFileSummary } = require('../services/llm');
const { identifyLanguageFrameworks } = require('../services/languageFrameworkService');
const User = require('../models/User');
const Repository = require('../models/Repository');
const { decrypt } = require('../utils/encryption');

router.post('/fetch-repo', isAuthenticated, async (req, res) => {
  const { repoUrl } = req.body;
  console.log(`Attempting to fetch repository: ${repoUrl}`);

  try {
    const user = await User.findById(req.session.userId);
    if (!user || !user.openaiKey) {
      return res.status(400).json({ success: false, message: 'OpenAI API key not found in user profile.' });
    }
    if (!user || !user.githubKey) {
      return res.status(400).json({ success: false, message: 'GitHub API key not found in user profile.' });
    }

    const decryptedGithubApiKey = decrypt(user.githubKey);

    // Check if the repository exists in the database
    let repository = await Repository.findOne({ url: repoUrl, user: req.session.userId });

    if (repository) {
      // Fetch the latest metadata from GitHub
      const { lastUpdated } = await fetchRepoContents(repoUrl, decryptedGithubApiKey);

      // If the repository hasn't been updated since the last fetch, use the stored data
      if (repository.lastUpdated >= lastUpdated) {
        console.log('Using stored repository data');
        req.session.repoStructure = repository.fileStructure;
        req.session.languageFrameworks = repository.identifiedLanguages;
        return res.json({ success: true, fileStructure: repository.fileStructure, languageFrameworks: req.session.languageFrameworks });
      }
    }

    console.log(`Fetching repository URL: ${repoUrl}`);
    const { fileStructure, lastUpdated } = await fetchRepoContents(repoUrl, decryptedGithubApiKey);

    if (fileStructure.length > 50) {
      throw new Error('Repository has more than 50 files. Please choose a smaller repository.');
    }

    const fileStructureWithSummaries = await Promise.all(fileStructure.map(async (item) => {
      if (item.fileType === 'blob' && item.content) {
        const summary = await generateFileSummary(item.path, item.content, user.openaiKey);
        return {
          ...item,
          summary
        };
      }
      return item;
    }));

    const decryptedOpenaiApiKey = decrypt(user.openaiKey);
    const languageFrameworks = await identifyLanguageFrameworks(fileStructureWithSummaries, decryptedOpenaiApiKey);

    if (repository) {
      // Update existing repository
      repository.fileStructure = fileStructureWithSummaries;
      repository.identifiedLanguages = languageFrameworks;
      repository.lastUpdated = lastUpdated;
    } else {
      // Create new repository
      repository = new Repository({
        url: repoUrl,
        user: req.session.userId,
        fileStructure: fileStructureWithSummaries,
        identifiedLanguages: languageFrameworks,
        lastUpdated: lastUpdated
      });
      // Link repository to the user
      user.repositories.push(repository._id);
    }
    await repository.save();
    await user.save();

    req.session.repoStructure = fileStructureWithSummaries;
    req.session.languageFrameworks = languageFrameworks;
    console.log('Repository structure and refined language frameworks stored in session and database');
    console.log(`Successfully fetched repository: ${repoUrl}`);

    res.json({ success: true, fileStructure: fileStructureWithSummaries, languageFrameworks });
  } catch (error) {
    console.error(`Error fetching repository ${repoUrl}:`, error);
    res.status(error.response?.status || 500).json({
      success: false,
      message: error.message || 'An error occurred while fetching the repository.'
    });
  }
});

router.get('/file-content', isAuthenticated, (req, res) => {
  const { path, isMorphed } = req.query;
  const decodedPath = decodeURIComponent(path);

  console.log('Retrieving file content:', { path: decodedPath, isMorphed });

  let fileStructure;
  if (isMorphed === 'true') {
    fileStructure = req.session.morphedFileStructure;
    console.log('Using morphed file structure from session');
  } else {
    fileStructure = req.session.repoStructure;
    console.log('Using original file structure from session');
  }

  if (!fileStructure) {
    console.log('File structure not found in session');
    return res.status(404).json({ success: false, message: 'File structure not found in session.' });
  }

  const file = fileStructure.find(item => item.path === decodedPath);

  if (!file) {
    console.log('File not found in repository structure');
    return res.status(404).json({ success: false, message: 'File not found in repository structure.' });
  }

  console.log('File content retrieved successfully');
  res.json({ success: true, content: file.content });
});

module.exports = router;