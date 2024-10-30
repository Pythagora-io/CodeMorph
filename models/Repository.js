const mongoose = require('mongoose');

const RepositorySchema = new mongoose.Schema({
  url: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fileStructure: [{
    path: String,
    fileType: String,  // Changed from 'type' to 'fileType'
    size: Number,
    url: String,
    content: String,
    summary: Object  // Changed from String to Object to store JSON objects
  }],
  morphedFileStructure: [{
    path: String,
    content: String,
    summary: Object
  }],
  identifiedLanguages: Object,
  sourceLanguage: String,
  targetLanguage: String,
  lastUpdated: { type: Date, default: Date.now } // Added field to track the last update time of the repository
});

module.exports = mongoose.model('Repository', RepositorySchema);