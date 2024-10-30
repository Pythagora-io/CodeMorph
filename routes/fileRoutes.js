const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('./middleware/authMiddleware');
const Repository = require('../models/Repository');
const AdmZip = require('adm-zip');
const path = require('path');

router.post('/save-file', isAuthenticated, async (req, res) => {
  const { path, content, repoUrl } = req.body;
  const userId = req.session.userId;

  console.log('Received save-file request:', { path, repoUrl });
  console.log('Received content length:', content.length);
  console.log('Received content split by newlines:', content.split('\n').map(line => line.length));

  try {
    const repository = await Repository.findOne({ user: userId, url: repoUrl });

    if (!repository) {
      console.log('Repository not found');
      return res.status(404).json({ success: false, message: 'Repository not found' });
    }

    const fileToUpdate = repository.morphedFileStructure.find(file => file.path === path);

    if (!fileToUpdate) {
      console.log('File not found in morphed structure');
      return res.status(404).json({ success: false, message: 'File not found in morphed structure' });
    }

    fileToUpdate.content = content; // This should now preserve new lines
    await repository.save();

    console.log('File updated successfully in database');

    // Update the session
    if (req.session.morphedFileStructure) {
      const sessionFileToUpdate = req.session.morphedFileStructure.find(file => file.path === path);
      if (sessionFileToUpdate) {
        sessionFileToUpdate.content = content; // This should now preserve new lines
        console.log('Session updated successfully');
      } else {
        console.log('File not found in session morphed structure');
      }
    } else {
      console.log('morphedFileStructure not found in session');
    }

    console.log('Sending success response');
    res.json({ success: true, message: 'File updated successfully' });
  } catch (error) {
    console.error('Error saving file:', error);
    res.status(500).json({ success: false, message: 'Failed to save file' });
  }
});

router.get('/download-morphed-repo', isAuthenticated, async (req, res) => {
  const userId = req.session.userId;
  const repoUrl = req.query.repoUrl;
  const targetLanguage = req.query.targetLanguage;

  try {
    const repository = await Repository.findOne({ user: userId, url: repoUrl });

    if (!repository) {
      return res.status(404).json({ success: false, message: 'Repository not found' });
    }

    const zip = new AdmZip();

    repository.morphedFileStructure.forEach(file => {
      zip.addFile(file.path, Buffer.from(file.content));
    });

    const repoName = path.basename(repository.url, '.git');
    const downloadName = `${repoName}_${repository.sourceLanguage}_to_${targetLanguage}.zip`;
    const zipBuffer = zip.toBuffer();

    res.set('Content-Type', 'application/zip');
    res.set('Content-Disposition', `attachment; filename=${downloadName}`);
    res.set('Content-Length', zipBuffer.length);
    res.send(zipBuffer);

  } catch (error) {
    console.error('Error creating zip file:', error);
    res.status(500).json({ success: false, message: 'Failed to create zip file' });
  }
});

module.exports = router;