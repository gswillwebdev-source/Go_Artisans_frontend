# Job Seeking App

A full-stack job seeking platform built with **Next.js (Frontend)**, **Supabase (Database)**, and **Supabase Auth (Authentication)**.

## 📁 Project Structure

```
job-seeking-app/
├── frontend/          # Next.js React frontend
│   ├── app/          # App directory (pages, layouts)
│   ├── components/   # Reusable components
│   ├── lib/          # Utilities and Supabase client
│   └── package.json
├── backend/          # Legacy Express.js API (for development)
│   ├── routes/       # API route handlers
│   ├── controllers/  # Business logic
│   ├── models/       # Database models
│   ├── middleware/   # Auth and custom middleware
│   ├── config/       # Database configuration
│   ├── migrations/   # Database migrations
│   └── package.json
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v18+)
- **npm** or **yarn**
- **Supabase account** (for database and auth)

### 1. Supabase Setup
1. Create a new project at [supabase.com](https://supabase.com)
2. Run the SQL schema from `supabase_schema.sql` in your Supabase SQL Editor
3. Get your project URL and anon key from Settings > API

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local file
echo "NEXT_PUBLIC_SUPABASE_URL=your_supabase_url" > .env.local
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key" >> .env.local

# Start frontend development server
npm run dev
```

Frontend will run on `http://localhost:3000`

## 📋 Features

### User Management
- ✅ User registration (Job Seeker / Employer)
- ✅ Login with JWT authentication
- ✅ User profiles
- ✅ Password hashing with bcrypt

### Job Listings
- ✅ Browse all available jobs
- ✅ Search jobs by title, location, and type
- ✅ Filter jobs (Full-time, Part-time, Contract, Remote)
- ✅ View job details

### Job Applications
- ✅ Apply for jobs
- ✅ Track application status
- ✅ Save favorite jobs

### Employer Features
- ✅ Post job listings
- ✅ View applications
- ✅ Manage job postings

## 🔌 Database Operations

The app uses **Supabase** for all database operations and authentication. Data is accessed directly from the frontend using the Supabase JavaScript client.

### Authentication
- **Supabase Auth**: Email/password and Google OAuth
- **Real-time**: Automatic session management
- **Security**: Row Level Security (RLS) policies

### Database Tables
- **users**: User profiles (clients/workers)
- **jobs**: Job postings
- **applications**: Job applications
- **reviews**: User reviews and ratings
- **completions**: Job completion tracking

### Key Features
- ✅ Direct database queries (no API layer)
- ✅ Real-time subscriptions
- ✅ Built-in authentication
- ✅ File storage for portfolios

## �️ Tech Stack

**Frontend:**
- Next.js 16.1.6 with App Router
- React 18
- Tailwind CSS
- Supabase JavaScript Client

**Database & Backend:**
- Supabase (PostgreSQL)
- Supabase Auth (JWT-based)
- Supabase Storage
- Row Level Security (RLS)

**Deployment:**
- Vercel (Frontend)
- Supabase (Database & Auth)
```

## 🔐 Authentication Flow

1. User registers with Supabase Auth (email/password or Google OAuth)
2. Supabase handles password hashing and JWT generation
3. Frontend uses Supabase client for session management
4. All database operations respect Row Level Security (RLS) policies
5. Real-time authentication state updates

## 🚢 Deployment

### Frontend (Vercel)
```bash
cd frontend
npm run build
vercel deploy
```

### Database (Supabase)
- Database is hosted on Supabase
- No separate backend deployment needed
- All operations are client-side

## 📚 Features

- ✅ User registration and login
- ✅ Google OAuth integration
- ✅ Client and worker profiles
- ✅ Job posting and browsing
- ✅ Application management
- ✅ Rating and review system
- ✅ Real-time updates
- ✅ Multi-language support
- ✅ Admin dashboard
- [ ] Add messaging between users
- [ ] Mobile app with React Native
- [ ] Add unit and integration tests
- [ ] Implement analytics

## 📞 Support

For issues or questions, please create an issue in the repository.

## 📄 License

MIT License - feel free to use this project for personal and commercial purposes.

---

Happy job seeking! 🎉
