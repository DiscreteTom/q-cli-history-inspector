# SQLite Schema Viewer

A Single Page Application (SPA) built with Vue 3, Vite, Element Plus, and SQL.js that allows users to load local SQLite database files and view their table schemas entirely in the browser.

## Features

- 🗃️ Load local SQLite database files (.db, .sqlite, .sqlite3)
- 📊 View table schemas with detailed column information
- 🔍 Display column names, data types, constraints, and default values
- 📝 Show CREATE TABLE statements for each table
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
2. Click on the upload area or drag and drop a SQLite database file
3. View the database information and table schemas
4. Expand any table to see its column details and CREATE TABLE statement
5. Click "Load Another File" to switch to a different database

## Supported File Formats

- `.db`
- `.sqlite` 
- `.sqlite3`

## Technology Stack

- **Vue 3** - Progressive JavaScript framework
- **Vite** - Fast build tool and development server
- **Element Plus** - Vue 3 component library
- **SQL.js** - SQLite compiled to JavaScript via Emscripten

## Architecture Notes

- SQL.js is included as a dev dependency and automatically copied to the public folder during build/dev
- The SQL.js files (`sql-wasm.js` and `sql-wasm.wasm`) in the public folder are gitignored as they're generated
- This approach avoids ES module import issues while keeping dependencies properly managed

## Security & Privacy

This application runs entirely in your browser. Your database files are:
- Never uploaded to any server
- Processed locally using SQL.js (SQLite compiled to WebAssembly)
- Only accessible to your browser session
- Automatically cleared when you refresh or close the page
