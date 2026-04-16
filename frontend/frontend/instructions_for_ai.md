# Instructions for AI Assistants

## Project Overview
This is a Job Seeking App - a full-stack platform connecting clients with skilled workers/artisans. The application uses Next.js (frontend), Node.js/Express (backend), PostgreSQL (database), and has been migrated to use Supabase for database operations and authentication.

## Current Architecture
- **Frontend**: Next.js 16.1.6 with App Router, Tailwind CSS, deployed on Vercel
- **Database**: Supabase (PostgreSQL) with real-time capabilities
- **Authentication**: Supabase Auth (JWT-based)
- **Deployment**: Vercel for frontend, backend can be deployed separately
- **Languages**: JavaScript (ES6+), SQL for migrations

## Key Technologies & Patterns

### Frontend (Next.js)
- **Routing**: App Router (`/app` directory structure)
- **Styling**: Tailwind CSS with custom components
- **State Management**: React hooks, Context API for language/theme
- **Authentication**: Supabase Auth with custom useAuth hook
- **API Calls**: Direct Supabase client queries (no REST API)

### Database (Supabase)
- **Client**: `@supabase/supabase-js`
- **Operations**: Direct database queries instead of API endpoints
- **Real-time**: Subscription capabilities for live updates
- **Auth**: Built-in authentication with social providers

### Code Organization
- **Components**: Reusable UI components in `/components`
- **Pages**: Route-based pages in `/app`
- **Hooks**: Custom React hooks in `/hooks`
- **Lib**: Utilities, Supabase client, API helpers in `/lib`
- **Context**: Global state management in `/context`

## Development Guidelines

### File Naming Conventions
- **Components**: PascalCase (e.g., `JobCard.js`, `Navbar.js`)
- **Pages**: kebab-case for routes, PascalCase for components
- **Hooks**: camelCase with `use` prefix (e.g., `useAuth.js`)
- **Utilities**: camelCase (e.g., `apiClient.js`, `supabase.js`)

### Code Style
- **JavaScript**: ES6+ features, async/await for async operations
- **React**: Functional components with hooks
- **Imports**: Group by external libraries, then internal modules
- **Error Handling**: Try/catch blocks with user-friendly messages
- **Comments**: JSDoc for functions, inline comments for complex logic

### Database Operations
- **Queries**: Use Supabase client methods (`.select()`, `.insert()`, `.update()`, `.delete()`)
- **Relationships**: Handle foreign keys and joins appropriately
- **Validation**: Client-side validation before database operations
- **Error Handling**: Handle Supabase errors gracefully

## Common Tasks & Patterns

### Adding New Features
1. **Database Schema**: Update Supabase tables/migrations if needed
2. **Frontend Components**: Create reusable components in `/components`
3. **Pages**: Add routes in `/app` directory
4. **API Integration**: Use Supabase client for data operations
5. **State Management**: Update relevant hooks/context if needed
6. **Styling**: Use Tailwind classes, maintain responsive design

### Authentication Flow
1. **Login/Register**: Use `supabase.auth.signInWithPassword()` or OAuth
2. **State Management**: `useAuth` hook handles auth state
3. **Protected Routes**: Check authentication status in components
4. **Logout**: Use `supabase.auth.signOut()`

### Database Queries
```javascript
// Select with filters
const { data, error } = await supabase
  .from('jobs')
  .select('*')
  .eq('status', 'active')

// Insert new record
const { data, error } = await supabase
  .from('jobs')
  .insert([{ title, description, client_id }])

// Update record
const { data, error } = await supabase
  .from('users')
  .update({ profile_data })
  .eq('id', userId)
```

## Environment & Deployment

### Environment Variables
- **Frontend**: `.env.local` with `NEXT_PUBLIC_SUPABASE_*` variables
- **Supabase URL**: `https://qgofshosxvunqbbycwyq.supabase.co`
- **Production**: Deployed on Vercel at `https://goartisans.online`

