# End-to-End Testing Plan - READY FOR EXECUTION

## Date: March 5, 2026
## Status: ✅ All Critical Bugs Fixed

---

## Test Accounts to Create

### Worker Account
- **Email**: worker.test@example.com
- **Password**: TestPassword123
- **Role**: Worker
- **User Type**: worker

### Client Account  
- **Email**: client.test@example.com
- **Password**: TestPassword123
- **Role**: Client
- **User Type**: client

---

## Complete Test Flow

### Phase 1: User Registration & Profile Setup (Time: ~5 min)

#### Step 1.1: Register Worker Account
- [ ] Go to https://goartisans.online/register
- [ ] Fill form: Email, Password, First Name, Last Name
- [ ] Select Role: Worker
- [ ] Click Register  
- [ ] Verify: Registration successful, redirected to choose-role or login
- **Expected Metric**: < 2 seconds response time

#### Step 1.2: Worker Profile Setup
- [ ] Login with worker account (worker.test@example.com)
- [ ] Navigate to /profile or worker-profile page
- [ ] Measure load time with DevTools timing
- [ ] **VERIFY SECTIONS VISIBLE**:
  - [ ] Profile picture upload area
  - [ ] First name field
  - [ ] Last name field
  - [ ] Phone number field
  - [ ] Job title / Skills field
  - [ ] Location dropdown (Togo locations)
  - [ ] Bio/Description text area
  - [ ] Years of experience field
  - [ ] Services/Handworks list
  - [ ] Portfolio/Gallery section
  - [ ] Applications section
  - [ ] Ratings section (should be empty initially)
  - [ ] Edit button functional
- [ ] Fill in profile details:
  - First Name: Test Worker
  - Last Name: Artisan
  - Phone: +22892123456
  - Job Title: Plumber
  - Location: Lomé
  - Bio: Experienced plumber with 5+ years
  - Services: Plumbing, Repairs
  - Years Experience: 5
- [ ] Save profile
- [ ] **Verify**: All data saved and displayed on refresh
- **Expected Metric**: Profile page loads < 2 seconds

#### Step 1.3: Register Client Account  
- [ ] Logout from worker account
- [ ] Go to /register
- [ ] Create client account (client.test@example.com)
- [ ] Select Role: Client
- [ ] Verify: Registration successful
- **Expected Metric**: < 2 seconds response time

#### Step 1.4: Client Profile Setup
- [ ] Login with client account
- [ ] Navigate to client-profile page
- [ ] Measure load time
- [ ] **VERIFY SECTIONS VISIBLE**:
  - [ ] Company/User name fields
  - [ ] Email field
  - [ ] Phone field
  - [ ] Location field
  - [ ] Description/Bio field
  - [ ] Profile picture upload
  - [ ] Create Job/Project button
  - [ ] Posted jobs section
  - [ ] Applicants list (should be empty)
  - [ ] Ratings section (should be empty)
- [ ] Fill in profile:
  - Company/Name: Test Client
  - Phone: +22892654321
  - Location: Lomé
  - Description: Seeking quality artisans
- [ ] Save profile
- [ ] **Verify**: Changes persisted on reload
- **Expected Metric**: Profile page loads < 2 seconds

---

### Phase 2: Job Creation & Discovery (Time: ~3 min)

#### Step 2.1: Client Creates Job
- [ ] From client profile, click "Create Job" button
- [ ] Fill job form:
  - Title: "Kitchen Plumbing Repair"
  - Description: "Need to fix kitchen sink pipes and install new faucet"
  - Budget/Rate: 50000 CFA
  - Location: Lomé
  - Category: Plumbing
  - Timeline: 1 week
- [ ] Submit job
- [ ] **Verify**:
  - [ ] Success message displays
  - [ ] Job appears in client's "Posted Jobs" section
  - [ ] Job has status: Active
  - [ ] Job shows client name
- **Expected Metric**: Form submission < 1 second

#### Step 2.2: Job Discovery & Search
- [ ] Logout from client, login as worker
- [ ] Navigate to /browse-workers or /jobs page
- [ ] **Verify**:
  - [ ] Page loads quickly (< 3 seconds)
  - [ ] "Kitchen Plumbing Repair" job is visible in the list
  - [ ] Job card shows:
    - [ ] Title
    - [ ] Description preview
    - [ ] Location
    - [ ] Budget
    - [ ] Posted date
    - [ ] Client name (if available)
  - [ ] "View Details" button visible
  - [ ] "Apply Now" button visible
  - [ ] Search/filter functionality works
- [ ] Click "View Details" on the job
- [ ] **Verify job detail page**:
  - [ ] Full description visible
  - [ ] All job information displayed
  - [ ] Apply button ready
  - [ ] Page loads < 2 seconds

---

### Phase 3: Application & Acceptance (Time: ~5 min)

#### Step 3.1: Worker Applies to Job
- [ ] On job detail page (or from job card), click "Apply Now"
- [ ] **Verify**:
  - [ ] Application form appears (optional)
  - [ ] Worker can submit application
  - [ ] Success message: "Application submitted" or similar
  - [ ] Button changes to "Applied" or similar
  - [ ] Application shows in worker's profile "Applications" section
- **Expected Metric**: Application submit < 1 second
- **Expected Metric**: Profile updates immediately to show pending application

#### Step 3.2: Client Reviews Applicants  
- [ ] Logout worker, login as client
- [ ] Navigate to client profile page
- [ ] **Verify**:
  - [ ] "Kitchen Plumbing Repair" job shows in Posted Jobs
  - [ ] Job has applicant count or indicator
  - [ ] Expand/click job to see applicants
  - [ ] Worker's application visible showing:
    - [ ] Worker name
    - [ ] Worker profile preview (optional)
    - [ ] Proposed price (if provided)
    - [ ] Message (if provided)
    - [ ] Accept button
    - [ ] Decline button
    - [ ] Application timestamp

