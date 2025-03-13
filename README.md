# HR Document Bot

A web application that allows employees to upload PDF documents, process them, and query the content using natural language.

## Features

- **PDF Upload**: Securely upload PDF documents through a user-friendly interface
- **Document Processing**: Extract and index text from PDF documents
- **Natural Language Queries**: Ask questions about your documents and get accurate answers
- **Document Management**: View and manage your uploaded documents

## Technology Stack

- **Frontend**: Next.js, React, TailwindCSS
- **PDF Processing**: PDF.js
- **Vector Database**: FAISS for efficient similarity search
- **AI**: Google's Gemini model for generating responses and text-embedding-004 for embeddings

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn
- Google API key for Gemini

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/hr-bot.git
   cd hr-bot
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env.local` file in the root directory with your Google API key:
   ```
   GOOGLE_API_KEY=your_google_api_key_here
   ```

4. Start the development server:
   ```
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Usage

1. **Upload Documents**: Navigate to the Upload page to upload PDF documents.
2. **Query Documents**: Once documents are processed, go to the Query page to ask questions.
3. **Manage Documents**: View and manage your uploaded documents on the Documents page.

## Security Considerations

- The application stores uploaded documents locally in the `uploads` directory.
- Document processing happens on the server, and the extracted text is stored in a vector database.
- Authentication is not implemented in this version but should be added for production use.

## Development

### Project Structure

- `app/`: Next.js application code
  - `api/`: API routes for handling requests
  - `components/`: React components
  - `lib/`: Utility functions and libraries
  - `styles/`: CSS styles
- `uploads/`: Directory for storing uploaded PDF files
- `data/`: Directory for storing vector database and document metadata

### Adding Features

- **Authentication**: Implement user authentication to secure the application
- **Document Categories**: Add support for categorizing documents
- **Advanced Search**: Implement filters and advanced search options
- **Export Functionality**: Allow exporting query results

## License

This project is licensed under the MIT License - see the LICENSE file for details. 