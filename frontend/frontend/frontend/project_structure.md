# Project Structure

## Overview
The Job Seeking App follows a modern full-stack architecture with a monorepo structure. The application has been migrated to use Supabase for database operations and authentication, eliminating the need for a separate backend API in production.

## Root Directory Structure

```
job-seeking-app/
├── 📁 backend/              # Legacy Express.js API (for development/local use)
├── 📁 frontend/             # Next.js React application
├── 📁 .git/                 # Git version control
├── 📁 .github/              # GitHub Actions and workflows
├── 📁 node_modules/         # Root dependencies
├── 📄 package.json          # Root package configuration
├── 📄 .gitignore           # Git ignore rules
├── 📄 README.md            # Main project documentation
└── 📄 *.md                 # Various documentation files
```

## Frontend Structure (`/frontend`)

The frontend is built with Next.js 16.1.6 using the App Router architecture.

```
frontend/
├── 📁 app/                     # Next.js App Router pages and layouts
│   ├── 📁 admin/              # Admin dashboard pages
│   ├── 📁 auth-success/       # Authentication success page
│   ├── 📁 browse-workers/     # Worker discovery page
│   ├── 📁 choose-role/        # User role selection
│   ├── 📁 client-profile/     # Client profile management
│   ├── 📁 forgot-password/    # Password recovery
│   ├── 📁 jobs/               # Job listings and details
│   ├── 📁 login/              # User authentication
│   ├── 📁 profile/            # User profile pages
│   ├── 📁 register/           # User registration
│   ├── 📁 reset-password/     # Password reset
│   ├── 📁 saved-jobs/         # Saved job bookmarks
│   ├── 📁 verify-email/       # Email verification
│   ├── 📁 worker/             # Worker-specific pages
│   ├── 📁 worker-profile/     # Worker profile management
│   ├── 📁 workers/            # Worker listings
│   ├── 📄 globals.css         # Global CSS styles
│   ├── 📄 layout.js           # Root layout component
│   └── 📄 page.js             # Home page
├── 📁 components/             # Reusable React components
│   ├── 📄 AdminChangePassword.js
│   ├── 📄 AdminReviewsManagement.js
│   ├── 📄 ClientRatingsDisplay.js
│   ├── 📄 DeclineReasonModal.js
│   ├── 📄 JobCard.js
│   ├── 📄 Modal.js
│   ├── 📄 Navbar.js
│   ├── 📄 RatingModal.js
│   ├── 📄 RatingsDisplay.js
│   ├── 📄 SearchBar.js
│   ├── 📄 WorkerCard.js
│   ├── 📄 WorkerRatingsDisplay.js
│   └── 📄 WorkerSearchBar.js
├── 📁 context/                # React Context providers
│   └── 📄 LanguageContext.js  # Internationalization context
├── 📁 hooks/                  # Custom React hooks
│   └── 📄 useAuth.js          # Authentication hook
├── 📁 lib/                    # Utility libraries and configurations
│   ├── 📄 apiClient.js        # Legacy API client (being phased out)
│   ├── 📄 completionClient.js # Completion-related utilities
│   ├── 📄 supabase.js         # Supabase client configuration
│   ├── 📄 togoData.js         # Togo-specific data/constants
│   └── 📄 translations.js     # Internationalization strings
├── 📁 public/                 # Static assets
│   └── 📄 (images, icons, etc.)
├── 📄 next.config.js          # Next.js configuration
├── 📄 jsconfig.json           # JavaScript project configuration
├── 📄 package.json            # Frontend dependencies
├── 📄 postcss.config.js       # PostCSS configuration
├── 📄 tailwind.config.js      # Tailwind CSS configuration
└── 📄 .env.local             # Environment variables (local)
```

## Backend Structure (`/backend`) - Legacy

The backend was originally built with Express.js but has been largely replaced by Supabase direct database operations. It's kept for development purposes and potential future API needs.

```
backend/
├── 📁 config/                 # Configuration files
│   ├── 📄 database.js         # Database connection (Sequelize)
│   ├── 📄 email.js            # Email service configuration
│   └── 📄 passport.js         # Authentication configuration
├── 📁 controllers/            # Business logic controllers
│   ├── 📄 adminController.js
│   ├── 📄 authController.js
│   ├── 📄 completionController.js
│   └── 📄 jobController.js
├── 📁 middleware/             # Express middleware
│   └── 📄 auth.js             # Authentication middleware
├── 📁 migrations/             # Database migration scripts
│   ├── 📄 add_admin_fields.js
│   ├── 📄 add_completion_and_ratings.js
│   ├── 📄 add_email_verification_and_password_reset.js
│   ├── 📄 add_phone_number.js
│   ├── 📄 add_phone_unique_constraint.js
│   ├── 📄 add_portfolio_field.js
│   ├── 📄 add_rater_type_to_ratings.js
│   ├── 📄 add_user_type_check_constraint.js
│   ├── 📄 add_worker_fields_and_reviews.js
│   ├── 📄 create_database.js
│   ├── 📄 init.js
│   ├── 📄 modify_profile_picture_column.js
│   ├── 📄 seed_worker.js
│   └── 📄 set_is_worker_from_user_type.js
├── 📁 models/                 # Sequelize database models
│   └── 📄 User.js             # User model definition
├── 📁 routes/                 # API route definitions
│   ├── 📄 admin.js
│   ├── 📄 applications.js
│   ├── 📄 auth.js
│   ├── 📄 completion.js
│   ├── 📄 jobs.js
│   └── 📄 users.js
├── 📄 server.js               # Main Express server file
├── 📄 package.json            # Backend dependencies
└── 📄 (other config files)
```

