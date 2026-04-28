# Admin Review Management & CI/CD Implementation

## Overview
This document describes the new features added to the job seeking app:
1. **Admin Review Management System** - Admins can now view, edit, and delete all user reviews
2. **CI/CD Pipeline** - Automated testing and deployment workflow using GitHub Actions

---

## Part 1: Admin Review Management System

### Backend Implementation

#### 1. New Admin Controller Functions
File: `backend/controllers/adminController.js`

Added three new functions to manage reviews:

- **`getAllReviews()`** - Retrieve all reviews with filtering and pagination
  - Parameters: 
    - `workerId` - Filter by worker (optional)
    - `raterId` - Filter by rater (optional)
    - `page` - Page number (default: 1)
    - `limit` - Results per page (default: 10)
    - `sortBy` - Sort field: `rating`, `created_at`, `id` (default: created_at)
    - `order` - Sort order: `ASC`, `DESC` (default: DESC)

- **`updateReview()`** - Update a review's rating and/or text
  - Parameters:
    - `reviewId` - The review ID
    - `rating` - New rating (1-5)
    - `review` - New review text
  - Auto-recalculates worker's average rating

- **`deleteReview()`** - Delete a review permanently
  - Parameters: `reviewId`
  - Auto-recalculates worker's average rating after deletion

#### 2. New Admin Routes
File: `backend/routes/admin.js`

Added three new protected routes (admin only):

```
GET    /api/admin/reviews                 - Get all reviews with filters
PATCH  /api/admin/reviews/:reviewId       - Update a review
DELETE /api/admin/reviews/:reviewId       - Delete a review
```

All routes require:
- Valid JWT token in Authorization header
- Admin privileges (verified via checkAdmin middleware)

### API Endpoints

#### Get All Reviews
```
GET /api/admin/reviews?page=1&limit=10&sortBy=created_at&order=DESC&workerId=123&raterId=456
Authorization: Bearer <adminToken>

Response:
{
  "reviews": [
    {
      "id": 1,
      "rating": 5,
      "review": "Great work!",
      "ratee_first_name": "John",
      "ratee_last_name": "Doe",
      "rater_first_name": "Jane",
      "rater_last_name": "Smith",
      "job_title": "Web Development",
      "created_at": "2024-01-15T10:30:00Z",
      ...
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalReviews": 50,
    "limit": 10
  }
}
```

#### Update Review
```
PATCH /api/admin/reviews/:reviewId
Authorization: Bearer <adminToken>
Content-Type: application/json

Request Body:
{
  "rating": 4,
  "review": "Updated review text"
}

Response:
{
  "message": "Review updated successfully",
  "review": { ...updated review data }
}
```

#### Delete Review
```
DELETE /api/admin/reviews/:reviewId
Authorization: Bearer <adminToken>

Response:
{
  "message": "Review deleted successfully"
}
```

### Frontend Implementation

#### New Component: AdminReviewsManagement
File: `frontend/components/AdminReviewsManagement.js`

Features:
- Display all reviews in a sortable, paginated table
- Filter reviews by worker ID and rater ID
- Sort by rating, date, or ID
- Edit review rating and text with a modal dialog
- Delete reviews with confirmation
- Real-time updates with loading and error states
- Responsive design using Tailwind CSS

#### New Admin Page: Reviews Management
File: `frontend/app/admin/reviews/page.js`

- Requires admin authentication
- Displays AdminReviewsManagement component
- Includes navigation header with links to other admin pages
- Protected route redirects to login if not authenticated

#### Navigation Updates
Updated `frontend/app/admin/dashboard/page.js`:
- Added "Reviews" link in navbar
- Added "Manage Reviews" quick action card

### Usage Instructions

#### For Admins:

1. **Access Reviews Management Page**
   - Navigate to `/admin/reviews` (requires admin login)

2. **View All Reviews**
   - Reviews are displayed in a table with pagination
   - Shows: Rating, Worker Name, Rater Name, Review Text, Job Title, Date

3. **Filter Reviews**
   - Enter Worker ID to filter by worker
   - Enter Rater ID to filter by rater
   - Click "Reset" to clear filters

4. **Sort Reviews**
   - Click "Sort By" dropdown to choose sort field (Date, Rating, ID)
   - Click "Order" dropdown to choose direction (Newest First, Oldest First)

5. **Edit a Review**
   - Click "Edit" button on any review
   - Modal opens with current rating and text
   - Make changes and click "Save Changes"
   - Worker's average rating auto-updates

6. **Delete a Review**
   - Click "Delete" button on any review
   - Confirm deletion
   - Review is permanently removed
   - Worker's average rating auto-updates

---

## Part 2: CI/CD Pipeline

### GitHub Actions Workflows

Two workflow files have been created in `.github/workflows/`:

#### 1. CI/CD Workflow (`ci-cd.yml`)
Runs on every push and pull request to main/develop branches.

**Jobs:**
- **Backend CI**
  - Sets up Node.js 18 with npm cache
  - Spins up PostgreSQL test database
  - Installs backend dependencies
  - Runs ESLint checks
  - Runs unit/integration tests
  - Builds backend

- **Frontend CI**
  - Sets up Node.js 18 with npm cache
  - Installs frontend dependencies
  - Runs ESLint checks
  - Runs Jest tests
  - Builds Next.js application
  - Uploads build artifacts

- **Security Scan**
  - Runs npm audit on backend dependencies
  - Runs npm audit on frontend dependencies
  - Reports high/moderate vulnerabilities

- **Code Quality Check**
  - ESLint verification
  - Common vulnerability detection

- **Deployment Ready**
  - Final check that all jobs passed
  - Creates deployment summary

