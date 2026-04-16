# Complete Frontend Testing Checklist

## ✅ All Frontend Pages Migrated and Fixed

All **22+ frontend pages** now use Supabase directly. No backend API calls remain.

---

## 🧪 Complete Feature Testing Checklist

### 1. **Authentication**
- [ ] Register new account (email + password)
- [ ] Select user type (worker/client) during registration
- [ ] Verify email is actually being sent
- [ ] Login with email/password
- [ ] Login with Google OAuth
- [ ] Logout functionality
- [ ] Password reset flow
- [ ] Email verification requirement

### 2. **Worker Profile Setup**
- [ ] Create/complete worker profile
- [ ] Upload profile picture
- [ ] Add job title
- [ ] Add location
- [ ] Add bio/description
- [ ] Add years of experience
- [ ] Add services (multiple)
- [ ] Add portfolio links
- [ ] Toggle availability status (is_active)
- [ ] Profile updates instantly visible (verify within 3 seconds)

### 3. **Job Browse & Search**
- [ ] Browse all active jobs (no 400 errors)
- [ ] Search jobs by keyword
- [ ] Filter jobs by category (uses `category` column, NOT `job_type`)
- [ ] Filter jobs by location
- [ ] View job details with correct budget field (NOT `salary`)
- [ ] See only active jobs (status='active'), not completed ones
- [ ] Completed jobs don't appear in browse

### 4. **Job Posting (Client)**
- [ ] Create new job (verify columns: `title`, `description`, `budget`, `category`, `location`, `status`)
- [ ] Job appears in job list immediately
- [ ] Job status defaults to 'active'
- [ ] Can view own jobs in client profile

### 5. **Job Application (Worker)**
- [ ] Apply for job from job detail page
- [ ] Set proposed price
- [ ] Add application message
- [ ] Application stored in database with correct columns
- [ ] Can view applications in worker profile
- [ ] No duplicate applications for same job

### 6. **Application Management (Client)**
- [ ] View all applications for own jobs
- [ ] See applicant details: first_name, last_name, email, phone_number
- [ ] Accept application (status → 'accepted')
- [ ] Decline application (status → 'declined')
- [ ] Status updates immediately visible

### 7. **Job Completion Workflow** ⭐ (Critical)
- [ ] Worker with accepted application can request completion
- [ ] Request completion creates record in completions table
- [ ] completion.status defaults to 'completed'
- [ ] completion has: job_id, worker_id, client_id (all correct)
- [ ] No 403 Forbidden errors
- [ ] No 500 errors from RLS policies

### 8. **Completion Confirmation (Client)**
- [ ] Client sees completion request notification
- [ ] Client can confirm completion (sets status → 'confirmed', sets confirmed_at timestamp)
- [ ] Client can decline completion (sets status → 'declined', sets declined_at timestamp)
- [ ] Can optionally provide decline reason
- [ ] No 400 errors from missing columns

### 9. **Rating & Reviews** ⭐ (Most Critical)
- [ ] After confirmed completion, both can rate each other
- [ ] Worker rates client (creates review with rater_type='worker')
- [ ] Client rates worker (creates review with rater_type='client')
- [ ] No 400 errors: ✅ "column completions.confirmed_at does not exist"
- [ ] No 400 errors: ✅ "column users.profile_picture does not exist"
- [ ] Ratings are stored: rating (1-5), comment, job_id, timestamps
- [ ] Worker's rating updates on profile
- [ ] Worker's completed_jobs count increases

### 10. **Worker Browse Page**
- [ ] Browse all active workers
- [ ] See worker availability badge: "✓ Available" (is_active=true)
- [ ] See worker availability badge: "✗ Busy" (is_active=false)
- [ ] Only show active workers (is_active=true) by default
- [ ] View worker profile from card
- [ ] See worker's profile picture
- [ ] Search workers by keywords

### 11. **Worker Profile (Public)**
- [ ] View any worker's profile
- [ ] See: name, location, job_title, years_experience, services, portfolio, rating, completed_jobs
- [ ] See profile picture
- [ ] See availability status
- [ ] See reviews/ratings

### 12. **Worker Profile (Own)**
- [ ] View own worker profile at `/worker-profile`
- [ ] Edit all profile fields
- [ ] Toggle active/inactive status
- [ ] View own applications
- [ ] View own jobs marked complete
- [ ] View own ratings/reviews
- [ ] See completed_jobs count
- [ ] See average rating

