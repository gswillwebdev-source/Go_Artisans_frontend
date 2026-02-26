# CI/CD Pipeline Setup Guide

## Overview

This project includes automated CI/CD pipelines using GitHub Actions to ensure code quality, security, and seamless deployments.

## Workflows

### 1. **CI/CD Pipeline** (`ci-cd.yml`)
Runs on every push and pull request to main/develop branches.

**Jobs:**
- **Backend CI**: Runs tests, linting, and validation on the backend
  - Node.js setup with npm cache
  - PostgreSQL database for testing
  - Code linting (ESLint)
  - Unit/integration tests
  - Build verification

- **Frontend CI**: Runs tests and builds the Next.js frontend
  - Node.js setup with npm cache
  - Code linting
  - Unit tests
  - Next.js build
  - Build artifacts upload

- **Security Scan**: npm audit for vulnerabilities
  - Backend dependencies scan
  - Frontend dependencies scan

- **Code Quality Check**: Code quality and standards
  - ESLint checks
  - Common vulnerability detection

### 2. **Deployment** (`deploy.yml`)
Automatically deploys to production on pushes to main branch.

**Features:**
- Builds both backend and frontend
- Requires deployment secrets to be configured
- Creates deployment summary report

## Setup Instructions

### Prerequisites
- GitHub repository created
- Backend and frontend with proper npm scripts
- Access to deployment infrastructure (optional)

### Step 1: Configure Environment Variables

Add the following secrets to your GitHub repository settings:

**For CI/CD Pipeline:**
- `DB_USER`: PostgreSQL test user (default: testuser)
- `DB_PASSWORD`: PostgreSQL test password (default: testpass)
- `DB_NAME`: PostgreSQL test database (default: job_seekers_test)

**For Deployment (Optional):**
- `DEPLOY_KEY`: SSH private key for server access
- `DEPLOY_HOST`: Deployment server hostname/IP
- `DEPLOY_USER`: Deployment user on server
- `DEPLOY_PATH`: Backend deployment path
- `DEPLOY_FRONTEND_PATH`: Frontend deployment path
- `NEXT_PUBLIC_API_URL`: Production API URL

### Step 2: Update Backend package.json

Ensure your backend `package.json` includes test and lint scripts:

```json
{
  "scripts": {
    "start": "node server.js",
    "test": "jest --runInBand --detectOpenHandles",
    "lint": "eslint .",
    "dev": "nodemon server.js"
  }
}
```

### Step 3: Update Frontend package.json

Ensure your frontend `package.json` includes these scripts:

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

### Step 4: Configure ESLint (Optional but Recommended)

**Backend ESLint** (`.eslintrc.json` in backend folder):
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

**Frontend ESLint** (`.eslintrc.json` in frontend folder):
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
  ],
  "rules": {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

### Step 5: Enable GitHub Actions

1. Go to your GitHub repository
2. Click **Settings** → **Actions** 
3. Select "Allow all actions and reusable workflows"
4. Save

## Workflow Triggers

### CI/CD Pipeline
- **Push to main/develop branches**
- **Pull requests to main/develop branches**

### Deployment
- **Automatic push to main branch** (after CI passes)

## How to Use

### Running Tests Locally

**Backend:**
```bash
cd backend
npm install
npm test
npm run lint
```

**Frontend:**
```bash
cd frontend
npm install
npm test
npm run lint
```

### Viewing GitHub Actions Results

1. Go to your repository
2. Click **Actions** tab
3. Select a workflow run to view details
4. Each job has its own logs

### Pushing Updates

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make changes and commit: `git commit -m "Add feature"`
3. Push to GitHub: `git push origin feature/your-feature`
4. Create a Pull Request
5. Workflows automatically run on the PR
6. Review results under the PR checks
7. Merge when all checks pass
8. Main branch automatically deploys (if deploy.yml is enabled)

## Troubleshooting

### Tests Failing
- Check backend/frontend have `test` script in package.json
- Ensure test database is configured
- View logs in GitHub Actions tab

### Build Failing
- Check for syntax errors in code
- Verify all dependencies are in package.json
- Check Node.js version compatibility (18+)

### Deployment Not Working
- Verify deployment secrets are set correctly
- Check server SSH access
- Review deployment workflow logs

## Best Practices

1. **Write Tests**: Add unit tests for new features
2. **Code Review**: Use PRs before merging to main
3. **Commit Regularly**: Make atomic commits
4. **Follow Style Guide**: Keep code style consistent
5. **Security**: Scan dependencies regularly
6. **Documentation**: Update README when needed

## Advanced Configuration

### Custom Docker Image
To build Docker images in CI:

```yaml
- name: Build Docker image
  run: |
    docker build -t myapp:${{ github.sha }} .
```

### Database Migrations
For automatic migrations on deployment:

```yaml
- name: Run migrations
  run: |
    cd backend
    npm run migrate
```

### Email Notifications
Add notification step for failed builds:

```yaml
- name: Send failure email
  if: failure()
  uses: dawidd6/action-send-mail@v3
  with:
    server_address: ${{ secrets.EMAIL_SERVER }}
    server_port: ${{ secrets.EMAIL_PORT }}
    username: ${{ secrets.EMAIL_USER }}
    password: ${{ secrets.EMAIL_PASS }}
    subject: Build Failed
    to: team@example.com
```

## Support

For issues or questions about the CI/CD setup, please:
1. Check GitHub Actions logs
2. Review workflow files in `.github/workflows/`
3. Consult GitHub Actions documentation: https://docs.github.com/en/actions

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Node.js Best Practices](https://nodejs.org/en/docs/guides/)
- [Next.js CI/CD](https://nextjs.org/docs/deployment)
