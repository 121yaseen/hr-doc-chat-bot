# HR Document Chat Bot

A Next.js application that allows users to upload HR documents and query them using natural language.

## Important Production Notes

### File Storage in Production

⚠️ **Important**: The current implementation stores uploaded files in a local `uploads` directory, which won't work on Vercel's read-only filesystem. For production deployment, you need to implement a cloud storage solution like AWS S3, Google Cloud Storage, or similar.

A quick implementation guide:
1. Sign up for a cloud storage service (AWS S3, Google Cloud Storage, etc.)
2. Update the file upload API route to upload files to the cloud storage
3. Update the file deletion logic to delete files from the cloud storage
4. Update the document processor to read files from the cloud storage

## Features

- **PDF Upload**: Securely upload PDF documents through a user-friendly interface
- **Document Processing**: Extract and index text from PDF documents
- **Natural Language Queries**: Ask questions about your documents and get accurate answers
- **Document Management**: View and manage your uploaded documents
- **User Authentication**: Secure access with NextAuth.js

## Technology Stack

- **Frontend**: Next.js, React, TailwindCSS
- **PDF Processing**: PDF.js
- **Vector Database**: Simple vector store for efficient similarity search
- **AI**: Google's Gemini model for generating responses and embeddings
- **Authentication**: NextAuth.js with Prisma adapter
- **Database**: SQLite (development), PostgreSQL (production)

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn
- Google API key for Gemini

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/hr-bot.git
   cd hr-bot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env.local` and fill in the values
   ```bash
   cp .env.example .env.local
   ```

4. Initialize the database:
   ```bash
   npx prisma migrate dev
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Deploying to Vercel

### Step 1: Prepare Your Database

The application uses SQLite by default, which is not suitable for production deployments on Vercel. For production, you need to use a PostgreSQL database:

1. Create a PostgreSQL database using Vercel Postgres, Supabase, Railway, or any other PostgreSQL provider.
2. Get your PostgreSQL connection string.

### Step 2: Update Prisma Schema for Production

Before deploying, update your Prisma schema to use PostgreSQL:

1. Open `prisma/schema.prisma`
2. Change the database provider from `sqlite` to `postgresql`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
3. Commit and push these changes to your repository.

### Step 3: Deploy to Vercel

1. Push your code to GitHub
2. Create a new project in Vercel and link it to your GitHub repository
3. Set up the following environment variables in Vercel:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `NEXTAUTH_SECRET`: A secure random string for NextAuth.js
   - `NEXTAUTH_URL`: Your production URL (e.g., `https://your-app.vercel.app`)
   - `GOOGLE_API_KEY`: Your Google API key for Gemini AI
   - `GEMINI_API_KEY`: Your Gemini API key (if different from GOOGLE_API_KEY)
   - OAuth provider credentials if you're using social login
4. Deploy the application

### Step 4: Run Migrations on Production Database

After deploying, you need to run migrations on your production database:

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```
2. Link your local project to the Vercel project:
   ```bash
   vercel link
   ```
3. Pull the environment variables:
   ```bash
   vercel env pull .env.production
   ```
4. Run the migrations:
   ```bash
   npx prisma migrate deploy
   ```

## Usage

1. **Upload Documents**: Navigate to the Upload page to upload PDF documents.
2. **Query Documents**: Once documents are processed, go to the Query page to ask questions.
3. **Manage Documents**: View and manage your uploaded documents on the Documents page.

## Security Considerations

- The application stores uploaded documents locally in the `uploads` directory.
- Document processing happens on the server, and the extracted text is stored in a vector database.
- Authentication is implemented using NextAuth.js.

## Troubleshooting Vercel Deployment

If you encounter issues with Prisma during deployment:

1. Make sure the `postinstall` script is in your `package.json`:
   ```json
   "postinstall": "prisma generate"
   ```

2. Make sure the `build` script includes Prisma generation:
   ```json
   "build": "prisma generate && next build"
   ```

3. Check that your environment variables are correctly set in Vercel.

4. If you're seeing the error "Prisma has detected that this project was built on Vercel, which caches dependencies", make sure you have both the `postinstall` script and the updated `build` script.

5. If you're having issues with file uploads, remember that Vercel's filesystem is read-only in production. You'll need to use a cloud storage solution like AWS S3, Google Cloud Storage, or similar for storing uploaded files.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 