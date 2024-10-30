const axios = require('axios');

async function fetchRepoContents(repoUrl, apiKey) {
  console.log(`Sending request to GitHub API for repository: ${repoUrl}`);
  try {
    const [, owner, repo] = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);

    // First, fetch the repository metadata to get the last update time
    const metadataResponse = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${apiKey}`
      }
    });

    const lastUpdated = new Date(metadataResponse.data.updated_at);

    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${apiKey}`
      }
    });
    console.log(`Received response from GitHub API for repository: ${repoUrl}`);

    // Check if the repository has more than 50 files
    if (response.data.tree.length > 50) {
      throw new Error('Repository has more than 50 files. Please choose a smaller repository.');
    }

    const fileStructure = (await Promise.all(response.data.tree
      .filter(item => !['package-lock.json', '.gitignore'].includes(item.path)) // Filter out irrelevant files
      .map(async item => {
        if (item.type === 'blob') {
          const contentResponse = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/${item.path}`, {
            headers: {
              'Accept': 'application/vnd.github.v3+json',
              'Authorization': `token ${apiKey}`
            }
          });
          const content = Buffer.from(contentResponse.data.content, 'base64').toString('utf-8');
          return { ...item, content, fileType: item.type };
        }
        return { ...item, fileType: item.type };
      }))).filter(item => item !== null);

    return { fileStructure, lastUpdated };
  } catch (error) {
    console.error(`GitHub API error for repository ${repoUrl}:`, error.response ? error.response.data : error.message);
    console.error(error.stack);
    if (error.response && error.response.status === 404) {
      throw new Error('Repository not found. Please check the URL and try again.');
    }
    throw new Error(`Failed to fetch repository contents: ${error.message}`);
  }
}

module.exports = {
  fetchRepoContents
};