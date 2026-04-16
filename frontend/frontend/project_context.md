# Project Context

## Overview
The Job Seeking App is a comprehensive full-stack platform designed to connect clients with skilled workers and artisans, with a focus on the Togolese market. Built using modern web technologies, it provides a seamless experience for job posting, worker discovery, application management, and project completion tracking.

## Current Status
**Version**: 2.0.0 (Supabase Migration Complete)  
**Status**: ✅ Production Ready  
**Deployment**: Live at https://goartisans.online  
**Architecture**: Supabase-integrated full-stack application

## Technical Architecture

### Frontend
- **Framework**: Next.js 16.1.6 with App Router
- **Styling**: Tailwind CSS for responsive design
- **State Management**: React Context API and custom hooks
- **Authentication**: Supabase Auth with real-time state management
- **Database**: Direct Supabase queries (no API layer)
- **Deployment**: Vercel with automatic CI/CD

### Database & Backend
- **Database**: Supabase (PostgreSQL) with real-time capabilities
- **Authentication**: Supabase Auth (JWT-based)
- **File Storage**: Supabase Storage for portfolio images
- **Legacy Backend**: Express.js API available for development/local use

### Key Technologies
- **Frontend**: React 18, Next.js 16, Tailwind CSS
- **Database**: Supabase (PostgreSQL with real-time features)
- **Authentication**: Supabase Auth with Google OAuth
- **Deployment**: Vercel for frontend, configurable for backend
- **Languages**: JavaScript (ES6+), SQL for database operations

## Business Context

### Target Market
- **Primary**: Togo and West African markets
- **Users**: Local clients seeking skilled workers, artisans offering services
- **Focus**: Construction, electrical work, plumbing, and general artisan services
- **Language**: Bilingual support (English/French)

### User Roles
1. **Clients**: Individuals/businesses posting jobs and hiring workers
2. **Workers/Artisans**: Skilled professionals offering services
3. **Administrators**: Platform management and oversight

### Core Value Proposition
- **For Clients**: Easy access to verified, skilled local workers
- **For Workers**: Increased visibility and job opportunities
- **For Platform**: Sustainable marketplace with quality assurance

## Application Features

### Authentication & User Management
- Email/password and Google OAuth registration
- Email verification and password reset
- Role-based access (Client/Worker/Admin)
- Profile management with portfolio support

### Job Management
- Job posting with detailed requirements
- Application submission and management
- Status tracking and completion workflow
- Saved jobs and search functionality

### Worker Discovery
- Advanced search and filtering
- Public worker profiles with portfolios
- Rating and review system
- Service categorization

### Administrative Features
- User management dashboard
- Review moderation
- Platform analytics
- Content management

## Development Context

### Project Structure
- **Monorepo**: Separate frontend/backend with shared documentation
- **Modern Stack**: Latest versions of React, Next.js, and related tools
- **Scalable Architecture**: Component-based, hook-driven development
- **Production Ready**: Optimized builds and deployment pipelines

### Development Workflow
- **Version Control**: Git with feature branches
- **Code Quality**: ESLint, Prettier, and automated testing
- **CI/CD**: Automated deployment on code changes
- **Documentation**: Comprehensive guides and API references

### Migration History
- **Phase 1**: Initial Express.js + PostgreSQL setup
- **Phase 2**: Next.js frontend development
- **Phase 3**: Supabase migration (completed)
- **Current**: Production deployment and optimization

## Repository Information

### Repository Details
- **Name**: job-seeking-app (local) / Go_Artisans_frontend (GitHub)
- **Owner**: tresordelasunnah-cyber (local) / gswillwebdev-source (GitHub)
- **Default Branch**: main
- **Primary Language**: JavaScript
- **License**: Not specified

### Key Branches
- **main**: Production-ready code
- **development**: Feature development and testing
- **legacy**: Archive of pre-Supabase code

## Environment Configuration

### Local Development
```bash
# Frontend
cd frontend
npm install
cp .env.example .env.local
npm run dev

# Backend (optional for development)
cd backend
npm install
npm run dev
```

### Environment Variables
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://qgofshosxvunqbbycwyq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Legacy API (for development)
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Production Deployment
- **Platform**: Vercel
- **URL**: https://goartisans.online
- **Build Command**: `npm run build`
- **Environment**: Production environment variables configured

## Database Schema

### Core Entities
- **Users**: Client and worker profiles with authentication
- **Jobs**: Job postings with requirements and status
- **Applications**: Job applications and workflow
- **Reviews**: Rating and feedback system
- **Completions**: Job completion tracking

### Key Relationships
- Users can be clients or workers (or both)
- Clients create jobs, workers apply to jobs
- Applications link jobs to interested workers
- Reviews are associated with completed work
- Completions track final job outcomes

## Security & Compliance

### Authentication Security
- JWT-based authentication via Supabase
- Secure password hashing and validation
- Email verification for account security
- OAuth integration for social login

