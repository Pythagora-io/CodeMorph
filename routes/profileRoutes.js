const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('./middleware/authMiddleware');
const User = require('../models/User');
const axios = require('axios');
const { decrypt, encrypt } = require('../utils/encryption');

router.get('/profile', isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    res.render('profile', {
      user: {
        ...user.toObject(),
        email: user.email,
        openaiKey: user.openaiKey ? decrypt(user.openaiKey) : '',
        githubKey: user.githubKey ? decrypt(user.githubKey) : ''
      },
      errors: {}
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    console.error(error.stack);
    res.status(500).send('Error fetching user profile');
  }
});

router.post('/profile', isAuthenticated, async (req, res) => {
  try {
    const { openaiKey, githubKey } = req.body;
    console.log('Received API keys:', { openaiKey: openaiKey ? '***' : 'not provided', githubKey: githubKey ? '***' : 'not provided' });

    const errors = {};

    if (!openaiKey || !githubKey) {
      errors.general = 'Both API keys are required';
    }

    console.log('Initial validation errors:', errors);

    console.log('OpenAI key format:', {
      length: openaiKey.length,
      prefix: openaiKey.substring(0, 3),
      suffix: openaiKey.substring(openaiKey.length - 4)
    });

    if (!isValidOpenAIKey(openaiKey)) {
      errors.openai = 'Invalid OpenAI API key format. It should start with "sk-" followed by at least 32 characters (letters, numbers, underscores, or hyphens).';
    }

    if (!isValidGitHubKey(githubKey)) {
      errors.github = 'Invalid GitHub API key format';
    }

    console.log('After format validation errors:', errors);

    // Check if OpenAI key is valid and not expired
    if (!errors.openai) {
      try {
        console.log('Validating OpenAI API key...');
        await axios.get('https://api.openai.com/v1/engines', {
          headers: { 'Authorization': `Bearer ${openaiKey}` }
        });
        console.log('OpenAI API key validation successful');
      } catch (error) {
        console.error('Error validating OpenAI API key:', error.message);
        console.error(error.stack);
        errors.openai = 'Invalid or expired OpenAI API key';
      }
    }

    // Check if GitHub key is valid and not expired
    if (!errors.github) {
      try {
        console.log('Validating GitHub API key...');
        await axios.get('https://api.github.com/user', {
          headers: { 'Authorization': `token ${githubKey}` }
        });
        console.log('GitHub API key validation successful');
      } catch (error) {
        console.error('Error validating GitHub API key:', error.message);
        console.error(error.stack);
        errors.github = 'Invalid or expired GitHub API key';
      }
    }

    console.log('Final validation errors:', errors);

    if (Object.keys(errors).length > 0) {
      const errorMessages = Object.values(errors).join('. ');
      return res.status(400).json({ success: false, message: errorMessages });
    }

    // Encrypt API keys before saving
    const encryptedOpenAIKey = openaiKey ? encrypt(openaiKey) : '';
    const encryptedGitHubKey = githubKey ? encrypt(githubKey) : '';

    await User.findByIdAndUpdate(req.session.userId, { openaiKey: encryptedOpenAIKey, githubKey: encryptedGitHubKey });
    console.log('User profile updated successfully');
    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating user profile:', error.message);
    console.error(error.stack);
    res.status(500).json({ success: false, message: 'Error updating user profile' });
  }
});

function isValidOpenAIKey(key) {
  return /^sk-[A-Za-z0-9_-]{32,}$/.test(key);
}

function isValidGitHubKey(key) {
  return /^ghp_[A-Za-z0-9]{36}$/.test(key) || /^github_pat_[A-Za-z0-9]{22}_[A-Za-z0-9]{59}$/.test(key);
}

module.exports = router;