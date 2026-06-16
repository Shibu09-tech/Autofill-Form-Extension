import { auth, db, storage } from '../lib/firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

document.addEventListener('DOMContentLoaded', () => {
  console.log('[AutoFill] Popup loaded.');

  // ─── Element References ──────────────────────────────────────────────────
  const loadingView        = document.getElementById('loading-view');
  const authView           = document.getElementById('auth-view');
  const mainView           = document.getElementById('main-view');
  const loginSection       = document.getElementById('login-section');
  const signupSection      = document.getElementById('signup-section');
  const loginForm          = document.getElementById('login-form');
  const signupForm         = document.getElementById('signup-form');
  const goToSignup         = document.getElementById('go-to-signup');
  const goToLogin          = document.getElementById('go-to-login');
  const btnLogout          = document.getElementById('btn-logout');
  const form               = document.getElementById('profile-form');
  const btnClear           = document.getElementById('btn-clear');
  const btnAddResume       = document.getElementById('btn-add-resume');
  const resumeContainer    = document.getElementById('resume-container');
  const btnAddUrl          = document.getElementById('btn-add-url');
  const urlsContainer      = document.getElementById('urls-container');
  const btnAddQuestion     = document.getElementById('btn-add-question');
  const questionsContainer = document.getElementById('questions-container');
  const btnAddProject      = document.getElementById('btn-add-project');
  const projectsContainer  = document.getElementById('projects-container');
  const hasWorkExperience  = document.getElementById('hasWorkExperience');
  const workFields         = document.getElementById('work-experience-fields');
  const hasInternship      = document.getElementById('hasInternship');
  const internFields       = document.getElementById('internship-fields');
  const btnExpand          = document.getElementById('btn-expand');

  // ─── Core View Functions ─────────────────────────────────────────────────
  function showAuthView() {
    if (loadingView) loadingView.classList.add('hidden');
    mainView.classList.add('hidden');
    authView.classList.remove('hidden');
    console.log('[AutoFill] View: Auth');
  }

  function showMainView(uid) {
    if (loadingView) loadingView.classList.add('hidden');
    authView.classList.add('hidden');
    mainView.classList.remove('hidden');
    console.log('[AutoFill] View: Main  uid=' + uid);
    loadProfile(uid);
  }

  // ─── Startup: cache-first auth, then confirm with Firebase ───────────────
  console.log('[AutoFill][Auth] Checking session on startup…');
  chrome.storage.local.get(['isAuthenticated', 'userUid'], (cached) => {
    if (cached.isAuthenticated && cached.userUid) {
      showMainView(cached.userUid);
    } else {
      showAuthView();
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      if (user) {
        chrome.storage.local.set({ isAuthenticated: true, userUid: user.uid });
        if (!cached.isAuthenticated) showMainView(user.uid);
      } else {
        chrome.storage.local.set({ isAuthenticated: false, userUid: null });
        if (cached.isAuthenticated) showAuthView();
      }
    });
  });

  // ─── Expand / Full-page ──────────────────────────────────────────────────
  if (btnExpand) {
    chrome.tabs.getCurrent((tab) => {
      if (tab) {
        btnExpand.innerHTML = '⤡ Close Full Page';
        btnExpand.addEventListener('click', () => window.close());
      } else {
        btnExpand.addEventListener('click', () => {
          chrome.tabs.create({ url: chrome.runtime.getURL('popup/popup.html') });
          window.close();
        });
      }
    });
  }

  // ─── Auth Toggles ────────────────────────────────────────────────────────
  goToSignup.addEventListener('click', (e) => {
    e.preventDefault();
    loginSection.classList.add('hidden');
    signupSection.classList.remove('hidden');
  });

  goToLogin.addEventListener('click', (e) => {
    e.preventDefault();
    signupSection.classList.add('hidden');
    loginSection.classList.remove('hidden');
  });

  // ─── Signup ──────────────────────────────────────────────────────────────
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email    = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirm  = document.getElementById('signup-confirm-password').value;

    if (password !== confirm) { showToast('Passwords do not match', 'error'); return; }
    if (password.length < 6)  { showToast('Password must be ≥6 characters', 'error'); return; }

    try {
      showToast('Creating account…', 'info');
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      console.log('[AutoFill][Auth] Signup OK uid=', cred.user.uid);
      chrome.storage.local.set({ isAuthenticated: true, userUid: cred.user.uid });
      showMainView(cred.user.uid); // ← Direct transition
      showToast('Account created!', 'success');
    } catch (err) {
      console.error('[AutoFill][Auth] Signup error:', err);
      showToast(err.message, 'error');
    }
  });

  // ─── Login ───────────────────────────────────────────────────────────────
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    try {
      showToast('Logging in…', 'info');
      const cred = await signInWithEmailAndPassword(auth, email, password);
      console.log('[AutoFill][Auth] Login OK uid=', cred.user.uid);
      chrome.storage.local.set({ isAuthenticated: true, userUid: cred.user.uid });
      showMainView(cred.user.uid); // ← Direct transition
      showToast('Logged in!', 'success');
    } catch (err) {
      console.error('[AutoFill][Auth] Login error:', err);
      showToast('Invalid email or password.', 'error');
    }
  });

  // ─── Logout ──────────────────────────────────────────────────────────────
  btnLogout.addEventListener('click', async () => {
    try {
      await signOut(auth);
      chrome.storage.local.remove(['profile', 'isAuthenticated', 'userUid']);
      loginForm.reset();
      signupForm.reset();
      signupSection.classList.add('hidden');
      loginSection.classList.remove('hidden');
      showAuthView(); // ← Direct transition
      showToast('Logged out', 'info');
      console.log('[AutoFill][Auth] Signed out.');
    } catch (err) {
      console.error('[AutoFill][Auth] Logout error:', err);
      showToast('Error logging out', 'error');
    }
  });

  // ─── Save Profile ────────────────────────────────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateFields()) { showToast('Please fix highlighted fields', 'error'); return; }

    const user = await waitForAuth();
    if (!user) { showToast('Not logged in', 'error'); return; }

    const uid = user.uid;
    console.log('[AutoFill][Save] Saving for uid=', uid);
    showToast('Saving to cloud…', 'info');

    try {
      const profile = collectBaseProfile();

      const extraUrls = [];
      document.querySelectorAll('.url-row').forEach(row => {
        const n = row.querySelector('.url-name').value.trim();
        const v = row.querySelector('.url-value').value.trim();
        if (n || v) extraUrls.push({ name: n, value: v });
      });
      profile.extraUrls = extraUrls;

      const customQuestions = [];
      document.querySelectorAll('.question-row').forEach(row => {
        const q = row.querySelector('.custom-q').value.trim();
        const a = row.querySelector('.custom-a').value.trim();
        if (q || a) customQuestions.push({ question: q, answer: a });
      });
      profile.customQuestions = customQuestions;

      const projects = [];
      document.querySelectorAll('.project-row').forEach(row => {
        const name = row.querySelector('.project-name').value.trim();
        const techStack = row.querySelector('.project-tech').value.trim();
        const link = row.querySelector('.project-link').value.trim();
        if (name || techStack || link) projects.push({ name, techStack, link });
      });
      profile.projects = projects;

      const cacheData = await new Promise(r => chrome.storage.local.get('profile', r));
      const oldResumes = (cacheData.profile || {}).resumes || [];

      const allResumes = await Promise.all(
        Array.from(document.querySelectorAll('.resume-row')).map(async (row) => {
          const roleName  = row.querySelector('.resume-role').value.trim();
          const fileInput = row.querySelector('.resume-file');
          if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            console.log('[AutoFill][Save] Uploading', file.name);
            const dataUrl = await readAsDataURL(file);
            const fileRef = ref(storage, `users/${uid}/resumes/${file.name}`);
            await uploadString(fileRef, dataUrl, 'data_url');
            const downloadUrl = await getDownloadURL(fileRef);
            console.log('[AutoFill][Save] Uploaded:', downloadUrl);
            return { roleName, fileName: file.name, downloadUrl, fileData: dataUrl };
          }
          const old = oldResumes.find(r => r.roleName === roleName);
          if (old) return old;
          if (roleName) return { roleName, fileName: '', downloadUrl: '', fileData: '' };
          return null;
        })
      );

      profile.resumes = allResumes.filter(r => r && (r.roleName || r.downloadUrl));

      // Firestore: strip fileData (base64) to stay under 1 MB document limit
      const cloudProfile = {
        ...profile,
        resumes: profile.resumes.map(({ roleName, fileName, downloadUrl }) =>
          ({ roleName, fileName, downloadUrl })
        ),
        updatedAt: new Date().toISOString()
      };

      console.log('[AutoFill][Firestore] Writing users/' + uid);
      await setDoc(doc(db, 'users', uid), sanitizeForFirestore(cloudProfile));
      console.log('[AutoFill][Firestore] ✅ Saved.');

      await new Promise(r => chrome.storage.local.set({ profile }, r));
      console.log('[AutoFill][Cache] ✅ Cache updated.');

      showToast('Profile saved!', 'success');
    } catch (err) {
      console.error('[AutoFill][Save] Error:', err);
      showToast('Error saving: ' + firebaseErrorHint(err), 'error');
    }
  });

  // ─── Load Profile ────────────────────────────────────────────────────────
  async function loadProfile(uid) {
    console.log('[AutoFill][Load] uid=', uid);
    try {
      const cacheData = await new Promise(r => chrome.storage.local.get('profile', r));
      if (cacheData.profile) {
        console.log('[AutoFill][Cache] Populating from cache.');
        populateFields(cacheData.profile);
      }

      const user = await waitForAuth();
      if (!user) {
        console.warn('[AutoFill][Load] Auth not ready — using cache only.');
        if (resumeContainer.children.length === 0) addResumeRow();
        return;
      }

      console.log('[AutoFill][Firestore] Fetching users/' + user.uid);
      const snap = await getDoc(doc(db, 'users', user.uid));

      if (!snap.exists()) {
        console.log('[AutoFill][Firestore] No document. Fresh start.');
        if (resumeContainer.children.length === 0) addResumeRow();
        return;
      }

      const cloudProfile = snap.data();
      console.log('[AutoFill][Firestore] ✅ Got data:', cloudProfile);

      const localResumes = (cacheData.profile || {}).resumes || [];
      const mergedResumes = await Promise.all(
        (cloudProfile.resumes || []).map(async (cr) => {
          const local = localResumes.find(r => r.roleName === cr.roleName);
          if (local && local.fileData) return { ...cr, fileData: local.fileData };
          if (cr.downloadUrl) {
            try {
              const resp = await fetch(cr.downloadUrl);
              const blob = await resp.blob();
              const fileData = await readAsDataURL(blob);
              return { ...cr, fileData };
            } catch (e) {
              console.warn('[AutoFill][Sync] Blob fetch failed:', e);
            }
          }
          return { ...cr, fileData: '' };
        })
      );

      const fullProfile = { ...cloudProfile, resumes: mergedResumes };
      await new Promise(r => chrome.storage.local.set({ profile: fullProfile }, r));
      console.log('[AutoFill][Cache] Synced from Firestore.');
      populateFields(fullProfile);

    } catch (err) {
      console.error('[AutoFill][Load] Error:', err);
      showToast('Cloud load failed: ' + firebaseErrorHint(err), 'error');
      if (resumeContainer.children.length === 0) addResumeRow();
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────
  function sanitizeForFirestore(obj) {
    if (obj === undefined) return null;
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
    const out = {};
    for (const [key, val] of Object.entries(obj)) {
      if (val !== undefined) out[key] = sanitizeForFirestore(val);
    }
    return out;
  }

  function firebaseErrorHint(err) {
    const code = err?.code || '';
    if (code === 'permission-denied') {
      return 'Permission denied. In Firebase Console: create Firestore database, then deploy firestore.rules (firebase deploy --only firestore:rules).';
    }
    if (code === 'unavailable' || code === 'failed-precondition') {
      return 'Firestore is not set up. Firebase Console → Build → Firestore → Create database.';
    }
    if (code === 'storage/unauthorized') {
      return 'Storage permission denied. Deploy storage.rules (firebase deploy --only storage).';
    }
    return err?.message || 'Unknown error';
  }

  async function waitForAuth() {
    await auth.authStateReady();
    return auth.currentUser;
  }

  function readAsDataURL(fileOrBlob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(fileOrBlob);
    });
  }

  function collectBaseProfile() {
    return {
      name:                  document.getElementById('name').value.trim(),
      email:                 document.getElementById('email').value.trim(),
      phone:                 document.getElementById('phone').value.trim(),
      dob:                   document.getElementById('dob').value,
      gender:                document.getElementById('gender').value,
      city:                  document.getElementById('city').value.trim(),
      state:                 document.getElementById('state').value.trim(),
      nationality:           document.getElementById('nationality').value.trim(),
      college:               document.getElementById('college').value.trim(),
      branch:                document.getElementById('branch').value,
      rollNumber:            document.getElementById('rollNumber').value.trim(),
      registrationNumber:    document.getElementById('registrationNumber').value.trim(),
      cgpa:                  document.getElementById('cgpa').value,
      percentageEquivalent:  document.getElementById('percentageEquivalent').value,
      tenthPercentage:       document.getElementById('tenthPercentage').value,
      tenthBoard:            document.getElementById('tenthBoard').value.trim(),
      tenthYear:             document.getElementById('tenthYear').value,
      twelfthPercentage:     document.getElementById('twelfthPercentage').value,
      twelfthBoard:          document.getElementById('twelfthBoard').value.trim(),
      twelfthYear:           document.getElementById('twelfthYear').value,
      graduationYear:        document.getElementById('graduationYear').value,
      currentYear:           document.getElementById('currentYear').value.trim(),
      backlogsCurrent:       document.getElementById('backlogsCurrent').value,
      backlogsTotal:         document.getElementById('backlogsTotal').value,
      aggregatePercentage:   document.getElementById('aggregatePercentage').value,
      skills:                document.getElementById('skills').value.trim(),
      github:                document.getElementById('github').value.trim(),
      linkedin:              document.getElementById('linkedin').value.trim(),
      portfolio:             document.getElementById('portfolio').value.trim(),
      leetcode:              document.getElementById('leetcode').value.trim(),
      hackerrank:            document.getElementById('hackerrank').value.trim(),
      codeforces:            document.getElementById('codeforces').value.trim(),
      hasWorkExperience:     document.getElementById('hasWorkExperience').value,
      workCompany:           document.getElementById('workCompany').value.trim(),
      workRole:              document.getElementById('workRole').value.trim(),
      workDuration:          document.getElementById('workDuration').value.trim(),
      hasInternship:         document.getElementById('hasInternship').value,
      internCompany:         document.getElementById('internCompany').value.trim(),
      internRole:            document.getElementById('internRole').value.trim(),
      internDuration:        document.getElementById('internDuration').value.trim(),
      preferredRole:         document.getElementById('preferredRole').value,
      preferredLocation:     document.getElementById('preferredLocation').value.trim(),
      expectedSalary:        document.getElementById('expectedSalary').value.trim(),
      willingToRelocate:     document.getElementById('willingToRelocate').value,
      noticePeriod:          document.getElementById('noticePeriod').value.trim(),
      projects:              [],
      resumes:               []
    };
  }

  function populateFields(p) {
    document.getElementById('name').value                  = p.name || '';
    document.getElementById('email').value                 = p.email || '';
    document.getElementById('phone').value                 = p.phone || '';
    document.getElementById('dob').value                   = p.dob || '';
    if (p.gender) document.getElementById('gender').value  = p.gender;
    document.getElementById('city').value                  = p.city || '';
    document.getElementById('state').value                 = p.state || '';
    document.getElementById('nationality').value           = p.nationality || '';
    document.getElementById('college').value               = p.college || '';
    if (p.branch) document.getElementById('branch').value  = p.branch;
    document.getElementById('rollNumber').value            = p.rollNumber || '';
    document.getElementById('registrationNumber').value    = p.registrationNumber || '';
    document.getElementById('cgpa').value                  = p.cgpa || '';
    document.getElementById('percentageEquivalent').value  = p.percentageEquivalent || '';
    document.getElementById('tenthPercentage').value       = p.tenthPercentage || '';
    document.getElementById('tenthBoard').value            = p.tenthBoard || '';
    document.getElementById('tenthYear').value             = p.tenthYear || '';
    document.getElementById('twelfthPercentage').value     = p.twelfthPercentage || '';
    document.getElementById('twelfthBoard').value          = p.twelfthBoard || '';
    document.getElementById('twelfthYear').value           = p.twelfthYear || '';
    document.getElementById('graduationYear').value        = p.graduationYear || '';
    document.getElementById('currentYear').value           = p.currentYear || '';
    document.getElementById('backlogsCurrent').value       = p.backlogsCurrent ?? '';
    document.getElementById('backlogsTotal').value         = p.backlogsTotal ?? '';
    document.getElementById('aggregatePercentage').value   = p.aggregatePercentage || '';
    document.getElementById('skills').value                = p.skills || '';
    document.getElementById('github').value                = p.github || '';
    document.getElementById('linkedin').value              = p.linkedin || '';
    document.getElementById('portfolio').value             = p.portfolio || '';
    document.getElementById('leetcode').value              = p.leetcode || '';
    document.getElementById('hackerrank').value            = p.hackerrank || '';
    document.getElementById('codeforces').value            = p.codeforces || '';
    document.getElementById('hasWorkExperience').value     = p.hasWorkExperience || 'no';
    document.getElementById('workCompany').value           = p.workCompany || '';
    document.getElementById('workRole').value              = p.workRole || '';
    document.getElementById('workDuration').value          = p.workDuration || '';
    document.getElementById('hasInternship').value         = p.hasInternship || 'no';
    document.getElementById('internCompany').value         = p.internCompany || '';
    document.getElementById('internRole').value            = p.internRole || '';
    document.getElementById('internDuration').value        = p.internDuration || '';
    if (p.preferredRole) document.getElementById('preferredRole').value = p.preferredRole;
    document.getElementById('preferredLocation').value     = p.preferredLocation || '';
    document.getElementById('expectedSalary').value        = p.expectedSalary || '';
    if (p.willingToRelocate) document.getElementById('willingToRelocate').value = p.willingToRelocate;
    document.getElementById('noticePeriod').value          = p.noticePeriod || '';
    toggleExperienceFields();

    urlsContainer.innerHTML = '';
    (p.extraUrls || []).forEach(u => addUrlRow(u.name, u.value));
    questionsContainer.innerHTML = '';
    (p.customQuestions || []).forEach(q => addQuestionRow(q.question, q.answer));
    projectsContainer.innerHTML = '';
    if (p.projects && p.projects.length > 0) {
      p.projects.forEach(proj => addProjectRow(proj.name, proj.techStack, proj.link));
    }
    resumeContainer.innerHTML = '';
    if (p.resumes && p.resumes.length > 0) {
      p.resumes.forEach(r => addResumeRow(r.roleName, r.fileName));
    } else {
      addResumeRow();
    }
  }

  function toggleExperienceFields() {
    workFields.classList.toggle('hidden', hasWorkExperience.value !== 'yes');
    internFields.classList.toggle('hidden', hasInternship.value !== 'yes');
  }

  // ─── Clear ───────────────────────────────────────────────────────────────
  btnClear.addEventListener('click', () => {
    if (!confirm('Clear your saved profile?')) return;
    chrome.storage.local.remove('profile', () => {
      form.reset();
      resumeContainer.innerHTML = '';
      urlsContainer.innerHTML = '';
      questionsContainer.innerHTML = '';
      projectsContainer.innerHTML = '';
      addResumeRow();
      toggleExperienceFields();
      document.querySelectorAll('.form-group.has-error').forEach(el => el.classList.remove('has-error'));
      showToast('Profile cleared', 'info');
    });
  });

  // ─── Validation ──────────────────────────────────────────────────────────
  function validateFields() {
    let valid = true;
    document.querySelectorAll('.form-group.has-error').forEach(el => el.classList.remove('has-error'));
    ['name', 'email', 'phone', 'college', 'branch', 'cgpa'].forEach(id => {
      const el = document.getElementById(id);
      if (!el.value.trim()) { el.closest('.form-group').classList.add('has-error'); valid = false; }
    });
    const phone = document.getElementById('phone');
    if (phone.value.trim() && !/^\d{10}$/.test(phone.value.trim())) {
      phone.closest('.form-group').classList.add('has-error');
      document.getElementById('err-phone').textContent = 'Must be exactly 10 digits.';
      valid = false;
    }
    const email = document.getElementById('email');
    if (email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
      email.closest('.form-group').classList.add('has-error');
      document.getElementById('err-email').textContent = 'Must be a valid email.';
      valid = false;
    }
    const cgpa = document.getElementById('cgpa');
    if (cgpa.value && (Number(cgpa.value) < 0 || Number(cgpa.value) > 10)) {
      cgpa.closest('.form-group').classList.add('has-error'); valid = false;
    }
    const tenth = document.getElementById('tenthPercentage');
    if (tenth.value && (Number(tenth.value) < 0 || Number(tenth.value) > 100)) {
      tenth.closest('.form-group').classList.add('has-error'); valid = false;
    }
    const twelfth = document.getElementById('twelfthPercentage');
    if (twelfth.value && (Number(twelfth.value) < 0 || Number(twelfth.value) > 100)) {
      twelfth.closest('.form-group').classList.add('has-error'); valid = false;
    }
    return valid;
  }

  // ─── Dynamic Rows ────────────────────────────────────────────────────────
  btnAddUrl.addEventListener('click', () => addUrlRow());
  btnAddQuestion.addEventListener('click', () => addQuestionRow());
  btnAddResume.addEventListener('click', () => addResumeRow());
  btnAddProject.addEventListener('click', () => addProjectRow());
  hasWorkExperience.addEventListener('change', toggleExperienceFields);
  hasInternship.addEventListener('change', toggleExperienceFields);
  toggleExperienceFields();

  function addUrlRow(nameValue = '', urlValue = '') {
    const row = document.createElement('div');
    row.className = 'dynamic-row url-row';
    row.innerHTML = `
      <div class="dynamic-inputs">
        <input type="text" class="url-name" placeholder="Website Name (e.g. LeetCode)" value="${nameValue}">
        <input type="url" class="url-value" placeholder="https://..." value="${urlValue}">
      </div>
      <button type="button" class="btn-remove-dynamic" title="Remove">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
      </button>`;
    row.querySelector('.btn-remove-dynamic').addEventListener('click', () => row.remove());
    urlsContainer.appendChild(row);
  }

  function addQuestionRow(qValue = '', aValue = '') {
    const row = document.createElement('div');
    row.className = 'dynamic-row question-row';
    row.innerHTML = `
      <div class="dynamic-inputs">
        <input type="text" class="custom-q" placeholder="Question or Label" value="${qValue}">
        <input type="text" class="custom-a" placeholder="Your Answer" value="${aValue}">
      </div>
      <button type="button" class="btn-remove-dynamic" title="Remove">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
      </button>`;
    row.querySelector('.btn-remove-dynamic').addEventListener('click', () => row.remove());
    questionsContainer.appendChild(row);
  }

  function addProjectRow(name = '', techStack = '', link = '') {
    const row = document.createElement('div');
    row.className = 'dynamic-row project-row';
    row.innerHTML = `
      <div class="dynamic-inputs">
        <input type="text" class="project-name" placeholder="Project Name" value="${name}">
        <input type="text" class="project-tech" placeholder="Tech Stack" value="${techStack}">
        <input type="url" class="project-link" placeholder="Project Link" value="${link}">
      </div>
      <button type="button" class="btn-remove-dynamic" title="Remove">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
      </button>`;
    row.querySelector('.btn-remove-dynamic').addEventListener('click', () => row.remove());
    projectsContainer.appendChild(row);
  }

  function addResumeRow(roleValue = '', savedFileName = '') {
    const row = document.createElement('div');
    row.className = 'resume-row';
    const fileInfo = savedFileName
      ? `Previously saved: <strong>${savedFileName}</strong>`
      : 'No file chosen';
    row.innerHTML = `
      <div class="resume-inputs">
        <input type="text" class="resume-role" placeholder="Role (e.g., SDE Resume)" value="${roleValue}">
        <div class="file-input-wrapper">
          <input type="file" class="resume-file" accept=".pdf,.doc,.docx">
          <span class="old-file-name" style="margin-top:2px;">${fileInfo}</span>
        </div>
      </div>
      <button type="button" class="btn-remove-resume" title="Remove">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
      </button>`;
    row.querySelector('.btn-remove-resume').addEventListener('click', () => {
      row.remove();
      if (resumeContainer.children.length === 0) addResumeRow();
    });
    resumeContainer.appendChild(row);
  }

  // ─── Toast ───────────────────────────────────────────────────────────────
  function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
});
