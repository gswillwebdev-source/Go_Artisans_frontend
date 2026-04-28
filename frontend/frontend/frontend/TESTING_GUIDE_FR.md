# 🧪 Quick Test Guide: Login Redirect & French Translations

## Test Scenario 1: Login Redirect for Job Application

### Setup:
- Clear your browser's localStorage (logout if logged in)
- Go to the Jobs page

### Test Steps:
1. **Click on any job** to view its details
2. **Verify you see a blue banner** with text: "You must be logged in to apply for jobs"
3. **Two buttons should appear**: "Login" and "Register"
4. **Click the "Register" button**
   - ✅ Should redirect to `/register` page
5. **Go back to job details, click "Login" button**
   - ✅ Should redirect to `/login` page
6. **Try clicking the "Apply Now" button** without logging in
   - ✅ Should redirect to register page (no alert)

### Expected Behavior:
- No alert dialogs (old behavior)
- Smooth router navigation
- Clear call-to-action
- Option to register or login shown on job page

---

## Test Scenario 2: French Language Translations

### Setup:
- While logged out or logged in, look at the navbar
- The app should be in **French by default**

### Test Steps:

#### 2A: Default French Mode
1. Go to any job page
2. **Verify these texts are in French**:
   - Job title fields → "Titre du poste"
   - Location → "Localisation"
   - Job Type → "Type d'emploi"
   - Budget → "Budget"
   - Posted → "Publié"
   - "Apply Now" button → "Postuler maintenant"

#### 2B: Switch to English
1. **Look for 🌐 button in top-right navbar**
2. **Click it** to open language dropdown
3. **Select "English (EN)"**
4. **Verify pages reload and text changes**:
   - "Titre du poste" → "Job Title"
   - "Localisation" → "Location"
   - "Postuler maintenant" → "Apply Now"
   - All errors/success messages switch to English

#### 2C: Switch Back to French
1. **Click 🌐 button again**
2. **Select "Français (FR)"**
3. **All text should switch back to French**

#### 2D: Persistence
1. Switch language to English
2. **Refresh the page** (F5)
3. **Should still be in English** (language saved to localStorage)
4. Close browser tab and reopen
5. **Should still be in English** (persistent storage)

---

## Test Scenario 3: French Translation Coverage

### Test in French Mode (Switch to FR at top-right):

#### Navigation:
- [ ] "Parcourir les artisans" (Browse Workers)
- [ ] "Emplois" (Jobs)
- [ ] "Profil" (Profile)
- [ ] "Déconnexion" (Logout)

#### Job Application:
- [ ] "Postuler maintenant" (Apply Now)
- [ ] "Candidature soumise avec succès!" (Application submitted successfully)
- [ ] "Impossible de récupérer les emplois" (Failed to fetch jobs)
- [ ] "Aucun emploi trouvé" (No jobs found)

#### Job Detail Page:
- [ ] "Titre du poste" (Job Title)
- [ ] "Type d'emploi" (Job Type)
- [ ] "Budget" (Budget)
- [ ] "Description du poste" (Job Description)
- [ ] "À propos du client" (About Client)
- [ ] Blue banner says: "Vous devez être connecté pour postuler à des emplois"

#### Modals (Job Details):
- [ ] Rating modal title changes based on language
- [ ] Decline modal shows French text
- [ ] All button labels are translated

---

## Expected Results Summary

### ✅ All Tests Should Pass:

1. **Login Redirect**:
   - No alerts appear
   - Router-based navigation works
   - Register/Login buttons visible on job detail page

2. **French Translations**:
   - Default language is French
   - All UI text translates when switching languages
   - Language preference persists across page refreshes
   - Can switch back and forth between French and English

3. **Error Messages**:
   - When applying without being logged in: No alert, just redirect
   - All error messages are translated to current language

---

## If Something Doesn't Work:

1. **Check Browser Console** (F12) for JavaScript errors
2. **Clear LocalStorage**: Open DevTools → Application tab → Clear All
3. **Hard Refresh**: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
4. **Check Language Dropdown**: 🌐 button should show FR by default

---

## File Locations to Check:

If you need to verify the implementation:
- Job redirect logic: `frontend/app/jobs/[id]/page.js` (line ~50-55)
- Translations: `frontend/lib/translations.js` (100+ keys)
- Language context: `frontend/context/LanguageContext.js`
- JobCard applies redirect: `frontend/components/JobCard.js` (line ~20-25)

---

**Status**: Ready for testing! 🚀
