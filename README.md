# Pythagora CodeMorph

Pythagora CodeMorph is an innovative web application designed to transform the codebase of a GitHub repository from one programming language to another using OpenAI's Large Language Models (LLMs). The application offers a user-friendly interface, making it accessible even to users without a technical background. It allows users to fetch a public GitHub repository, display its files in a hierarchical structure, identify the programming languages and frameworks used, suggest possible target languages and frameworks for transformation, morph the repository into a different programming language and framework, and export the transformed files in a zip format.

## Overview

Pythagora CodeMorph is built using a Node.js and Express backend, with MongoDB as the database. The frontend is developed using EJS templating and Bootstrap for responsive design. The application integrates with GitHub and OpenAI APIs to fetch repository details and perform language and framework identification, as well as code transformation.

### Architecture and Technologies

- **Backend:** Node.js, Express, MongoDB, Mongoose, bcrypt, jsonwebtoken, dotenv, express-session, connect-mongo
- **Frontend:** EJS, Bootstrap, vanilla JavaScript, confetti-js
- **APIs:** GitHub API, OpenAI API
- **Database:** MongoDB
- **Other Libraries:** axios, ConfettiGenerator

### Project Structure

- **models/**: Mongoose schemas for User and Repository
- **public/**: Static files including CSS, JavaScript, and images
- **routes/**: Express routes for authentication, profile management, repository fetching, and morphing
- **services/**: Service modules for interacting with GitHub and OpenAI APIs, and for handling language and framework identification and code morphing
- **views/**: EJS templates for rendering HTML pages
- **utils/**: Utility functions for encryption

## Features

1. **User Authentication:** Users can register and log in to store their OpenAI and GitHub API keys securely.
2. **Repository Fetching:** Fetch a public GitHub repository and display its contents in a hierarchical structure.
3. **File Summaries:** Generate summaries for each file using LLMs, including brief descriptions, dependencies, and how the file contributes to the overall application.
4. **Language and Framework Identification:** Identify the programming languages and frameworks used in the repository and suggest possible target languages and frameworks for transformation.
5. **Language Morphing:** Transform the repository's codebase into a different programming language and framework while preserving the original flow and business logic.
6. **Visual Feedback:** Display visual celebrations (e.g., confetti) upon successful morphing.
7. **File Editing:** View, edit, and save the original and morphed contents of any file within the app.
8. **Export Functionality:** Export the morphed repository as a zip file.
9. **Repository and Summary Storage:** Store repository details, file summaries, and morphed file structures in the database for future access.
10. **LLM Request Management:** Manage LLM request constraints to ensure accuracy and completeness while preserving the code's original logical structure and flow.

## Getting started

### Requirements

To run Pythagora CodeMorph, you need the following technologies installed on your computer:
- Node.js
- MongoDB (or use a cloud version such as MongoDB Atlas)

### Quickstart

1. **Clone the repository:**
   ```sh
   git clone <repository-url>
   cd <repository-directory>
   ```

2. **Install dependencies:**
   ```sh
   npm install
   ```

3. **Set up environment variables:**
   - Copy the `.env.example` file to a new file named `.env`.
   - Fill in the required values in the `.env` file.

4. **Run the application:**
   ```sh
   npm start
   ```

5. **Access the application:**
   Open your web browser and navigate to `http://localhost:<PORT>` (replace `<PORT>` with the port number specified in your `.env` file).

### License

The project is open source, licensed under the MIT License. See the [LICENSE](LICENSE).

Copyright © 2024 Pythagora-io. 