## Database Schema (Supabase)

### Core Tables

#### `users`
- **Purpose**: Stores all user information (clients and workers)
- **Key Fields**:
  - `id` (Primary Key)
  - `email`, `first_name`, `last_name`
  - `phone_number` (Togo-specific)
  - `user_type` ('client' or 'worker')
  - `is_worker` (boolean flag)
  - Worker-specific: `job_title`, `location`, `bio`, `years_experience`
  - `services` (JSONB array of skills)
  - `portfolio` (JSONB array of image URLs)
  - `completed_jobs`, `rating`

#### `jobs`
- **Purpose**: Job postings created by clients
- **Key Fields**:
  - `id`, `title`, `description`, `budget`
  - `client_id` (Foreign Key to users)
  - `location`, `category`, `status`
  - `created_at`, `updated_at`

#### `applications`
- **Purpose**: Job applications from workers
- **Key Fields**:
  - `id`, `job_id`, `worker_id`
  - `status` ('pending', 'accepted', 'declined', 'completed')
  - `proposed_price`, `message`
  - `created_at`

#### `reviews`
- **Purpose**: Ratings and reviews for completed work
- **Key Fields**:
  - `id`, `worker_id`, `client_id`, `job_id`
  - `rating` (1-5 stars), `comment`
  - `rater_type` ('client' or 'worker')
  - `created_at`

#### `completions`
- **Purpose**: Track job completion and final details
- **Key Fields**:
  - `id`, `job_id`, `worker_id`, `client_id`
  - `final_price`, `completion_date`
  - `notes`, `status`

## File Organization Principles

### Frontend Architecture
- **Component-based**: Each UI element is a reusable component
- **Page-based Routing**: App Router maps URLs to page components
- **Hook-based Logic**: Custom hooks encapsulate complex logic
- **Utility-first**: Helper functions and configurations in `/lib`

### Naming Conventions
- **Components**: PascalCase (e.g., `JobCard.js`, `UserProfile.js`)
- **Pages**: kebab-case for routes (e.g., `/client-profile/page.js`)
- **Hooks**: camelCase with `use` prefix (e.g., `useAuth.js`)
- **Utilities**: camelCase (e.g., `supabase.js`, `apiClient.js`)

### Import Organization
```javascript
// External libraries first
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// Internal modules
import Navbar from '@/components/Navbar';
import { useAuth } from '@/hooks/useAuth';

// Relative imports
import { formatDate } from '../utils/dateUtils';
```

## Development Workflow

### Local Development
1. **Frontend**: `cd frontend && npm run dev`
2. **Backend** (if needed): `cd backend && npm run dev`
3. **Database**: Supabase handles all database operations
4. **Environment**: Copy `.env.example` to `.env.local`

### Production Deployment
1. **Build**: `npm run build` in frontend directory
2. **Deploy**: `npx vercel --prod` for Vercel deployment
3. **Environment**: Set environment variables in Vercel dashboard
4. **Database**: Supabase handles production database

## Key Integration Points

### Supabase Integration
- **Client**: Configured in `frontend/lib/supabase.js`
- **Auth**: Handled by `frontend/hooks/useAuth.js`
- **Database**: Direct queries replace API calls
- **Real-time**: Subscription capabilities available

### Authentication Flow
1. User logs in via Supabase Auth
2. JWT token managed automatically
3. `useAuth` hook provides auth state
4. Protected routes check authentication status

### Data Flow
1. Components use Supabase client for data operations
2. No API layer - direct database queries
3. Real-time updates via Supabase subscriptions
4. Error handling at component level

## Configuration Files

### Next.js Configuration (`next.config.js`)
- Environment variable mapping
- Supabase URL and key configuration
- Build optimizations

### Tailwind Configuration (`tailwind.config.js`)
- Custom color schemes
- Responsive breakpoints
- Component configurations

### Package Management
- **Root**: Manages monorepo dependencies
- **Frontend**: Next.js and React dependencies
- **Backend**: Express.js and database dependencies

## Security Considerations

### Environment Variables
- Supabase keys prefixed with `NEXT_PUBLIC_` for client access
- Sensitive data never exposed to client
- Server-side operations handle sensitive data

### Authentication
- Supabase handles secure authentication
- JWT tokens managed automatically
- Role-based access control implemented

### Data Validation
- Client-side validation for user experience
- Server-side validation via Supabase RLS policies
- Input sanitization and SQL injection prevention

---

## Quick Reference

### Adding New Features
1. **Database**: Update Supabase schema if needed
2. **Component**: Create in `/components` or `/app/[route]`
3. **Logic**: Add to custom hooks if reusable
4. **Styling**: Use Tailwind classes consistently

### Common File Locations
- **New Page**: `frontend/app/[route]/page.js`
- **New Component**: `frontend/components/[ComponentName].js`
- **Database Query**: `frontend/lib/supabase.js` (add helper function)
- **Auth Logic**: `frontend/hooks/useAuth.js`
- **Styling**: Tailwind classes in component files

This structure provides a scalable, maintainable foundation for the Job Seeking App while supporting the migration to Supabase-based architecture.</content>
<parameter name="filePath">c:\Projects\job seaking app\project_structure.md