### Data Protection
- Client-side input validation
- Server-side data sanitization
- HTTPS encryption in production
- Secure environment variable management

### Access Control
- Role-based permissions (Client/Worker/Admin)
- Route protection and authentication checks
- Database-level security with Supabase RLS
- API rate limiting and abuse prevention

## Performance & Scalability

### Frontend Optimization
- Next.js automatic code splitting
- Image optimization and lazy loading
- Tailwind CSS purging for minimal bundle size
- Progressive Web App capabilities

### Database Performance
- Supabase automatic indexing
- Query optimization and caching
- Real-time subscriptions for live updates
- Connection pooling and load balancing

### Deployment Optimization
- Vercel edge network for global distribution
- Automatic scaling and performance monitoring
- CDN integration for static assets
- Build optimization and minification

## Testing & Quality Assurance

### Testing Strategy
- Manual testing for user workflows
- Integration testing for Supabase operations
- Performance testing for critical paths
- Cross-browser and device testing

### Code Quality
- ESLint for code consistency
- Prettier for code formatting
- TypeScript migration preparation
- Automated build verification

## Documentation Structure

### User Documentation
- **README.md**: Main project overview and setup
- **QUICK_START.md**: Fast setup guide
- **TESTING_GUIDE.md**: Testing procedures
- **SETUP_CHECKLIST.md**: Implementation checklist

### Developer Documentation
- **project_structure.md**: Detailed codebase organization
- **features.md**: Comprehensive feature list
- **instructions_for_ai.md**: AI assistant guidelines
- **changelog.md**: Version history and changes

### Technical Documentation
- **IMPLEMENTATION_COMPLETE.md**: Feature implementation status
- **CI_CD_SETUP.md**: Deployment and automation
- **WHATS_NEW.md**: Feature updates and roadmap

## Future Roadmap

### Short-term Goals (3-6 months)
- Mobile application development
- Advanced search and filtering
- Payment integration
- Messaging system between clients and workers

### Medium-term Goals (6-12 months)
- AI-powered job matching
- Advanced analytics dashboard
- Multi-language expansion
- Subscription tiers and premium features

### Long-term Vision (1-2 years)
- Multi-tenant marketplace
- International expansion
- Advanced verification systems
- API marketplace for integrations

## Team & Collaboration

### Development Team
- **Lead Developer**: Project maintainer
- **Contributors**: Open to community contributions
- **Review Process**: Code review required for all changes

### Communication
- **Issues**: GitHub Issues for bug reports and feature requests
- **Discussions**: GitHub Discussions for general questions
- **Documentation**: Comprehensive guides for onboarding

### Contribution Guidelines
- Follow existing code patterns and conventions
- Include tests for new features
- Update documentation for significant changes
- Use semantic commit messages

## Support & Maintenance

### Issue Tracking
- **Bug Reports**: Use GitHub Issues with detailed reproduction steps
- **Feature Requests**: GitHub Issues with use case descriptions
- **Security Issues**: Direct communication for security concerns

### Maintenance Schedule
- **Regular Updates**: Bi-weekly dependency updates
- **Security Patches**: Immediate response to security vulnerabilities
- **Feature Releases**: Monthly feature updates
- **Bug Fixes**: As needed with priority assessment

---

## Quick Reference

### Getting Started
1. Clone repository
2. Install dependencies (`npm install` in frontend)
3. Configure environment variables
4. Run development server (`npm run dev`)
5. Access at `http://localhost:3000`

### Key Commands
```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server

# Deployment
npx vercel --prod       # Deploy to production
npx vercel              # Deploy to preview

# Database
# Supabase operations via dashboard or CLI
```

### Important URLs
- **Production**: https://goartisans.online
- **Supabase Dashboard**: https://supabase.com/dashboard/project/qgofshosxvunqbbycwyq
- **Vercel Dashboard**: https://vercel.com/gswillwebdev-sources-projects/go_artisans_1

This context provides a comprehensive foundation for understanding, maintaining, and extending the Job Seeking App. The project is designed to be scalable, maintainable, and user-friendly while serving the growing needs of the Togolese artisan marketplace.</content>
<parameter name="oldString"># Project Context

This repository implements a job seekers application with front-end built using Next.js and Tailwind CSS and a backend using Node.js/Express.

The app allows clients and workers to register, browse jobs, manage completions, save/bookmark listings, and administrative features. It includes user authentication, job posting, completion workflows, and translation support with English/French via a custom context hook. Backend lives in `backend/` with controllers, routes, models, and migration scripts. Frontend resides in `frontend/` using Next.js app directory structure with components, pages, and hooks. Recent updates added saved‑jobs integration into the worker profile and extensive internationalization keys.

The project follows a monorepo-like structure with separate package.json files for backend and frontend.

The default branch is `main`. The repository name is `job-_seekers_app` owned by `tresordelasunnah-cyber`.
