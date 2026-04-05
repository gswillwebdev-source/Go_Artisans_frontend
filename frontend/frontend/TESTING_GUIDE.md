# Complete Frontend Profile Testing Guide

## Server Status
- ✅ Backend: Running on http://localhost:5000
- ✅ Frontend: Running on http://localhost:3000
- ✅ Database: Connected and ready

## Test User Credentials
**Email:** testworker@example.com  
**Password:** password123

## Step-by-Step Testing Instructions

### 1. Navigate to Login Page
```
http://localhost:3000/login
```

You should see:
- JobSeek logo and "Sign in to your account" heading
- Email input field
- Password input field
- Sign up link at bottom
- Google login button

### 2. Enter Login Credentials
- Email: `testworker@example.com`
- Password: `password123`
- Click "Sign in" button

Expected outcome:
- Page redirects to Jobs page
- User is logged in (token stored in localStorage)

### 3. Navigate to Profile Page
```
http://localhost:3000/profile
```

You should see the **View Mode** profile displaying:

#### Section 1: Basic Information
- ✅ First Name: Test
- ✅ Last Name: Worker
- ✅ Email: testworker@example.com
- ✅ Phone: +228123456789

#### Section 2: Professional Profile (Worker section)
- ✅ Job Title: Electrician
- ✅ Location: Lomé
- ✅ Years of Experience: 5 years

#### Section 3: About Me (Worker section)
- ✅ Bio: "Professional electrician with 5 years experience"

#### Section 4: Services / Skills (Worker section)
- ✅ Service tags displayed:
  - "Electrical installation"
  - "Wiring repair"
  - "Panel upgrade"

#### Section 5: Portfolio / Gallery (Worker section)
- ✅ Shows "No portfolio images." (empty since none uploaded yet)

### 4. Test Edit Mode - Basic Changes
1. Click "Edit Profile" button
2. Verify all fields are now editable in form:
   - First Name input
   - Last Name input
   - Email input (disabled/grayed out)
   - Phone Number input
3. Change one field, e.g., phone number to: `+228 9876 5432`
4. Click "Save Changes" button
5. Verify success message appears: "Profile updated successfully!"
6. View mode reappears with updated phone number

### 5. Test Edit Mode - Worker Toggle
1. Click "Edit Profile" button again
2. Look for checkbox: "Set up as a Service Provider (Worker)"
3. Verify checkbox is currently CHECKED (since this is a worker)
4. Uncheck the "Set up as a Service Provider" checkbox
5. All worker fields should disappear:
   - Job Title field disappears
   - Location field disappears
   - Years of Experience field disappears
   - Bio textarea disappears
   - Services section disappears
   - Portfolio section disappears
6. Re-check the "Set up as a Service Provider" checkbox
7. All worker fields should reappear

### 6. Test Edit Mode - Services Management
1. Click "Edit Profile" button
2. Scroll to "Services / Skills" section
3. You should see:
   - Three existing service tags with delete buttons
   - Text input field labeled "Add new service"
   - "Add Service" button next to input
4. Type a new service: `Kitchen installation`
5. Click "Add Service" button
6. New service should appear in the list
7. Click delete button (X) on one of the services
8. That service should be removed from the list
9. Click "Save Changes"
10. Reload page and verify services persisted

### 7. Test Edit Mode - Portfolio Upload
1. Click "Edit Profile" button
2. Scroll to "Portfolio / Gallery" section
3. You should see:
   - File input button labeled "Choose Portfolio Images"
   - Text: "Please select image files for your portfolio gallery"
   - Empty grid section below

4. Click on file input
5. Select 1-3 image files from your computer (JPG, PNG, etc.)
6. After selection, you should see:
   - Grid displaying thumbnail previews of selected images
   - Delete button on each image
   - Images should show with proper names

7. Click delete button on one image
8. That image should be removed from the grid

