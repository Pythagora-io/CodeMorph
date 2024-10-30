document.addEventListener('DOMContentLoaded', () => {
  const profileForm = document.getElementById('profileForm');
  const messageDiv = document.getElementById('message');

  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(profileForm);
    const data = Object.fromEntries(formData.entries());

    // Client-side validation
    if (!data.openaiKey || !data.githubKey) {
      messageDiv.innerHTML = '<div class="alert alert-danger">Both API keys are required</div>';
      return;
    }

    try {
      const response = await fetch('/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        messageDiv.innerHTML = '<div class="alert alert-success">Profile updated successfully</div>';
      } else {
        messageDiv.innerHTML = `<div class="alert alert-danger">${result.message}</div>`;
      }
    } catch (error) {
      console.error('Error:', error);
      messageDiv.innerHTML = '<div class="alert alert-danger">An error occurred</div>';
    }
  });
});