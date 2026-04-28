# Complete End-to-End User Flow Testing Prompt

## Purpose
Test the complete job marketplace workflow including user registration, profile creation, job posting, application, acceptance, completion, and rating to ensure all features work correctly and the UI loads quickly.

## Testing Scope
Focus on frontend functionality with 2 user accounts:
- **Worker Account**: For browsing jobs and applying
- **Client Account**: For creating jobs and managing applications/ratings

## Pre-Test Checklist
- [ ] Access live app at https://goartisans.online (or local dev server)
- [ ] Browser DevTools open for performance monitoring
- [ ] Create or use existing test accounts for both roles
- [ ] Note load times and any console errors

## Test Flow

### Phase 1: User Registration & Profiles

#### Worker User Setup
1. Register or login as a worker account
2. Navigate to worker profile page
3. **Performance Check**: Measure page load time (target: < 2 seconds)
4. **UI Sections Visibility Check**:
   - [ ] User avatar/profile picture visible
   - [ ] User name and role displayed
   - [ ] Bio/description section visible
   - [ ] Skills section visible and populated
   - [ ] Applications/jobs worked on section visible
   - [ ] Ratings section visible (if any existing ratings)
   - [ ] Contact information visible
   - [ ] Edit profile button visible
5. **Responsive Check**: Test on mobile (375px), tablet (768px), desktop (1920px)
6. Document any visual issues or missing elements

#### Client User Setup
1. Register or login as a client account
2. Navigate to client profile page
3. **Performance Check**: Measure page load time (target: < 2 seconds)
4. **UI Sections Visibility Check**:
   - [ ] Company/user name visible
   - [ ] Company description/bio visible
   - [ ] Profile rating visible
   - [ ] Posted jobs/projects section visible
   - [ ] Edit profile button visible
   - [ ] Job creation/posting button visible
   - [ ] Active and past projects visible
5. **Responsive Check**: Test on different screen sizes
6. Document any visual issues or missing elements

### Phase 2: Job Posting & Discovery

#### Client Creates Job/Project
1. Click "Create Job" or "Post Project" button (location may vary)
2. Fill in job form:
   - [ ] Title field accepts input
   - [ ] Description field accepts input
   - [ ] Budget/rate field accepts numeric input
   - [ ] Skills/requirements field works
   - [ ] Timeline field works
3. Submit and verify:
   - [ ] Job appears in job listings
   - [ ] Job visible in client's profile
   - [ ] Success message displays

#### Worker Discovers Job
1. Navigate to "Browse Jobs" or similar
2. Verify:
   - [ ] Job list loads quickly
   - [ ] Created job appears in list
   - [ ] Job card displays all relevant info
   - [ ] Filtering/search works

### Phase 3: Application & Acceptance

#### Worker Applies to Job
1. Click "Apply" button on job
2. If application form appears:
   - [ ] Form fields render correctly
   - [ ] Worker can submit application
   - [ ] Success message displays
3. Verify in worker profile:
   - [ ] Applied job shows in "Applications" or "Applied Jobs" section
   - [ ] Application status displays correctly

#### Client Reviews Applications
1. Navigate to job details or applications section
2. Verify:
   - [ ] Worker's application appears
   - [ ] All application details visible
   - [ ] Accept button visible and clickable
   - [ ] Decline button visible and clickable
3. **Test Accept Flow**:
   - [ ] Click "Accept" button
   - [ ] Success message displays
   - [ ] Application status updates to "Accepted"
   - [ ] Job status updates (if applicable)

### Phase 4: Job Completion & Rating

#### Worker Confirms Completion
1. Navigate to active jobs or profile
2. Find the accepted job
3. Verify:
   - [ ] "Mark Complete" or similar button visible
   - [ ] Can click and submit completion
   - [ ] Success message displays
   - [ ] Job status updates to "Completed"
4. Verify in profile:
   - [ ] Job moves to "Completed" or "Past Projects" section

#### Client Rates Worker
1. Navigate to completed job or ratings section
2. Verify:
   - [ ] Rating button/modal appears
   - [ ] Rate worker form displays with:
     - [ ] Star rating input (1-5)
     - [ ] Review/comment text field
     - [ ] Submit button
3. Submit rating:
   - [ ] Success message displays
   - [ ] Rating saved

#### Verify Rating Display
1. Navigate to worker's profile
2. Verify:
   - [ ] Rating appears in ratings section
   - [ ] Star rating displays correctly
   - [ ] Review text displays (if provided)
   - [ ] Average rating updates
   - [ ] Rating count increments
3. Verify in other locations (if applicable):
   - [ ] Job/card listings show worker rating
   - [ ] Worker's profile page shows all ratings

### Phase 5: Additional Checks

#### Performance Monitoring
- Profile pages: Target < 2 seconds load time
- Job list: Target < 3 seconds load time
- Modal/form actions: Should be instant
- Rating submission: Should be < 1 second

#### Error Handling
- [ ] Test with poor network (DevTools > Network > Slow 3G)
- [ ] Verify loading states appear
- [ ] Verify error messages display clearly
- [ ] Verify user can retry failed actions

#### Data Integrity
- [ ] Ratings persist on reload
- [ ] Job status updates correctly
- [ ] User profile updates reflect immediately
- [ ] No duplicate applications possible

## Issues to Document

For each issue found, note:
1. **What**: Description of the issue
2. **Where**: Component, page, or URL
3. **Severity**: Critical / High / Medium / Low
4. **Steps to Reproduce**: Clear steps
5. **Expected**: What should happen
6. **Actual**: What actually happens
7. **Console Errors**: Any JavaScript errors
8. **Performance**: Load time if slow

## Success Criteria

✅ All functionality works end-to-end
✅ Pages load in < 2-3 seconds
✅ All UI sections visible and responsive
✅ All buttons and forms are functional
✅ No console errors
✅ Ratings persist and display correctly
✅ User data updates immediately
✅ Mobile-responsive design works

## Notes

- Test against **production URL**: https://goartisans.online
- Alternative: Test locally if setup available
- Use real test accounts or create temporary throw-away accounts
- Take screenshots of any issues
- Check browser console (F12) for errors
- Monitor network tab for failed requests
