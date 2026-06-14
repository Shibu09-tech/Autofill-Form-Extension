document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const form = document.getElementById('profile-form');
  const btnClear = document.getElementById('btn-clear');
  const btnAddResume = document.getElementById('btn-add-resume');
  const resumeContainer = document.getElementById('resume-container');

  const btnAddUrl = document.getElementById('btn-add-url');
  const urlsContainer = document.getElementById('urls-container');
  const btnAddQuestion = document.getElementById('btn-add-question');
  const questionsContainer = document.getElementById('questions-container');
  const btnExpand = document.getElementById('btn-expand');

  // Auth Elements
  const authView = document.getElementById('auth-view');
  const mainView = document.getElementById('main-view');
  
  const loginSection = document.getElementById('login-section');
  const signupSection = document.getElementById('signup-section');
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  
  const goToSignup = document.getElementById('go-to-signup');
  const goToLogin = document.getElementById('go-to-login');
  const btnLogout = document.getElementById('btn-logout');

  // Check auth state
  chrome.storage.local.get("isAuthenticated", (data) => {
    if (data.isAuthenticated) {
      showMainView();
    } else {
      showAuthView();
    }
  });

  // Expand Button
  if (btnExpand) {
    chrome.tabs.getCurrent((tab) => {
      if (tab) {
        // We are already running in a full browser tab
        btnExpand.innerHTML = "⤡ Close Full Page";
        btnExpand.title = "Close Full Page";
        btnExpand.addEventListener('click', () => {
          window.close(); // Closes the current full page tab
        });
      } else {
        // We are in the popup view
        btnExpand.addEventListener('click', () => {
          chrome.tabs.create({ url: chrome.runtime.getURL("popup/popup.html") });
          // Optionally close the popup automatically:
          window.close();
        });
      }
    });
  }

  // Auth View Toggles
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

  // Event Listeners
  loginForm.addEventListener('submit', handleLogin);
  signupForm.addEventListener('submit', handleSignup);
  btnLogout.addEventListener('click', handleLogout);
  form.addEventListener('submit', handleSave);
  btnClear.addEventListener('click', handleClear);
  btnAddResume.addEventListener('click', () => addResumeRow());
  btnAddUrl.addEventListener('click', () => addUrlRow());
  btnAddQuestion.addEventListener('click', () => addQuestionRow());

  function handleSignup(e) {
    e.preventDefault();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;

    if (password !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    if (password.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }

    // Save user credentials
    chrome.storage.local.set({ 
      userEmail: email, 
      userPassword: password, 
      isAuthenticated: true 
    }, () => {
      showMainView();
      showToast('Account created successfully', 'success');
    });
  }

  function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    chrome.storage.local.get(['userEmail', 'userPassword'], (data) => {
      if (data.userEmail === email && data.userPassword === password) {
        chrome.storage.local.set({ isAuthenticated: true }, () => {
          showMainView();
          showToast('Logged in successfully', 'success');
        });
      } else {
        showToast("Invalid email or password. Please sign up first if you haven't.", 'error');
      }
    });
  }

  function handleLogout() {
    chrome.storage.local.set({ isAuthenticated: false }, () => {
      showAuthView();
      loginForm.reset();
      signupForm.reset();
      
      // Ensure we go back to login view by default
      signupSection.classList.add('hidden');
      loginSection.classList.remove('hidden');
      
      showToast('Logged out', 'info');
    });
  }

  function showMainView() {
    authView.classList.add('hidden');
    mainView.classList.remove('hidden');
    loadProfile();
  }

  function showAuthView() {
    mainView.classList.add('hidden');
    authView.classList.remove('hidden');
  }

  /**
   * Validates form inputs before saving
   * @returns {boolean} Whether form is valid
   */
  function validateFields() {
    let isValid = true;
    
    // Clear previous errors
    document.querySelectorAll('.form-group.has-error').forEach(el => {
      el.classList.remove('has-error');
    });

    // Required fields check
    const requiredFields = ['name', 'email', 'phone', 'college', 'branch', 'cgpa'];
    requiredFields.forEach(id => {
      const el = document.getElementById(id);
      const parent = el.closest('.form-group');
      if (!el.value.trim()) {
        parent.classList.add('has-error');
        isValid = false;
      }
    });

    // Phone validation (exactly 10 digits)
    const phone = document.getElementById('phone');
    if (phone.value.trim() && !/^\d{10}$/.test(phone.value.trim())) {
      phone.closest('.form-group').classList.add('has-error');
      document.getElementById('err-phone').textContent = 'Must be exactly 10 digits.';
      isValid = false;
    }

    // Email validation
    const email = document.getElementById('email');
    if (email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
      email.closest('.form-group').classList.add('has-error');
      document.getElementById('err-email').textContent = 'Must be a valid email.';
      isValid = false;
    }

    // CGPA built-in min/max check since it's a required number input
    const cgpa = document.getElementById('cgpa');
    if (cgpa.value && (Number(cgpa.value) < 0 || Number(cgpa.value) > 10)) {
      cgpa.closest('.form-group').classList.add('has-error');
      isValid = false;
    }

    // 10th and 12th Percentage validation (0-100)
    const tenth = document.getElementById('tenthPercentage');
    if (tenth.value && (Number(tenth.value) < 0 || Number(tenth.value) > 100)) {
      tenth.closest('.form-group').classList.add('has-error');
      isValid = false;
    }

    const twelfth = document.getElementById('twelfthPercentage');
    if (twelfth.value && (Number(twelfth.value) < 0 || Number(twelfth.value) > 100)) {
      twelfth.closest('.form-group').classList.add('has-error');
      isValid = false;
    }

    return isValid;
  }

  /**
   * Collects data and saves to Chrome storage
   * @param {Event} e 
   */
  function handleSave(e) {
    e.preventDefault();

    if (!validateFields()) {
      showToast('Please correct highlighted fields', 'error');
      return;
    }

    // Collect base fields
    const profile = {
      name: document.getElementById('name').value.trim(),
      email: document.getElementById('email').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      city: document.getElementById('city').value.trim(),
      college: document.getElementById('college').value.trim(),
      branch: document.getElementById('branch').value,
      rollNumber: document.getElementById('rollNumber').value.trim(),
      cgpa: document.getElementById('cgpa').value,
      tenthPercentage: document.getElementById('tenthPercentage').value,
      twelfthPercentage: document.getElementById('twelfthPercentage').value,
      graduationYear: document.getElementById('graduationYear').value,
      skills: document.getElementById('skills').value.trim(),
      github: document.getElementById('github').value.trim(),
      linkedin: document.getElementById('linkedin').value.trim(),
      portfolio: document.getElementById('portfolio').value.trim(),
      resumes: []
    };

    // Collect dynamic URLs
    const urlRows = document.querySelectorAll('.url-row');
    const extraUrls = [];
    urlRows.forEach(row => {
      const name = row.querySelector('.url-name').value.trim();
      const value = row.querySelector('.url-value').value.trim();
      if (name || value) extraUrls.push({ name, value });
    });
    profile.extraUrls = extraUrls;

    // Collect custom questions
    const questionRows = document.querySelectorAll('.question-row');
    const customQuestions = [];
    questionRows.forEach(row => {
      const q = row.querySelector('.custom-q').value.trim();
      const a = row.querySelector('.custom-a').value.trim();
      if (q || a) customQuestions.push({ question: q, answer: a });
    });
    profile.customQuestions = customQuestions;

    // We must handle file reading asynchronously
    chrome.storage.local.get("profile", async (data) => {
      const oldProfile = data.profile || {};
      const oldResumes = oldProfile.resumes || [];

      const resumeRows = document.querySelectorAll('.resume-row');
      const resumesPromises = Array.from(resumeRows).map(row => {
        return new Promise((resolve) => {
          const roleName = row.querySelector('.resume-role').value.trim();
          const fileInput = row.querySelector('.resume-file');

          if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const reader = new FileReader();
            reader.onload = (e) => {
              resolve({ roleName, fileName: file.name, fileData: e.target.result });
            };
            reader.readAsDataURL(file);
          } else {
            // Attempt to keep existing file if present
            const oldR = oldResumes.find(r => r.roleName === roleName);
            if (oldR) {
              resolve({ roleName, fileName: oldR.fileName, fileData: oldR.fileData });
            } else {
              if (roleName) resolve({ roleName, fileName: '', fileData: '' });
              else resolve(null);
            }
          }
        });
      });

      const processedResumes = (await Promise.all(resumesPromises)).filter(r => r !== null && (r.roleName || r.fileData));
      profile.resumes = processedResumes;

      // Save to local storage finally
      chrome.storage.local.set({ profile: profile }, () => {
        showToast('Profile saved successfully', 'success');
      });
    });
  }

  /**
   * Loads profile from Chrome storage and populates inputs
   */
  function loadProfile() {
    chrome.storage.local.get("profile", (data) => {
      if (data.profile) {
        const p = data.profile;
        
        // Populate standard inputs
        document.getElementById('name').value = p.name || '';
        document.getElementById('email').value = p.email || '';
        document.getElementById('phone').value = p.phone || '';
        document.getElementById('city').value = p.city || '';
        document.getElementById('college').value = p.college || '';
        if (p.branch) document.getElementById('branch').value = p.branch;
        document.getElementById('rollNumber').value = p.rollNumber || '';
        document.getElementById('cgpa').value = p.cgpa || '';
        document.getElementById('tenthPercentage').value = p.tenthPercentage || '';
        document.getElementById('twelfthPercentage').value = p.twelfthPercentage || '';
        document.getElementById('graduationYear').value = p.graduationYear || '';
        document.getElementById('skills').value = p.skills || '';
        document.getElementById('github').value = p.github || '';
        document.getElementById('linkedin').value = p.linkedin || '';
        document.getElementById('portfolio').value = p.portfolio || '';

        // Populate generic dynamic URLs
        urlsContainer.innerHTML = '';
        if (p.extraUrls && p.extraUrls.length > 0) {
          p.extraUrls.forEach(url => addUrlRow(url.name, url.value));
        }

        // Populate Custom Questions
        questionsContainer.innerHTML = '';
        if (p.customQuestions && p.customQuestions.length > 0) {
          p.customQuestions.forEach(q => addQuestionRow(q.question, q.answer));
        }

        // Populate resumes
        resumeContainer.innerHTML = '';
        if (p.resumes && p.resumes.length > 0) {
          p.resumes.forEach(r => addResumeRow(r.roleName, r.fileName));
        } else {
          addResumeRow(); // Add an empty row by default if none exist
        }
      } else {
        addResumeRow(); // Add an empty row by default
      }
    });

    // Remove has-error classes on input
    document.querySelectorAll('input, select, textarea').forEach(el => {
      el.addEventListener('input', () => {
        el.closest('.form-group')?.classList.remove('has-error');
      });
    });
  }

  /**
   * Clears form and removes profile from storage
   */
  function handleClear() {
    if (confirm('Are you sure you want to clear your saved profile?')) {
      chrome.storage.local.remove('profile', () => {
        form.reset();
        resumeContainer.innerHTML = '';
        urlsContainer.innerHTML = '';
        questionsContainer.innerHTML = '';
        addResumeRow(); // Add empty row back
        
        // Clear all errors
        document.querySelectorAll('.form-group.has-error').forEach(el => {
          el.classList.remove('has-error');
        });

        showToast('Profile cleared', 'info');
      });
    }
  }

  function addUrlRow(nameValue = '', urlValue = '') {
    const row = document.createElement('div');
    row.className = 'dynamic-row url-row';
    
    row.innerHTML = `
      <div class="dynamic-inputs">
        <input type="text" class="url-name" placeholder="Website Name (e.g. LeetCode)" value="${nameValue}">
        <input type="url" class="url-value" placeholder="https://..." value="${urlValue}">
      </div>
      <button type="button" class="btn-remove-dynamic" title="Remove URL">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
      </button>
    `;

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
      <button type="button" class="btn-remove-dynamic" title="Remove Question">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
      </button>
    `;

    row.querySelector('.btn-remove-dynamic').addEventListener('click', () => row.remove());
    questionsContainer.appendChild(row);
  }

  /**
   * Adds a new dynamic resume row to the container
   */
  function addResumeRow(roleValue = '', savedFileName = '') {
    const row = document.createElement('div');
    row.className = 'resume-row';
    
    let fileInfoText = savedFileName ? `Previously saved: <strong>${savedFileName}</strong>` : 'No file chosen';

    row.innerHTML = `
      <div class="resume-inputs">
        <input type="text" class="resume-role" placeholder="Role (e.g., SDE Resume)" value="${roleValue}">
        <div class="file-input-wrapper">
          <input type="file" class="resume-file" accept=".pdf,.doc,.docx" />
          <span class="old-file-name" style="margin-top:2px;">${fileInfoText}</span>
        </div>
      </div>
      <button type="button" class="btn-remove-resume" title="Remove Resume">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
      </button>
    `;

    const removeBtn = row.querySelector('.btn-remove-resume');
    removeBtn.addEventListener('click', () => {
      row.remove();
      // Ensure at least one empty row remains
      if (resumeContainer.children.length === 0) {
        addResumeRow();
      }
    });

    resumeContainer.appendChild(row);
  }

  /**
   * Displays a toast notification
   * @param {string} message 
   * @param {string} type 'success' | 'error' | 'info'
   */
  function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    // Remove toast after duration
    setTimeout(() => {
      toast.classList.add('fade-out');
      // Wait for animation to finish before removing from DOM
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3000);
  }
});