9. Click "Save Changes" button
10. Success message should appear
11. In view mode, portfolio section should now display:
    - Grid with the selected images
    - (Note: Currently shows names as placeholders since actual image uploads aren't fully implemented yet)

### 8. Test Complete Edit Workflow
1. Click "Edit Profile"
2. Make multiple changes:
   - Change job title to: "Senior Electrician"
   - Change location to: "Accra – Osu"
   - Add bio text if empty
   - Add new service: "Solar installation"
   - Upload 2 portfolio images
3. Click "Save Changes"
4. Verify success message
5. Reload page and verify all changes persisted
6. Click "Edit Profile" again
7. All fields should show updated values

### 9. Full Profile Page Structure Verification

When viewing profile with all sections visible:
```
┌─────────────────────────────────────────┐
│ Your Profile              [Edit Profile] │
├─────────────────────────────────────────┤
│ BASIC INFORMATION                       │
│ ├─ First Name: Test                     │
│ ├─ Last Name: Worker                    │
│ ├─ Email: testworker@example.com        │
│ └─ Phone: +228123456789                 │
├─────────────────────────────────────────┤
│ PROFESSIONAL PROFILE (Worker only)      │
│ ├─ Job Title: Electrician               │
│ ├─ Location: Lomé                       │
│ └─ Years of Experience: 5 years         │
├─────────────────────────────────────────┤
│ ABOUT ME (Worker only)                  │
│ └─ Bio text paragraph                   │
├─────────────────────────────────────────┤
│ SERVICES / SKILLS (Worker only)         │
│ └─ [Service1] [Service2] [Service3]     │
├─────────────────────────────────────────┤
│ PORTFOLIO / GALLERY (Worker only)       │
│ └─ [Grid of images 3 columns]           │
└─────────────────────────────────────────┘
```

### 10. Edit Mode Form Structure
```
File input disabled: Email
Dynamic toggling when isWorker changes:
├─ Job Title input (shows when isWorker = true)
├─ Location input (shows when isWorker = true)
├─ Years of Experience input (shows when isWorker = true)
├─ Bio textarea (shows when isWorker = true)
├─ Services section (shows when isWorker = true)
│  ├─ Existing services with delete buttons
│  └─ Add new service: [Input] [Add Button]
└─ Portfolio section (shows when isWorker = true)
   ├─ File input
   └─ Preview grid with delete buttons
```

## Expected Data After Seeding

| Field | Value |
|-------|-------|
| Email | testworker@example.com |
| First Name | Test |
| Last Name | Worker |
| Phone | +228123456789 |
| Is Worker | true |
| Job Title | Electrician |
| Location | Lomé |
| Years Experience | 5 |
| Bio | Professional electrician with 5 years experience |
| Services | ["Electrical installation", "Wiring repair", "Panel upgrade"] |
| Portfolio | [] (empty - ready for uploads) |

## API Endpoints Being Used

### GET /api/users/profile
- Called when profile page loads
- Returns authenticated user's complete profile

**Expected Response:**
```json
{
  "user": {
    "id": 6,
    "email": "testworker@example.com",
    "firstName": "Test",
    "lastName": "Worker",
    "phoneNumber": "+228123456789",
    "isWorker": true,
    "jobTitle": "Electrician",
    "location": "Lomé",
    "bio": "Professional electrician with 5 years experience",
    "yearsExperience": 5,
    "services": ["Electrical installation", "Wiring repair", "Panel upgrade"],
    "portfolio": []
  }
}
```

### PUT /api/users/profile
- Called when "Save Changes" is clicked
- Updates all profile fields
- Returns updated user object with same structure as GET response

## Debugging Tips

### If Profile Page Shows Loading Indefinitely
1. Check browser console (F12 → Console tab)
2. Look for error messages
3. Verify token is in localStorage: `localStorage.getItem('token')`
4. Verify backend is responding: Open http://localhost:5000 in browser

### If Data Doesn't Appear After Save
1. Check browser network tab (F12 → Network)
2. Look for PUT request to /api/users/profile
3. Check response status (should be 200)
4. Verify response body contains updated fields

### If Services/Portfolio Not Showing
1. Check that `isWorker` is true in view mode
2. If not showing even when true, check browser console for errors
3. Verify services and portfolio are not undefined in API response

### If Edit Mode Doesn't Toggle
1. Check that "Edit Profile" button is clickable
2. Verify no JavaScript errors in console
3. Try clicking button again

## Summary of Implemented Features

✅ **Dual View/Edit Modes**
- View mode displays all user information
- Edit mode provides comprehensive form for updates
- Toggle between modes with button

✅ **Worker Profile Support**
- Checkbox to enable/disable worker status
- Fields conditionally show/hide based on worker status
- All worker fields stored and retrieved properly

✅ **Services Management**
- Add services with input + button
- Remove services with delete buttons
- Services persist in database as JSONB array

✅ **Portfolio Support**
- File input for multiple images
- Preview grid showing selected images
- Delete button for each image
- Portfolio persists as JSONB array

✅ **Authentication Integration**
- JWT token-based auth
- Protected profile page (redirects to login if not authenticated)
- Token automatically set in API requests

✅ **Data Persistence**
- All changes saved to database
- Changes persist on page reload
- Backend properly handles all data types

## Next Steps After Testing

Once you've verified the profile functionality works correctly:

1. **Image Upload Implementation**
   - Currently portfolio images are stored as URLs/strings
   - Consider adding actual image file upload to server

2. **Profile Picture Upload**
   - Add profile picture field to form
   - Implement image upload endpoint

3. **Additional Features**
   - Add rating display from reviews
   - Implement actual review submission
   - Add portfolio image gallery slider
   - Add social media links

4. **Polish**
   - Add form validation (required fields, phone format, etc.)
   - Add loading spinners during save
   - Add success notification styling
   - Improve error messages

## File Locations

- Frontend Profile Page: `frontend/app/profile/page.js`
- Backend Routes: `backend/routes/users.js`
- API Client: `frontend/lib/apiClient.js`
- Database: PostgreSQL (see .env for connection details)
