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

5. **Save your changes**
6. **Redeploy your application**

   After updating the environment variable, you need to redeploy your application for the changes to take effect. You can do this by:
   - Going to the "Deployments" tab
   - Clicking on the "..." menu next to your latest deployment
   - Selecting "Redeploy"

## Other Required Environment Variables

Make sure you have all these environment variables set in your Vercel project:

- `DATABASE_URL`: Your PostgreSQL connection string (as described above)
- `NEXTAUTH_SECRET`: A secure random string for NextAuth.js
- `NEXTAUTH_URL`: Your production URL (e.g., `https://your-app.vercel.app`)
- `GOOGLE_API_KEY`: Your Google API key for Gemini AI
- `GEMINI_API_KEY`: Your Gemini API key (if different from GOOGLE_API_KEY)

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