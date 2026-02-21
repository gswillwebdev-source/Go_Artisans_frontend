# Job Seeking App

A full-stack job seeking platform built with **Next.js (Frontend)**, **Node.js/Express (Backend)**, and **PostgreSQL (Database)**.

## 📁 Project Structure

```
job-seeking-app/
├── frontend/          # Next.js React frontend
│   ├── app/          # App directory (pages, layouts)
│   ├── components/   # Reusable components
│   ├── lib/          # Utilities and API client
│   └── package.json
├── backend/          # Node.js Express backend
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
- **PostgreSQL** (v12+)
- **npm** or **yarn**

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Update .env with your PostgreSQL credentials
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=job_seeking_app
# DB_USER=postgres
# DB_PASSWORD=job
# PORT=5000
# JWT_SECRET=your_jwt_secret_key_here

# Create database
createdb job_seeking_app

# Run migrations to create tables
npm run migrate

# Start backend server
npm run dev
```

Backend will run on `http://localhost:5000`

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local file (optional, defaults to http://localhost:5000)
echo "NEXT_PUBLIC_API_URL=http://localhost:5000" > .env.local

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

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

### Jobs
- `GET /api/jobs` - Get all jobs
- `GET /api/jobs/:id` - Get job details
- `GET /api/jobs/search?keyword=...&location=...&jobType=...` - Search jobs
- `POST /api/jobs` - Post a job (authenticated)
- `PUT /api/jobs/:id` - Update job (authenticated)
- `DELETE /api/jobs/:id` - Delete job (authenticated)

### Applications
- `POST /api/applications` - Apply for a job (authenticated)
- `GET /api/applications/my-applications` - Get user's applications (authenticated)
- `GET /api/applications/:id` - Get application details (authenticated)
- `PUT /api/applications/:id` - Update application status (authenticated)

### Users
- `GET /api/users/profile` - Get user profile (authenticated)
- `PUT /api/users/profile` - Update user profile (authenticated)

## 🗄️ Database Schema

### Users Table
- `id` - Primary key
- `email` - Unique email
- `password` - Hashed password
- `first_name` - First name
- `last_name` - Last name
- `user_type` - job_seeker or employer
- `created_at`, `updated_at` - Timestamps

### Jobs Table
- `id` - Primary key
- `title` - Job title
- `description` - Job description
- `location` - Job location
- `job_type` - Full-time, Part-time, Contract, Remote
- `salary` - Salary range
- `posted_by` - User ID of employer
- `created_at`, `updated_at` - Timestamps

### Applications Table
- `id` - Primary key
- `job_id` - Job ID
- `user_id` - Applicant user ID
- `resume_url` - Link to resume
- `cover_letter` - Application cover letter
- `status` - pending, accepted, rejected
- `created_at`, `updated_at` - Timestamps

### Saved Jobs Table
- `id` - Primary key
- `user_id` - User ID
- `job_id` - Job ID
- `created_at` - Timestamp

## 🛠️ Tech Stack

**Frontend:**
- Next.js 14
- React 18
- Tailwind CSS
- Axios for API calls
- Zustand for state management

**Backend:**
- Node.js
- Express.js
- PostgreSQL
- JWT for authentication
- Bcrypt for password hashing

## 📝 Environment Variables

### Backend (.env)
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=job_seeking_app
DB_USER=postgres
DB_PASSWORD=your_password
PORT=5000
NODE_ENV=development
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRY=7d
CORS_ORIGIN=http://localhost:3000
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## 🔐 Authentication Flow

1. User registers with email and password
2. Backend hashes password and stores in database
3. Backend generates JWT token
4. Frontend stores token in localStorage
5. Subsequent requests include token in Authorization header
6. Backend verifies token before processing requests

## 🚢 Deployment

### Frontend (Vercel)
```bash
cd frontend
npm run build
vercel deploy
```

### Backend (Heroku/Railway)
```bash
cd backend
npm run build
# Deploy using platform CLI
```

## 📚 Next Steps

- [ ] Add file upload for resumes
- [ ] Implement email notifications
- [ ] Add admin dashboard
- [ ] Implement job recommendations
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