#### Step 3.3: Client Accepts Application
- [ ] Click "Accept" button for worker's application
- [ ] **Verify**:
  - [ ] Success message displays
  - [ ] Application status changes to "Accepted"
  - [ ] Job status may change to "In Progress" or similar
  - [ ] Worker removed from "applicants" list
  - [ ] Job moves to "Active Jobs" or "In Progress" section
- **Expected Metric**: Status update < 1 second

---

### Phase 4: Job Completion (Time: ~3 min)

#### Step 4.1: Worker Marks Job Complete
- [ ] Logout client, login as worker
- [ ] Navigate to worker profile page  
- [ ] **Verify**: Accepted job visible in Applications section
- [ ] Click "Mark Complete" or "Request Completion" button
- [ ] **Verify**:
  - [ ] Success message appears
  - [ ] Job status changes to "Completed" or "Pending Review"
  - [ ] Job moves to "Completed Jobs" section
  - [ ] Optional: Submit completion notes/comments
- **Expected Metric**: Status update and completion submit < 1 second

#### Step 4.2: Client Confirms Completion  
- [ ] Logout worker, login as client
- [ ] Navigate to client profile page
- [ ] **Verify**: Job shows as pending completion review
- [ ] Click "Confirm Completion" or similar button
- [ ] **Verify**:
  - [ ] Success message displays
  - [ ] Job status confirmed
  - [ ] Job ready for rating
  - [ ] Optional: Client can enter completion notes
- **Expected Metric**: Confirmation < 1 second

---

### Phase 5: Rating & Review (Time: ~3 min)

#### Step 5.1: Client Rates Worker  
- [ ] Still on client profile, completed job section
- [ ] Click "Rate Worker" button
- [ ] **Verify rating modal/form**:
  - [ ] Star rating interface (1-5 stars)
  - [ ] Hover effects on stars
  - [ ] Review/comment text field
  - [ ] Helper text/guidance
  - [ ] Submit button
- [ ] Rate worker:
  - Rating: 5 stars
  - Review: "Excellent work! Professional and punctual. Highly recommend!"
- [ ] Click Submit
- [ ] **Verify**:
  - [ ] Success message: "Rating submitted" or similar
  - [ ] Modal closes
  - [ ] Job shows as "Rated" or moves to "Completed & Rated" section
- **Expected Metric**: Rating submit < 1 second

#### Step 5.2: Verify Rating Display on Worker Profile
- [ ] Logout client, login as worker
- [ ] Navigate to worker profile page  
- [ ] Scroll to Ratings section
- [ ] **Verify rating displays**:
  - [ ] Rating section no longer empty
  - [ ] Shows individual rating(s):
    - [ ] 5-star display
    - [ ] Review text visible: "Excellent work! Professional and punctual..."
    - [ ] Client name visible: "Test Client"
    - [ ] Rating date visible
  - [ ] Average rating calculated and displayed
  - [ ] Rating count shows "1 rating"
  - [ ] Section styling/design looks good
- [ ] **Verify rating persistence**:
  - [ ] Reload page
  - [ ] Rating still visible
- **Expected Metric**: Profile loads < 2 seconds, rating visible immediately

---

## Performance Benchmarks

| Component | Target | Status |
|-----------|--------|--------|
| Profile page load | < 2 seconds | ⏳ |
| Job list load | < 3 seconds | ⏳ |
| Job detail page | < 2 seconds | ⏳ |
| Application submit | < 1 second | ⏳ |
| Status updates | < 1 second | ⏳ |
| Rating submit | < 1 second | ⏳ |
| Rating display | Immediate | ⏳ |

---

## Success Criteria (Must Pass All)

- ✅ Worker can create account and profile
- ✅ Client can create account and profile
- ✅ Client can create job
- ✅ Worker can discover and apply for job
- ✅ Client can see application and accept
- ✅ Worker can mark job complete
- ✅ Client can confirm completion
- ✅ Client can rate worker
- ✅ Rating displays on worker's profile
- ✅ Rating persists on page reload
- ✅ All sections visible and responsive
- ✅ No console errors
- ✅ All pages load within benchmarks
- ✅ Mobile responsive design works

---

## Browser Console Check

During all tests, monitor F12 Developer Console for:
- ❌ JavaScript errors
- ❌ Failed network requests  
- ❌ Warnings about missing elements
- ✅ Only info/log messages should appear

---

## Issues to Document

For each issue found, capture:
1. **Page/Component**: Where issue occurs
2. **What**: Description of the issue
3. **Expected**: What should happen
4. **Actual**: What actually happens
5. **Severity**: Critical/High/Medium/Low
6. **Screenshot**: If possible
7. **Console Error**: Any error message
8. **Load Time**: If performance issue

---

## Testing Environment

- **URL**: https://goartisans.online (Production)
- **Alternative**: localhost:3000 (if testing locally)
- **Browser**: Chrome/Firefox/Safari
- **DevTools**: Open for performance monitoring
- **Network**: Watch for failed requests

---

## Time Estimates

- Total estimated time: ~20-25 minutes
- Buffer for issues: +10-15 minutes
- **Grand total: ~35-40 minutes**

---

## Next Actions After Testing

1. **If all tests pass**: 
   - Deploy to production (if not already deployed)
   - Document successful test completion
   - Update changelog

2. **If issues found**:
   - Log each issue with details above
   - Prioritize by severity
   - Fix and retry tests
   - Retest after each fix

3. **Performance optimization**:
   - If any page > targets, profile with DevTools
   - Implement lazy loading if needed
   - Optimize database queries
   - Cache frequently accessed data