#### 2. Deployment Workflow (`deploy.yml`)
Automatically runs when pushing to main branch (after CI passes).

**Features:**
- Builds both backend and frontend for production
- Supports deployment to custom servers via SSH
- Requires deployment secrets to be configured

### Setup Instructions

#### Step 1: Configure GitHub Secrets

Go to your repository settings → Secrets and variables → Actions, and add:

**For CI/CD Pipeline:**
- `DB_USER` - PostgreSQL test user (optional, defaults to testuser)
- `DB_PASSWORD` - PostgreSQL test password (optional, defaults to testpass)
- `DB_NAME` - PostgreSQL test database (optional, defaults to job_seekers_test)

**For Deployment (Optional):**
- `DEPLOY_KEY` - SSH private key for server access
- `DEPLOY_HOST` - Deployment server hostname/IP
- `DEPLOY_USER` - Deployment user on server
- `DEPLOY_PATH` - Backend deployment path on server
- `DEPLOY_FRONTEND_PATH` - Frontend deployment path on server
- `NEXT_PUBLIC_API_URL` - Production API URL (e.g., https://api.example.com)

#### Step 2: Update package.json Files

**Backend** (`backend/package.json`):
Ensure these scripts exist:
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest --runInBand --detectOpenHandles",
    "lint": "eslint ."
  }
}
```

**Frontend** (`frontend/package.json`):
Ensure these scripts exist:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest --watch"
  }
}
```

#### Step 3: Create ESLint Configuration (Optional but Recommended)

**Backend** (`.eslintrc.json`):
```json
{
  "env": {
    "node": true,
    "es2021": true
  },
  "extends": "eslint:recommended",
  "parserOptions": {
    "ecmaVersion": "latest"
  },
  "rules": {
    "indent": ["error", 4],
    "linebreak-style": ["error", "unix"],
    "quotes": ["error", "single"],
    "semi": ["error", "always"]
  }
}
```

**Frontend** (`.eslintrc.json`):
```json
{
  "env": {
    "browser": true,
    "es2021": true,
    "node": true
  },
  "extends": [
    "eslint:recommended",
    "next/core-web-vitals"
  ]
}
```

#### Step 4: Enable GitHub Actions

1. Go to repository → Settings → Actions
2. Select "Allow all actions and reusable workflows"
3. Save

### Workflow Triggers

**CI/CD Pipeline:**
- Push to main or develop branch
- Pull requests to main or develop branch

**Deployment:**
- Push to main branch (only runs if CI passes)
- Disabled by continue-on-error

### Monitoring Workflow Status

1. Go to repository → Actions tab
2. Click on a workflow run to see details
3. Each job shows logs with timestamps
4. GitHub automatically creates check marks next to commits

### Best Practices

1. **Write Tests**
   - Add unit tests for new backend routes
   - Add component tests for new frontend components
   - Tests run automatically in CI

2. **Code Review**
   - Always create pull requests before merging to main
   - Workflows run automatically on PRs
   - Merge only when all checks pass

3. **Commit Messages**
   - Use clear, descriptive commit messages
   - Include type: feat, fix, docs, test, refactor, etc.

4. **Security**
   - Npm audit runs automatically
   - Review vulnerability reports
   - Update dependencies regularly

5. **Documentation**
   - Update README when adding features
   - Keep API documentation current
   - Document environment variables

### Troubleshooting

**Tests Failing:**
- Check test script in package.json
- Verify database connection in tests
- Review test output in Actions logs

**Build Failing:**
- Check for syntax errors
- Verify all dependencies in package.json
- Ensure Node.js 18 compatibility

**Deployment Not Working:**
- Verify deployment secrets are correct
- Check server SSH connectivity
- Review deployment logs

---

## Documentation Files

### CI/CD Setup Guide
File: `CI_CD_SETUP.md`
- Comprehensive setup instructions
- Configuration examples
- troubleshooting guide
- Advanced setup options

---

## Summary of Changes

### Files Modified:
1. `backend/controllers/adminController.js` - Added review management functions
2. `backend/routes/admin.js` - Added review management routes
3. `frontend/app/admin/dashboard/page.js` - Added navigation and links

### Files Created:
1. `.github/workflows/ci-cd.yml` - CI/CD workflow
2. `.github/workflows/deploy.yml` - Deployment workflow
3. `frontend/components/AdminReviewsManagement.js` - Review management component
4. `frontend/app/admin/reviews/page.js` - Reviews admin page
5. `CI_CD_SETUP.md` - CI/CD setup documentation

---

## Testing

### Local Testing

**Backend Review Endpoints:**
```bash
# Test with curl
curl -X GET http://localhost:5000/api/admin/reviews \
  -H "Authorization: Bearer <adminToken>"

# Update review
curl -X PATCH http://localhost:5000/api/admin/reviews/1 \
  -H "Authorization: Bearer <adminToken>" \
  -H "Content-Type: application/json" \
  -d '{"rating": 4, "review": "Updated text"}'

# Delete review
curl -X DELETE http://localhost:5000/api/admin/reviews/1 \
  -H "Authorization: Bearer <adminToken>"
```

**Frontend Review Management:**
1. Log in as admin
2. Navigate to `/admin/reviews`
3. Test filtering, sorting, editing, and deletion

---

## Next Steps

1. Deploy code to GitHub repository
2. Configure GitHub secrets
3. Create pull request to trigger CI
4. Monitor workflow status
5. Set up deployment infrastructure
6. Configure deployment secrets
7. Test full CI/CD pipeline

---

## Support & Questions

For detailed setup instructions, see: `CI_CD_SETUP.md`

For API documentation, see: `IMPLEMENTATION_COMPLETE.md`

For GitHub Actions docs: https://docs.github.com/en/actions
