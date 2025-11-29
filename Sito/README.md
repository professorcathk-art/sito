# Sito - Global Industry Experts Directory

Sito (師徒) is a modern directory platform connecting industry experts with users seeking mentorship, career guidance, and professional advice.

## Features

- **Modern Landing Page** - Beautiful, professional design with category-based navigation
- **Expert Directory** - Browse and search for industry experts across various categories
- **User Authentication** - Full Supabase authentication with registration and login
- **Profile Management** - Experts can create and manage their profiles
- **Marketplace Listing** - Optional public listing on the marketplace
- **Messaging System** - Connect and communicate with experts
- **Category Filtering** - Find experts by industry categories
- **Protected Routes** - Authentication middleware for secure pages

## Categories

- Website Development
- Software Development
- Trading
- Entrepreneur
- Design
- Marketing

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **TailwindCSS** - Modern styling
- **Supabase** - Database and authentication (fully integrated)

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
   - Create a `.env.local` file in the root directory
   - Add your Supabase credentials (see `SUPABASE_SETUP.md` for details)

3. Set up the database:
   - Run the SQL migration in Supabase Dashboard (see `SUPABASE_SETUP.md`)

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
/app
  /dashboard       - User dashboard
  /directory       - Expert directory listing
  /expert/[id]     - Individual expert profile pages
  /login           - Login page
  /register        - Registration page
  /messages        - Messaging interface
  /profile/setup   - Profile setup page
/components        - Reusable React components
```

## Supabase Setup

See `SUPABASE_SETUP.md` for detailed instructions on:
- Database schema setup
- Running migrations
- Configuring authentication
- Security policies

## Next Steps

- Add real-time messaging functionality
- Implement connection/network features
- Add profile editing capabilities
- Enhance search and filtering
- Add email verification

## License

Private project

