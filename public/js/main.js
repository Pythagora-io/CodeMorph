document.addEventListener('DOMContentLoaded', function() {
  const repoForm = document.getElementById('fetch-form');
  const messageDiv = document.getElementById('message');
  const repoTreeContainer = document.getElementById('repoTree');
  let repoFetched = false; // Flag to indicate if a repo has been fetched

  const sourceLanguageSelect = document.getElementById('source-language');
  const targetLanguageSelect = document.getElementById('target-language');
  const morphButton = document.getElementById('morph-button');
  const progressContainer = document.getElementById('progress-container');
  const progressBar = document.getElementById('progress-bar');
  const downloadContainer = document.getElementById('download-container');
  const downloadButton = document.getElementById('download-button');

  sourceLanguageSelect.disabled = true; // Initially disable language dropdowns
  targetLanguageSelect.disabled = true;

  repoForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const repoUrl = document.getElementById('repo-url').value;

    try {
      const response = await fetch('/fetch-repo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ repoUrl }),
      });

      const data = await response.json();

      if (data.success) {
        messageDiv.textContent = 'Repository fetched successfully!';
        messageDiv.className = 'alert alert-success';

        // Clear previous tree
        repoTreeContainer.innerHTML = '';

        // Build and render the tree
        const root = window.repoTree.buildTree(data.fileStructure);
        const treeContainer = document.createElement('ul');
        treeContainer.className = 'repo-tree';
        window.repoTree.renderTree(root, treeContainer);
        repoTreeContainer.appendChild(treeContainer);

        // Set the flag and enable dropdowns
        repoFetched = true;
        populateLanguageFrameworks(data.languageFrameworks);

        const uniqueExtensions = new Set(data.fileStructure
          .filter(file => file.path.includes('.'))
          .map(file => file.path.split('.').pop())
        );
        uniqueExtensions.forEach(loadPrismLanguage);
      } else {
        console.error('Error fetching repository:', data);
        messageDiv.textContent = data.message;
        messageDiv.className = 'alert alert-danger';
        repoFetched = false; // Ensure flag is reset on failure
        sourceLanguageSelect.disabled = true;
        targetLanguageSelect.disabled = true;

        // Display error message using the error handler
        displayErrorMessage(data.message, 'error');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      messageDiv.textContent = 'An unexpected error occurred while fetching the repository.';
      messageDiv.className = 'alert alert-danger';
      repoFetched = false; // Ensure flag is reset on error
      sourceLanguageSelect.disabled = true;
      targetLanguageSelect.disabled = true;

      // Display error message using the error handler
      displayErrorMessage('An unexpected error occurred while fetching the repository.', 'error');
    }
  });

  function populateLanguageFrameworks(languageFrameworks) {
    sourceLanguageSelect.innerHTML = '<option value="">Select source language/framework</option>';
    Object.keys(languageFrameworks).forEach(lang => {
      const option = document.createElement('option');
      option.value = lang;
      option.textContent = lang;
      sourceLanguageSelect.appendChild(option);
    });

    sourceLanguageSelect.disabled = false;
    targetLanguageSelect.disabled = true;

    sourceLanguageSelect.addEventListener('change', () => {
      const selectedSource = sourceLanguageSelect.value;
      targetLanguageSelect.innerHTML = '<option value="">Select target language/framework</option>';

      if (selectedSource && languageFrameworks[selectedSource]) {
        languageFrameworks[selectedSource].forEach(lang => {
          const option = document.createElement('option');
          option.value = lang;
          option.textContent = lang;
          targetLanguageSelect.appendChild(option);
        });
        targetLanguageSelect.disabled = false;
      } else {
        targetLanguageSelect.disabled = true;
      }
      updateMorphButton();
    });
  }

  // Enable/disable Morph button based on selections and repo fetch status
  function updateMorphButton() {
    morphButton.disabled = !(repoFetched && sourceLanguageSelect.value && targetLanguageSelect.value);
  }

  sourceLanguageSelect.addEventListener('change', updateMorphButton);
  targetLanguageSelect.addEventListener('change', updateMorphButton);

  const morphForm = document.getElementById('morph-form');
  morphForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const sourceLanguage = sourceLanguageSelect.value;
    const targetLanguage = targetLanguageSelect.value;
    const repoUrl = document.getElementById('repo-url').value;

    console.log('Initiating morphing process:', { sourceLanguage, targetLanguage, repoUrl });

    try {
      messageDiv.textContent = 'Morphing in progress...';
      messageDiv.className = 'alert alert-info';
      progressContainer.style.display = 'block';
      updateProgress(0);

      const response = await fetch('/morph-repo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ source: sourceLanguage, target: targetLanguage, repoUrl: repoUrl }),
      });

      if (!response.ok) {
        throw new Error('Failed to morph repository. Please try again.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        try {
          const data = JSON.parse(chunk);
          if (data.progress) {
            updateProgress(data.progress);
          } else if (data.success) {
            console.log('Received morphed files:', data.morphedFiles.map(file => file.path));

            // Create a new container for morphed files
            const morphedFilesContainer = document.createElement('div');
            morphedFilesContainer.id = 'morphedFiles';
            morphedFilesContainer.innerHTML = '<h2>Morphed Files</h2>';

            // Build and render the morphed file tree
            const morphedRoot = window.repoTree.buildTree(data.morphedFiles);
            const morphedTreeContainer = document.createElement('ul');
            morphedTreeContainer.className = 'repo-tree';
            window.repoTree.renderTree(morphedRoot, morphedTreeContainer);
            morphedFilesContainer.appendChild(morphedTreeContainer);

            // Remove existing morphed files container if it exists
            const existingMorphedFilesContainer = document.getElementById('morphedFiles');
            if (existingMorphedFilesContainer) {
              console.log('Removing existing morphed files container');
              existingMorphedFilesContainer.remove();
            }

            // Insert the new morphed files container after the original repo tree
            console.log('Inserting new morphed files container');
            repoTreeContainer.parentNode.insertBefore(morphedFilesContainer, repoTreeContainer.nextSibling);

            messageDiv.textContent = 'Repository morphing completed successfully!';
            messageDiv.className = 'alert alert-success';

            showDownloadButton();

            const successModal = document.getElementById('success-modal');
            const successMessage = document.getElementById('success-message');
            successMessage.textContent = 'Repository morphing completed successfully!';
            successModal.style.display = 'flex';

            // Show confetti animation
            const canvas = document.getElementById('confetti-canvas');
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            canvas.style.position = 'fixed';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.zIndex = '1000';
            canvas.style.pointerEvents = 'none';

            const confetti = new ConfettiGenerator({
              target: 'confetti-canvas',
              max: 80,
              size: 1,
              animate: true,
              props: ['circle', 'square', 'triangle', 'line'],
              colors: [[165,104,246],[230,61,135],[0,199,228],[253,214,126]],
              clock: 25,
              start_from_edge: true,
              width: window.innerWidth,
              height: window.innerHeight
            });
            confetti.render();

            // Add click event to close the modal
            successModal.addEventListener('click', () => {
              successModal.style.display = 'none';
              confetti.clear();
              progressContainer.style.display = 'none';
            }, { once: true });

            const morphedExtensions = new Set(data.morphedFiles
              .filter(file => file.path.includes('.'))
              .map(file => file.path.split('.').pop())
            );
            morphedExtensions.forEach(loadPrismLanguage);
          } else {
            throw new Error(data.message || 'An error occurred during the morphing process.');
          }
        } catch (error) {
          console.error('Error parsing chunk:', error);
          console.log('Problematic chunk:', chunk);
          throw error;
        }
      }
    } catch (error) {
      console.error('Error during morphing:', error);
      messageDiv.textContent = error.message || 'An unexpected error occurred during the morphing process.';
      messageDiv.className = 'alert alert-danger';
      progressContainer.style.display = 'none';
    }
  });

  function updateProgress(progress) {
    console.log('Updating progress:', progress);
    progressBar.style.width = `${progress}%`;
    progressBar.setAttribute('aria-valuenow', progress);
    progressBar.textContent = `${progress}%`;
    console.log('Progress bar width:', progressBar.style.width);
  }

  function showDownloadButton() {
    downloadContainer.style.display = 'block';
    downloadButton.onclick = function() {
      const repoUrl = document.getElementById('repo-url').value;
      const targetLanguage = document.getElementById('target-language').value;
      window.location.href = `/download-morphed-repo?repoUrl=${encodeURIComponent(repoUrl)}&targetLanguage=${encodeURIComponent(targetLanguage)}`;
    };
  }

  function displayFileContents(file) {
    console.log('Displaying file:', file.path);
    console.log('File content length:', file.content.length);
    console.log('File content split by newlines:', file.content.split('\n').map(line => line.length));
    const fileContentDiv = document.getElementById('file-content');
    fileContentDiv.innerHTML = '';

    const fileNameHeader = document.createElement('h3');
    fileNameHeader.textContent = file.path;
    fileNameHeader.className = 'file-name';
    fileContentDiv.appendChild(fileNameHeader);

    const codeBlock = document.createElement('pre');
    const codeElement = document.createElement('code');
    fileContentDiv.appendChild(codeBlock);
    codeBlock.appendChild(codeElement);

    let extension = 'plaintext';
    if (file.path.includes('.')) {
        extension = file.path.split('.').pop();
        console.log('File extension:', extension);
        loadPrismLanguage(extension);
    } else {
        console.log('No file extension found');
    }
    codeElement.className = `language-${extension}`;
    codeElement.textContent = file.content || 'No content available';
    Prism.highlightElement(codeElement);
  }

  function loadPrismLanguage(extension) {
    const languageMap = {
      'js': 'javascript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'cs': 'csharp',
      'html': 'markup',
      'css': 'css',
      'php': 'php',
      'rb': 'ruby',
      'go': 'go',
      'ts': 'typescript',
      'md': 'markdown',
      // Add more mappings as needed
    };

    const language = languageMap[extension] || extension;
    if (!Prism.languages[language]) {
      const script = document.createElement('script');
      script.src = `https://cdnjs.cloudflare.com/ajax/libs/prism/1.24.1/components/prism-${language}.min.js`;
      script.onload = () => console.log(`Loaded Prism language: ${language}`);
      script.onerror = (e) => console.error(`Failed to load Prism language: ${language}`, e);
      document.head.appendChild(script);
    }
  }

  function makeFileContentEditable() {
    console.log('makeFileContentEditable function called');
    const fileContentDiv = document.getElementById('file-content');
    const codeElement = fileContentDiv.querySelector('code');
    const editButton = document.createElement('button');
    editButton.textContent = 'Edit';
    editButton.className = 'btn btn-primary mt-2';

    editButton.addEventListener('click', () => {
      console.log('Edit button clicked');
      const editablePreElement = document.createElement('pre');
      editablePreElement.contentEditable = true;
      editablePreElement.className = codeElement.className;
      editablePreElement.textContent = codeElement.textContent;
      editablePreElement.style.width = '100%';
      editablePreElement.style.height = '300px';
      editablePreElement.style.border = '1px solid #ccc';
      editablePreElement.style.padding = '10px';
      editablePreElement.style.overflowY = 'auto';

      codeElement.replaceWith(editablePreElement);
      console.log('Code element replaced with editable pre element');
      Prism.highlightElement(editablePreElement);
      editButton.style.display = 'none';

      const saveButton = document.createElement('button');
      saveButton.textContent = 'Save';
      saveButton.className = 'btn btn-success mt-2';
      saveButton.addEventListener('click', () => {
        console.log('Save button clicked');
        saveFileContent(editablePreElement.textContent)
      });
      fileContentDiv.appendChild(saveButton);
      console.log('Save button added');
    });

    fileContentDiv.appendChild(editButton);
    console.log('Edit button appended to file content div');
  }

  async function saveFileContent(content) {
    console.log('saveFileContent called');
    const fileNameHeader = document.querySelector('#file-content .file-name');
    const filePath = fileNameHeader.textContent;
    const repoUrl = document.getElementById('repo-url').value;

    // Get the contentEditable element
    let editableElement = document.querySelector('[contenteditable]');
    // Extract plain text from the contentEditable element
    let plainText = getPlainTextFromContentEditable(editableElement);

    console.log('Extracted plain text:', plainText);

    try {
      const response = await fetch('/save-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: filePath, content: plainText, repoUrl: repoUrl }),
      });

      const data = await response.json();
      console.log('Save file response:', data);

      if (data.success) {
        console.log('File saved successfully, calling displayFileContents');
        displayFileContents({ path: filePath, content: plainText });
        makeFileContentEditable();
        displayErrorMessage('File saved successfully', 'success');
      } else {
        console.error('Failed to save file:', data.message);
        throw new Error(data.message || 'Failed to save file');
      }
    } catch (error) {
      console.error('Error saving file:', error);
      displayErrorMessage('Failed to save file. Please try again.');
    }
  }

  function getPlainTextFromContentEditable(element) {
    // Clone the contentEditable element to work on a copy
    let clone = element.cloneNode(true);

    // Replace <br> with \n
    clone.querySelectorAll('br').forEach(br => {
        br.parentNode.replaceChild(document.createTextNode('\n'), br);
    });

    // Replace block elements like <div> and <p> with \n
    clone.querySelectorAll('div, p').forEach(div => {
        let newLine = document.createTextNode('\n');
        // Insert a new text node with a newline character before the div
        div.parentNode.insertBefore(newLine, div);
        // Replace the div and its content with just its content
        while (div.firstChild) {
            div.parentNode.insertBefore(div.firstChild, div);
        }
        // Remove the now-empty div
        div.parentNode.removeChild(div);
    });

    // Use textContent to get the plain text representation
    return clone.textContent;
  }

  document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('file')) {
      let filePath = e.target.textContent;
      let currentElement = e.target.parentElement;
      let isMorphed = !!e.target.closest('#morphedFiles');

      while (currentElement && !currentElement.classList.contains('repo-tree')) {
        if (currentElement.querySelector(':scope > span.folder')) {
          filePath = currentElement.querySelector(':scope > span.folder').textContent + '/' + filePath;
        }
        currentElement = currentElement.parentElement;
      }

      const encodedPath = encodeURIComponent(filePath).replace(/%2F/g, '/');

      console.log(`Fetching file: ${filePath}, isMorphed: ${isMorphed}, encodedPath: ${encodedPath}`);

      try {
        const response = await fetch(`/file-content?path=${encodedPath}&isMorphed=${isMorphed}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();

        if (data.success) {
          console.log('File content received:', data.content);
          displayFileContents({ path: filePath, content: data.content });

          if (isMorphed) {
            console.log('File is morphed, making content editable');
            makeFileContentEditable();
          }
        } else {
          console.error('Error fetching file content:', data.message);
          displayErrorMessage('Failed to fetch file content. Please try again.');
        }
      } catch (error) {
        console.error('Error fetching file content:', error);
        displayErrorMessage('An unexpected error occurred while fetching file content.');
      }
    }
  });
});