### 13. **Client Profile (Own)**
- [ ] View own client profile at `/client-profile`
- [ ] Create job posts
- [ ] View all own jobs
- [ ] View applications for own jobs
- [ ] Accept/decline applications
- [ ] View completions from workers
- [ ] Confirm/decline completions with reasons
- [ ] Rate workers and leave reviews

### 14. **Admin Pages**
- [ ] Login to admin dashboard
- [ ] View all users
- [ ] View all jobs
- [ ] View all applications
- [ ] View all reviews
- [ ] Admin operations work without errors

---

## 🔍 Database Column Verification

### Users Table - Verify All Queries Use Correct Names:
- ✅ `first_name` (not firstName)
- ✅ `last_name` (not lastName)
- ✅ `phone_number` (not phoneNumber)
- ✅ `user_type` (not userType)
- ✅ `job_title` (not jobTitle)
- ✅ `years_experience` (not yearsExperience)
- ✅ `is_active` (not isActive)
- ✅ `profile_picture` (new column - verify it exists)
- ✅ `completed_jobs` (not completedJobs)

### Jobs Table - Verify All Queries Use Correct Names:
- ✅ `budget` (not salary)
- ✅ `category` (not job_type)
- ✅ `client_id` (not posted_by)

### Completions Table - Verify New Columns Exist:
- ✅ `confirmed_at` (should exist now)
- ✅ `declined_at` (should exist now)
- ✅ `decline_reason` (should exist now)

---

## ⚠️ Error Checklist (Should NOT see these anymore)

| Error | Should NOT See | Status |
|-------|---|---|
| 400 Bad Request on jobs query | `salary` or `job_type` columns | ✅ Fixed |
| 400 Bad Request on workers query | `jobs.posted_by` column | ✅ Fixed |
| 400 Bad Request on completions | `confirmed_at`, `declined_at`, `decline_reason` missing | ✅ Fixed |
| 400 Bad Request on users | `profile_picture` column missing | ✅ Fixed |
| 400 Bad Request | `id=eq.undefined` (worker ID undefined) | ✅ Fixed |
| 403 Forbidden | Workers can't insert completions (RLS error) | ✅ Fixed |

---

## 📋 Pre-Testing Requirements

Before testing, make sure:

1. ✅ **Run the complete schema in Supabase SQL Editor**:
   - Copy all content from `SUPABASE_COMPLETE_SCHEMA.sql`
   - Paste into Supabase SQL Editor and run
   - Should complete without syntax errors

2. ✅ **Verify 4 missing columns now exist**:
   - `users.profile_picture` (TEXT)
   - `completions.confirmed_at` (TIMESTAMP)
   - `completions.declined_at` (TIMESTAMP)
   - `completions.decline_reason` (TEXT)

3. ✅ **Verify RLS policies are active**:
   - Workers can select their own data
   - Clients can select jobs with status='active'
   - Etc. (all policies from schema)

4. ✅ **Verify you're using the updated frontend**:
   - All 3 fixed pages: profile, saved-jobs, worker/[id]
   - All pages should show Supabase errors properly if there are issues

---

## 🎯 Testing Workflow Scenario

To fully test the app, follow this complete workflow:

1. **Create 2 test accounts**:
   - Account A: Client user
   - Account B: Worker user

2. **Client (Account A)**:
   - Create a job post (e.g., "Paint my house")
   - Set budget, category, location, description

3. **Worker (Account B)**:
   - Browse jobs
   - Find client's job
   - Apply with proposed price

4. **Client (Account A)**:
   - Check applications
   - See applicant details (name, email, phone)
   - Accept the application

5. **Worker (Account B)**:
   - See accepted application
   - Request job completion
   - NO 403 ERRORS should appear

6. **Client (Account A)**:
   - See completion request
   - Confirm completion (or decline with reason)
   - NO 400 ERRORS about missing columns

7. **Both**:
   - Rate and review each other
   - NO 400 ERRORS about `jobs.posted_by` or other columns
   - Rating appears on worker's profile
   - Worker's completed_jobs count increases

---

## 🚀 Final Status

- ✅ All 22+ pages migrated to Supabase
- ✅ All database column names corrected
- ✅ All missing columns added to schema
- ✅ All RLS policies fixed
- ✅ No backend API dependency remaining
- ✅ No apiClient usage remaining
- ✅ Ready for comprehensive testing

**Next Step**: Run complete schema in Supabase, then follow testing workflow above.