### Build & Deploy
- **Build**: `npm run build` (Next.js handles optimization)
- **Deploy**: `npx vercel --prod` for production deployment
- **Environment**: Ensure all Supabase variables are set in Vercel

## Testing Guidelines

### Manual Testing Checklist
- [ ] Authentication flows (login, register, logout)
- [ ] User roles (client vs worker permissions)
- [ ] Profile management (view, edit, save)
- [ ] Job operations (create, view, apply, complete)
- [ ] Search and filtering functionality
- [ ] Responsive design on mobile/tablet/desktop
- [ ] Error handling and user feedback

### Code Quality
- [ ] ESLint passes without errors
- [ ] Build completes successfully
- [ ] No console errors in browser
- [ ] Proper error boundaries implemented
- [ ] Accessibility considerations (ARIA labels, keyboard navigation)

## Troubleshooting

### Common Issues
1. **Build Failures**: Check for syntax errors, missing imports, environment variables
2. **Auth Issues**: Verify Supabase configuration, check auth state management
3. **Database Errors**: Check Supabase table schemas, foreign key relationships
4. **Styling Issues**: Verify Tailwind classes, check responsive breakpoints

### Debug Steps
1. Check browser console for JavaScript errors
2. Verify environment variables are loaded
3. Test Supabase connection and queries
4. Check network tab for failed requests
5. Validate component props and state

## Project Structure Reference

```
/
├── frontend/
│   ├── app/                 # Next.js pages and layouts
│   ├── components/          # Reusable UI components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities and Supabase client
│   ├── context/            # React context providers
│   └── public/             # Static assets
├── backend/                # Express.js API (legacy)
├── documentation/          # Project documentation
└── package.json           # Root dependencies
```

## Communication Guidelines

### When Making Changes
- **Test Thoroughly**: Ensure changes work across different user roles
- **Update Documentation**: Keep relevant docs current
- **Follow Patterns**: Maintain consistency with existing code
- **Error Handling**: Provide user-friendly error messages
- **Performance**: Consider impact on load times and user experience

### When Asking for Help
- **Provide Context**: Include what you're trying to accomplish
- **Share Errors**: Include full error messages and stack traces
- **Describe Expected Behavior**: Explain what should happen vs. what is happening
- **Include Environment**: Mention if it's local dev, staging, or production

## Security Considerations

### Data Protection
- Never log sensitive information (passwords, tokens)
- Validate all user inputs on both client and server
- Use HTTPS in production
- Implement proper CORS policies

### Authentication Security
- Use Supabase's built-in security features
- Implement proper session management
- Validate user permissions for protected operations
- Handle token expiration gracefully

## Performance Optimization

### Frontend
- Use React.memo for expensive components
- Implement lazy loading for routes
- Optimize images and assets
- Minimize bundle size

### Database
- Use appropriate indexes on frequently queried columns
- Implement pagination for large datasets
- Cache frequently accessed data
- Optimize complex queries

---

## Quick Reference

### Supabase Client Usage
```javascript
import { supabase } from '@/lib/supabase'

// Authentication
await supabase.auth.signInWithPassword({ email, password })
await supabase.auth.signOut()

// Database operations
await supabase.from('table').select('*')
await supabase.from('table').insert(data)
await supabase.from('table').update(data).eq('id', id)
await supabase.from('table').delete().eq('id', id)
```

### Common Hooks
- `useAuth()` - Authentication state and methods
- `useState()` - Local component state
- `useEffect()` - Side effects and lifecycle
- `useRouter()` - Next.js navigation

### Styling Classes
- Responsive: `sm:`, `md:`, `lg:`, `xl:`
- Colors: `blue-500`, `gray-100`, etc.
- Spacing: `p-4`, `m-2`, `space-x-4`
- Layout: `flex`, `grid`, `block`, `hidden`

Remember: This is a living document. Update it as the project evolves and new patterns emerge.</content>
<parameter name="filePath">c:\Projects\job seaking app\instructions_for_ai.md