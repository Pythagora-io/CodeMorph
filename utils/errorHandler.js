// utils/errorHandler.js

class MorphingError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'MorphingError';
    this.statusCode = statusCode;
  }
}

class UnsupportedLanguageError extends MorphingError {
  constructor(message) {
    super(message, 400);
    this.name = 'UnsupportedLanguageError';
  }
}

class APIError extends MorphingError {
  constructor(message) {
    super(message, 503);
    this.name = 'APIError';
  }
}

function handleMorphingError(error, res) {
  console.error('Morphing error:', error);

  if (error instanceof MorphingError) {
    res.status(error.statusCode).json({
      success: false,
      error: error.message,
      errorType: error.name
    });
  } else {
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred during the morphing process.',
      errorType: 'UnexpectedError'
    });
  }
}

module.exports = {
  MorphingError,
  UnsupportedLanguageError,
  APIError,
  handleMorphingError
};