// public/js/errorHandler.js

function displayErrorMessage(message, type = 'error') {
  const errorContainer = document.getElementById('error-container');
  if (!errorContainer) {
    console.error('Error container not found');
    return;
  }

  const alertClass = type === 'error' ? 'alert-danger' : 'alert-warning';
  const alertHtml = `
    <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;

  errorContainer.innerHTML = alertHtml;
  errorContainer.style.display = 'block';

  // Automatically hide the error message after 5 seconds
  setTimeout(() => {
    errorContainer.style.display = 'none';
  }, 5000);
}