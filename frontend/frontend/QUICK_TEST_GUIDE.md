# Quick Test Guide - Worker/Client Roles

## 🚀 Quick Start (2 Minutes)

### **Step 1: Clear Cache**
Open browser console (F12 → Console tab) and paste:
```javascript
localStorage.clear(); location.reload();
```

### **Step 2: Login**
Go to: `http://localhost:3000/login`
- Email: `testworker@example.com`
- Password: `password123`
- Click "Sign in"

### **Step 3: NEW! See Role Selection Page**
After login, you'll see a **"Welcome to JobSeek"** page with two options:
- 🔧 **I'm a Service Provider** (Worker)
- 👥 **I'm Looking for Help** (Client)

### **Step 4: Click "I'm a Service Provider"**
- You go to `/worker-profile`
- See the professional worker profile with:
  - Job title, location, experience
  - Bio, services, portfolio upload
  - Full edit/view modes

### **Step 5: Go Back to Role Selection**
- Logout or manually go to `/choose-role`
- Click "I'm Looking for Help"
- You go to `/client-profile`
- See client profile with:
  - Profile picture upload
  - Location, skills needed (in bio)
  - "Your Projects" section

### **Step 6: Check Navbar**
- Profile button should be visible in top navbar
- Can click anytime to go to profile
- Logout button is also visible

---

## ✨ What Changed

| Before | After |
|--------|-------|
| Login → Jobs page | Login → Choose role page |
| No role selection | Select: Worker or Client |
| One profile type | Two different profiles |
| Profile button sometimes missing | Profile button always visible |
| Register same as login | Register also shows role page |

---

## 📍 New URLs

```
/choose-role        ← After login, select your role
/worker-profile     ← For service providers/workers
/client-profile     ← For clients looking for help
/profile           ← Still works (kept for compatibility)
```

---

## 🎯 Two Different Profiles

### WORKER Profile (Service Provider)
```
📝 Edit fields:
- First name, Last name
- Email (view only)
- Phone, Location
- Job title (e.g., "Electrician")
- Years of experience
- Professional bio
- Services/skills (add/remove)
- Portfolio images (upload)
```

### CLIENT Profile (Hiring/Looking for Help)
```
📝 Edit fields:
- Profile picture (upload)
- First name, Last name
- Email (view only)
- Phone, Location
- What skills you need (bio field)
- Your Projects section (ready for job posting)
```

---

## ✅ Testing Checklist

- [ ] Login takes you to role selection page
- [ ] Role selection page shows two cards
- [ ] Clicking "Service Provider" goes to worker profile
- [ ] Clicking "Looking for Help" goes to client profile
- [ ] Profile button visible in navbar after login
- [ ] Can click Profile in navbar anytime
- [ ] Worker profile shows services/portfolio sections
- [ ] Client profile shows project section
- [ ] Can edit either profile and save changes
- [ ] Logout button works
- [ ] Profile button disappears after logout

---

## 🐛 If Something Isn't Working

### Profile button not showing?
```javascript
// Clear everything and refresh
localStorage.clear()
location.reload()
```

### Role selection doesn't appear?
- Make sure you're redirected to `/choose-role` after login
- Check URL bar to confirm
- Hard refresh: `Ctrl+Shift+R`

### Wrong profile showing?
- Make sure you clicked the right card
- Check URL: should be `/worker-profile` or `/client-profile`

### Navbar looks weird?
- Hard refresh: `Ctrl+Shift+R`
- Clear cookies: Browser Settings → Privacy

---

## 📸 Expected Behavior

### **After Login**
```
1. See "Welcome to JobSeek" page
2. See your first name at the top
3. See two colorful cards:
   - Left card: 🔧 Service Provider (blue)
   - Right card: 👥 Looking for Help (green)
4. Bottom has "Skip for now" link
```

### **Click Service Provider**
```
1. Redirected to /worker-profile
2. See "Your Profile" heading
3. See "Edit Profile" button
4. Can see:
   - Basic info (name, email, phone)
   - Professional Profile (job title, location, experience)
   - About Me (bio text)
   - Services (list of skills)
   - Portfolio (images)
```

### **Click Looking for Help**
```
1. Redirected to /client-profile
2. See "Your Client Profile" heading
3. See "Edit Profile" button
4. Can see:
   - Profile picture area
   - Basic info (name, email, phone, location)
   - About You (skills you need)
   - Your Projects (post new project button)
```

### **Click Edit Profile**
```
1. Switches to edit mode
2. All fields become editable
3. Can upload files (profile pic/portfolio)
4. See "Save Changes" button
5. Click save → success message
6. Returns to view mode
```

---

## 🔐 Test User Ready
```
Email:    testworker@example.com
Password: password123
Status:   Already set up as worker
```

---

## ⏰ Estimated Test Time
- **Quick test:** 2 minutes
- **Full test all features:** 5-10 minutes
- **First time understanding:** 10-15 minutes

---

## 💡 Key Points

✅ **The role selection page is NEW** - appears every login

✅ **Two different profile pages:**
   - Worker: Professional services setup
   - Client: Hiring/project posting setup

✅ **Profile button now always visible** - check navbar after login

✅ **Both profiles use same backend** - just different UIs

✅ **Skip option available** - can browse jobs without choosing role

---

## 🎓 Understanding the Roles

### **Service Provider (Worker)**
- Offers services (electrician, plumber, designer, etc.)
- Has job title, skills, portfolio
- Gets hired by clients
- Gets rated by clients

### **Client (Hiring)**
- Needs services done
- Posts projects/jobs
- Hires service providers
- Rates workers after job

---

## 🚀 Next Action

**Go to:** `http://localhost:3000/login`

**Then test the role selection and both profiles!**

Any issues? Check the troubleshooting section above.
