# Amazon Q CLI History Inspector

A Single Page Application (SPA) built with Vue 3, Vite, Element Plus, and SQL.js that allows users to load Amazon Q Developer CLI database files and view conversation history entirely in the browser.

## 🚀 Live Demo

**[Try it now on GitHub Pages](https://discretetom.github.io/q-cli-history-inspector/)**

## Features

- 🗃️ Load Amazon Q Developer CLI database files
- 💬 View conversation history from the 'conversations' table
- 🔍 Display conversation folder paths and content
- 📊 Show conversation value lengths for quick assessment
- 📝 Expandable conversation details with full content view
- 💾 Download individual conversations as JSON files
- 🎨 Clean and responsive UI with Element Plus components
- 🔒 Completely client-side - no data is uploaded to any server

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

The `predev` script will automatically copy the required SQL.js files to the public folder before starting the development server.

3. Open your browser and navigate to the URL shown in the terminal (usually `http://localhost:5173`)

### Building for Production

```bash
npm run build
```

The `prebuild` script will automatically copy the required SQL.js files before building. The built files will be in the `dist` directory.

## Usage

1. Open the application in your browser
2. Click on the upload area or drag and drop an Amazon Q CLI database file
3. View the conversation history table showing all conversation paths
4. Click "View" on any conversation to see its full content
5. Click "Download JSON" to export individual conversations
6. Click "Load Another File" to switch to a different database

## Database Structure

The application reads from Amazon Q Developer CLI database files and specifically looks for:
- **conversations table** with `key` (conversation folder path) and `value` (conversation data) columns
- Other tables in the database: `migrations`, `history`, `auth_kv`, `state`

## Important Notes

- **File Locking**: Make sure to close Amazon Q CLI completely before loading database files
- **File Copy**: If you get "malformed database" errors, try copying the database file to a different location first
- **Database Location**: Amazon Q CLI databases are typically stored in `~/.aws/amazonq/` or similar directories

## Technology Stack

- **Vue 3** - Progressive JavaScript framework
- **Vite** - Fast build tool and development server
- **Element Plus** - Vue 3 component library
- **SQL.js** - SQLite compiled to JavaScript via Emscripten

## Architecture Notes

- SQL.js is included as a dev dependency and automatically copied to the public folder during build/dev
- The SQL.js files (`sql-wasm.js` and `sql-wasm.wasm`) in the public folder are gitignored as they're generated
- This approach avoids ES module import issues while keeping dependencies properly managed

## Deployment

This project is automatically deployed to GitHub Pages using GitHub Actions. The deployment workflow:

1. Triggers on pushes to the `main` branch
2. Builds the project using `npm run build`
3. Deploys the `dist` folder to the `gh-pages` branch
4. Makes the site available at the GitHub Pages URL

## Security & Privacy

This application runs entirely in your browser. Your database files are:
- Never uploaded to any server
- Processed locally using SQL.js (SQLite compiled to WebAssembly)
- Only accessible to your browser session
- Automatically cleared when you refresh or close the page

## Troubleshooting

### "Database disk image is malformed" Error
This usually happens when:
1. Amazon Q CLI is still running and has the database file locked
2. The database file is being actively written to

**Solutions:**
- Close Amazon Q CLI completely (`q quit` or kill all `q` processes)
- Copy the database file to a temporary location and load the copy
- Wait a few seconds after Amazon Q CLI operations before accessing the file
