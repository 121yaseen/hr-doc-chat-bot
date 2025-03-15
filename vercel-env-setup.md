# Vercel Environment Variables Setup

## Fix for PostgreSQL Connection Error

The error you're seeing is because your `DATABASE_URL` environment variable on Vercel doesn't have the correct format for a PostgreSQL connection. Here's how to fix it:

1. **Log in to your Vercel dashboard**
2. **Select your project**
3. **Go to Settings > Environment Variables**
4. **Update the `DATABASE_URL` variable**

   Your current `DATABASE_URL` is likely still set to the SQLite format (`file:./dev.db`), but your Prisma schema is now configured for PostgreSQL. You need to update it to a PostgreSQL connection string with this format:

   ```
   postgresql://username:password@hostname:port/database
   ```

   For example:
   ```
   postgresql://myuser:mypassword@db.example.com:5432/mydb
   ```

## Setting Up Vercel Blob Storage

The application now uses Vercel Blob Storage for storing uploaded files. Here's how to set it up:

1. **Create a Blob Store in your Vercel dashboard**:
   - Go to your Vercel dashboard
   - Select your project
   - Go to Storage > Blob
   - Click "Create Blob Store"

2. **Add the `BLOB_READ_WRITE_TOKEN` to your environment variables**:
   - After creating the Blob Store, you'll get a read-write token
   - Go to Settings > Environment Variables
   - Add a new variable named `BLOB_READ_WRITE_TOKEN` with the value of your token

## Other Required Environment Variables

Make sure you have all these environment variables set in your Vercel project:

- `DATABASE_URL`: Your PostgreSQL connection string (as described above)
- `NEXTAUTH_SECRET`: A secure random string for NextAuth.js
- `NEXTAUTH_URL`: Your production URL (e.g., `https://your-app.vercel.app`)
- `GOOGLE_API_KEY`: Your Google API key for Gemini AI
- `GEMINI_API_KEY`: Your Gemini API key (if different from GOOGLE_API_KEY)
- `BLOB_READ_WRITE_TOKEN`: Your Vercel Blob Storage read-write token

## Creating a PostgreSQL Database

If you don't already have a PostgreSQL database, you can create one using:

1. **Vercel Postgres**: 
   - Go to your Vercel dashboard
   - Click on "Storage"
   - Select "Create Database"
   - Follow the setup instructions

2. **Other providers**:
   - [Supabase](https://supabase.com/)
   - [Railway](https://railway.app/)
   - [Neon](https://neon.tech/)
   - [ElephantSQL](https://www.elephantsql.com/)

After creating your database, use the provided connection string as your `DATABASE_URL`.

## Running Migrations

After setting up your PostgreSQL database, you need to run migrations:

```bash
# Install Vercel CLI if you haven't already
npm install -g vercel

# Link your local project to the Vercel project
vercel link

# Pull the environment variables
vercel env pull .env.production

# Run the migrations
npx prisma migrate deploy
```

This will create all the necessary tables in your PostgreSQL database.

## Redeploying Your Application

After updating all the environment variables, you need to redeploy your application:

1. **Go to the "Deployments" tab**
2. **Click on the "..." menu next to your latest deployment**
3. **Select "Redeploy"**

This will rebuild your application with the new environment variables and configuration. 