(function () {
  'use strict';

  const LABEL_SELECTORS = [
    '.M7eMe',
    '.freebirdFormviewerComponentsQuestionBaseTitle',
    '[role="heading"]'
  ];

  const QUESTION_CONTAINER_SELECTORS = [
    '.freebirdFormviewerComponentsQuestionBaseRoot',
    '[data-params]',
    '.geS5n',
    'div[role="listitem"]'
  ];

  function getLabelText(el) {
    return (el.textContent || '').replace(/\*/g, '').trim();
  }

  function findQuestionContainer(labelEl) {
    let node = labelEl;
    for (let i = 0; i < 12 && node; i++) {
      if (QUESTION_CONTAINER_SELECTORS.some((sel) => node.matches?.(sel))) {
        return node;
      }
      node = node.parentElement;
    }
    return labelEl.closest('div[role="listitem"]') || labelEl.parentElement?.parentElement || labelEl.parentElement;
  }

  function findInputs(container) {
    const textInputs = container.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="number"], input[type="url"]');
    const textareas = container.querySelectorAll('textarea');
    const radios = container.querySelectorAll('input[type="radio"]');
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    const listboxes = container.querySelectorAll('[role="listbox"]');

    if (listboxes.length > 0) {
      const options = [];
      listboxes.forEach((lb) => {
        lb.querySelectorAll('[role="option"], [data-value]').forEach((opt) => {
          const t = (opt.textContent || opt.getAttribute('data-value') || '').trim();
          if (t) options.push(t);
        });
      });
      return { type: 'dropdown', element: listboxes[0], elements: Array.from(listboxes), options };
    }

    if (radios.length > 0) {
      const options = [];
      radios.forEach((r) => {
        const label = r.closest('[role="radio"]') || r.parentElement;
        const t = (label?.textContent || r.value || '').trim();
        if (t) options.push(t);
      });
      return { type: 'radio', element: radios[0], elements: Array.from(radios), options };
    }

    if (checkboxes.length > 0) {
      const options = [];
      checkboxes.forEach((c) => {
        const label = c.closest('[role="checkbox"]') || c.parentElement;
        const t = (label?.textContent || c.value || '').trim();
        if (t) options.push(t);
      });
      return { type: 'checkbox', element: checkboxes[0], elements: Array.from(checkboxes), options };
    }

    if (textareas.length > 0) {
      return { type: 'textarea', element: textareas[0], elements: [textareas[0]], options: [] };
    }

    if (textInputs.length > 0) {
      return { type: 'text', element: textInputs[0], elements: [textInputs[0]], options: [] };
    }

    return null;
  }

  function collectLabelElements() {
    const found = new Set();
    const labels = [];

    LABEL_SELECTORS.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        if (found.has(el)) return;
        const text = getLabelText(el);
        if (text.length > 1) {
          found.add(el);
          labels.push(el);
        }
      });
    });

    document.querySelectorAll('div').forEach((div) => {
      if (found.has(div)) return;
      const direct = Array.from(div.childNodes)
        .filter((n) => n.nodeType === Node.TEXT_NODE)
        .map((n) => n.textContent.trim())
        .join('');
      if ((direct.endsWith('?') || direct.endsWith('*')) && direct.length > 2 && direct.length < 200) {
        found.add(div);
        labels.push(div);
      }
    });

    return labels;
  }

  function scanForm() {
    try {
      const labelElements = collectLabelElements();
      const questions = [];
      const seenContainers = new Set();

      labelElements.forEach((labelEl) => {
        const label = getLabelText(labelEl);
        if (!label) return;

        const container = findQuestionContainer(labelEl);
        if (!container || seenContainers.has(container)) return;
        seenContainers.add(container);

        const inputInfo = findInputs(container);
        if (!inputInfo) return;

        questions.push({
          label,
          type: inputInfo.type,
          element: inputInfo.element,
          elements: inputInfo.elements,
          options: inputInfo.options
        });
      });

      return questions;
    } catch (err) {
      console.error('[AutoFill][Scanner] Error:', err);
      return [];
    }
  }

  const KEYWORDS = {
    name: [
      'full name', 'your name', 'candidate name', 'applicant name',
      'student name', 'name of student', 'enter your name', 'name*'
    ],
    email: [
      'email', 'e-mail', 'email id', 'email address', 'mail id',
      'email-id', 'official email', 'college email', 'personal email'
    ],
    phone: [
      'phone', 'mobile', 'contact number', 'phone no', 'mobile no',
      'contact no', 'phone number', 'mobile number', 'whatsapp number',
      'cell number', 'telephone'
    ],
    rollNumber: [
      'roll no', 'roll number', 'roll no.', 'your roll no',
      'enrollment number', 'enrollment no', 'enrolment number',
      'student id', 'university roll no', 'exam roll no',
      'admit card number', 'college id'
    ],
    registrationNumber: [
      'registration number', 'registration no', 'reg no', 'reg number'
    ],
    cgpa: [
      'cgpa', 'gpa', 'grade point', 'cumulative grade', 'sgpa',
      'current cgpa', 'aggregate cgpa', 'overall cgpa', 'cpi',
      'current gpa', 'academic score', 'pointer'
    ],
    cgpaOutOf: [
      'cgpa out of', 'gpa scale', 'out of', 'maximum cgpa', 'cgpa /10'
    ],
    percentageEquivalent: [
      'percentage equivalent', 'cgpa percentage', 'equivalent percentage'
    ],
    tenthPercentage: [
      '10th', 'tenth', 'ssc', 'matriculation', 'class 10', 'matric',
      'secondary', '10th marks', '10th percentage', 'x percentage',
      'class x', 'hslc', 'sslc', 'board 10', 'std 10'
    ],
    tenthBoard: [
      '10th board', 'ssc board', 'class 10 board', 'matriculation board',
      'secondary board', 'board name 10th'
    ],
    tenthYear: [
      '10th year', 'ssc year', 'year of passing 10th', 'class 10 year',
      'secondary passing year', '10th passing year'
    ],
    twelfthPercentage: [
      '12th', 'twelfth', 'intermediate', 'higher secondary', 'class 12',
      'hsc', 'puc', '12th marks', '12th percentage', 'xii percentage',
      'class xii', 'plus two', '+2', 'std 12', 'senior secondary'
    ],
    twelfthBoard: [
      '12th board', 'hsc board', 'class 12 board', 'intermediate board',
      'higher secondary board', 'board name 12th'
    ],
    twelfthYear: [
      '12th year', 'hsc year', 'year of passing 12th', 'class 12 year',
      'intermediate passing year', '12th passing year'
    ],
    aggregatePercentage: [
      'aggregate', 'overall percentage', 'total percentage',
      'aggregate marks', 'cumulative percentage', 'overall marks'
    ],
    branch: [
      'branch', 'department', 'stream', 'course', 'discipline',
      'field of study', 'major', 'specialization', 'program',
      'degree program', 'engineering branch'
    ],
    graduationYear: [
      'year of passing', 'graduation year', 'batch', 'passing year',
      'pass out', 'grad year', 'expected graduation', 'year of graduation',
      'completion year', 'degree year', 'convocation year',
      'year of completion', 'batch of', 'passout year'
    ],
    currentYear: [
      'current year', 'year of study', 'semester', 'current semester',
      'studying in', 'which year', 'academic year'
    ],
    backlogsCurrent: [
      'current backlog', 'active backlog', 'standing backlog', 'live backlog',
      'number of backlog', 'backlog count'
    ],
    backlogsTotal: [
      'total backlog', 'history of backlog', 'backlog history', 'overall backlog'
    ],
    backlogs: [
      'backlog', 'arrear', 'back paper', 'failed subject',
      'pending subject', 'kt', 'atkt'
    ],
    college: [
      'college', 'university', 'institution', 'institute name',
      'school name', 'college name', 'university name',
      'name of college', 'name of university', 'alma mater'
    ],
    skills: [
      'skills', 'technical skills', 'technologies', 'tech stack',
      'tools known', 'programming languages', 'technologies known',
      'technical expertise', 'core skills', 'key skills',
      'software skills', 'it skills', 'coding skills'
    ],
    github: ['github', 'github profile', 'github link', 'github url'],
    linkedin: ['linkedin', 'linkedin profile', 'linkedin url', 'linkedin link'],
    portfolio: ['portfolio', 'personal website', 'portfolio link', 'website url'],
    leetcode: ['leetcode', 'leet code', 'leetcode profile'],
    hackerrank: ['hackerrank', 'hacker rank'],
    codeforces: ['codeforces', 'code forces'],
    city: [
      'city', 'location', 'hometown', 'current location', 'place',
      'current city', 'home city', 'residing city', 'native place'
    ],
    state: ['state', 'home state', 'state of residence'],
    gender: ['gender', 'sex', 'male/female'],
    dob: [
      'date of birth', 'dob', 'd.o.b', 'birth date', 'birthdate',
      'date of birth (dd/mm/yyyy)'
    ],
    nationality: ['nationality', 'citizenship', 'country'],
    willingToRelocate: [
      'relocate', 'willing to relocate', 'open to relocation',
      'ready to relocate', 'location preference'
    ],
    preferredRole: [
      'preferred role', 'job preference', 'role applying for',
      'position applying', 'profile preference', 'area of interest',
      'domain preference', 'job role'
    ],
    preferredLocation: [
      'preferred location', 'job location', 'work location preference'
    ],
    expectedSalary: [
      'expected salary', 'salary expectation', 'ctc expected', 'expected ctc'
    ],
    noticePeriod: [
      'notice period', 'joining time', 'availability'
    ],
    workExperience: [
      'work experience', 'experience', 'years of experience',
      'professional experience', 'industry experience'
    ],
    internship: [
      'internship', 'intern experience', 'internship experience',
      'have you done internship', 'internship details'
    ],
    projects: ['project', 'projects', 'project details', 'project name']
  };

  function normalizeLabel(label) {
    return (label || '').toLowerCase().replace(/\*/g, '').replace(/\s+/g, ' ').trim();
  }

  function getProfileValue(profile, fieldKey) {
    const map = {
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      dob: profile.dob,
      gender: profile.gender,
      city: profile.city,
      state: profile.state,
      nationality: profile.nationality,
      college: profile.college,
      branch: profile.branch,
      rollNumber: profile.rollNumber,
      registrationNumber: profile.registrationNumber,
      cgpa: profile.cgpa,
      cgpaOutOf: profile.cgpaOutOf || '10',
      percentageEquivalent: profile.percentageEquivalent,
      tenthPercentage: profile.tenthPercentage,
      tenthBoard: profile.tenthBoard,
      tenthYear: profile.tenthYear,
      twelfthPercentage: profile.twelfthPercentage,
      twelfthBoard: profile.twelfthBoard,
      twelfthYear: profile.twelfthYear,
      graduationYear: profile.graduationYear,
      currentYear: profile.currentYear,
      backlogsCurrent: profile.backlogsCurrent,
      backlogsTotal: profile.backlogsTotal,
      aggregatePercentage: profile.aggregatePercentage,
      skills: profile.skills,
      github: profile.github,
      linkedin: profile.linkedin,
      portfolio: profile.portfolio,
      leetcode: profile.leetcode,
      hackerrank: profile.hackerrank,
      codeforces: profile.codeforces,
      willingToRelocate: profile.willingToRelocate,
      preferredRole: profile.preferredRole,
      preferredLocation: profile.preferredLocation,
      expectedSalary: profile.expectedSalary,
      noticePeriod: profile.noticePeriod
    };

    if (fieldKey === 'workExperience') {
      if (profile.hasWorkExperience === 'yes') {
        return `${profile.workCompany || ''} - ${profile.workRole || ''} (${profile.workDuration || ''})`.trim();
      }
      return profile.hasWorkExperience === 'no' ? 'No' : profile.hasWorkExperience;
    }

    if (fieldKey === 'internship') {
      if (profile.hasInternship === 'yes') {
        return `${profile.internCompany || ''} - ${profile.internRole || ''} (${profile.internDuration || ''})`.trim();
      }
      return profile.hasInternship === 'no' ? 'No' : profile.hasInternship;
    }

    if (fieldKey === 'projects' && profile.projects?.length) {
      return profile.projects
        .map((p) => `${p.name || ''} | ${p.techStack || ''} | ${p.link || ''}`.trim())
        .filter(Boolean)
        .join('\n');
    }

    if (fieldKey === 'backlogs') {
      const current = profile.backlogsCurrent ?? '';
      const total = profile.backlogsTotal ?? '';
      if (current !== '' || total !== '') return String(current || total);
    }

    return map[fieldKey];
  }

  function matchField(label, profile) {
    const norm = normalizeLabel(label);
    if (!norm) return null;

    for (const [fieldKey, keywords] of Object.entries(KEYWORDS)) {
      for (const kw of keywords) {
        if (norm === kw) {
          const val = getProfileValue(profile, fieldKey);
          if (val !== undefined && val !== null && String(val).trim() !== '') {
            return { fieldKey, value: String(val) };
          }
        }
      }
    }

    for (const [fieldKey, keywords] of Object.entries(KEYWORDS)) {
      for (const kw of keywords) {
        if (norm.includes(kw)) {
          const val = getProfileValue(profile, fieldKey);
          if (val !== undefined && val !== null && String(val).trim() !== '') {
            return { fieldKey, value: String(val) };
          }
        }
      }
    }

    for (const cq of profile.customQuestions || []) {
      const qNorm = normalizeLabel(cq.question);
      if (qNorm && (norm === qNorm || norm.includes(qNorm) || qNorm.includes(norm))) {
        if (cq.answer) return { fieldKey: 'custom', value: cq.answer };
      }
    }

    for (const url of profile.extraUrls || []) {
      const nameNorm = normalizeLabel(url.name);
      if (nameNorm && (norm.includes(nameNorm) || nameNorm.includes(norm))) {
        if (url.value) return { fieldKey: 'extraUrl', value: url.value };
      }
    }

    return null;
  }

  function fillTextInput(element, value) {
    if (!element || value == null) return;
    element.focus();
    element.value = String(value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.blur();
  }

  function fillRadio(elements, value) {
    const valLower = String(value).toLowerCase();
    for (const radio of elements) {
      const label = radio.closest('[role="radio"]') || radio.parentElement;
      const text = (label?.textContent || radio.value || '').toLowerCase();
      if (text.includes(valLower) || valLower.includes(text.trim())) {
        (label || radio).click();
        return;
      }
    }
  }

  function fillCheckbox(elements, value) {
    const parts = String(value).split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    for (const checkbox of elements) {
      const label = checkbox.closest('[role="checkbox"]') || checkbox.parentElement;
      const text = (label?.textContent || checkbox.value || '').toLowerCase();
      if (parts.some((p) => text.includes(p) || p.includes(text.trim()))) {
        if (!checkbox.checked) (label || checkbox).click();
      }
    }
  }

  function fillDropdown(element, value) {
    return new Promise((resolve) => {
      try {
        element.click();
        setTimeout(() => {
          const options = document.querySelectorAll('[role="option"], [role="listbox"] [data-value]');
          const valLower = String(value).toLowerCase();
          for (const opt of options) {
            const text = (opt.textContent || opt.getAttribute('data-value') || '').toLowerCase();
            if (text.includes(valLower) || valLower.includes(text.trim())) {
              opt.click();
              break;
            }
          }
          resolve();
        }, 400);
      } catch {
        resolve();
      }
    });
  }

  function fillQuestion(question, value) {
    try {
      if (value == null || String(value).trim() === '') return false;

      switch (question.type) {
        case 'text':
        case 'textarea':
          fillTextInput(question.element, value);
          return true;
        case 'radio':
          fillRadio(question.elements, value);
          return true;
        case 'checkbox':
          fillCheckbox(question.elements, value);
          return true;
        case 'dropdown':
          fillDropdown(question.element, value);
          return true;
        default:
          return false;
      }
    } catch (err) {
      console.warn('[AutoFill][Filler] Field failed:', question.label, err);
      return false;
    }
  }

  function fillForm(questions, profile) {
    const matched = [];
    const unmatched = [];

    questions.forEach((question) => {
      try {
        const match = matchField(question.label, profile);
        if (match) {
          fillQuestion(question, match.value);
          matched.push({
            label: question.label,
            answer: match.value,
            question
          });
        } else {
          unmatched.push({ label: question.label, question });
        }
      } catch (err) {
        console.warn('[AutoFill][Filler] Error on:', question.label, err);
        unmatched.push({ label: question.label, question });
      }
    });

    return { matched, unmatched };
  }

  function clearQuestion(question) {
    try {
      switch (question.type) {
        case 'text':
        case 'textarea':
          fillTextInput(question.element, '');
          break;
        case 'radio':
          question.elements.forEach((r) => { if (r.checked) r.click(); });
          break;
        case 'checkbox':
          question.elements.forEach((c) => { if (c.checked) c.click(); });
          break;
        default:
          break;
      }
    } catch {
      /* ignore */
    }
  }

  const KNOWN_BRANCHES = [
    'cse', 'cs', 'it', 'ece', 'eee', 'ee', 'me', 'mech', 'civil',
    'aids', 'aiml', 'comps', 'extc', 'etc', 'is', 'ise', 'cse-ai',
    'cse-ds', 'mca', 'bca', 'electrical', 'mechanical', 'data science'
  ];

  function getFormTitle() {
    const el = document.querySelector('.freebirdFormviewerViewHeaderTitle');
    if (el) return el.textContent || '';
    return document.title || '';
  }

  function getFormDescription() {
    const el = document.querySelector('.freebirdFormviewerViewHeaderDescription');
    return el ? (el.textContent || '') : '';
  }

  function normalizeBranch(branch) {
    return (branch || '').toLowerCase().replace(/[^a-z0-9+\- ]/g, '').trim();
  }

  function checkEligibility(profile) {
    const issues = [];

    try {
      const title = getFormTitle();
      const description = getFormDescription();
      const combined = `${title} ${description}`.toLowerCase();

      const cgpaPatterns = [
        /(?:minimum|min\.?|atleast|at least|>=?)\s*(?:cgpa|gpa|cpi)\s*(?:of|:)?\s*([\d.]+)/i,
        /(?:cgpa|gpa|cpi)\s*(?:>=?|above|more than|greater than|of)\s*([\d.]+)/i,
        /(?:cgpa|gpa)\s*(?:should be|must be|required)\s*(?:>=?|above)?\s*([\d.]+)/i
      ];

      const userCgpa = parseFloat(profile.cgpa);
      for (const pattern of cgpaPatterns) {
        const match = combined.match(pattern);
        if (match) {
          const required = parseFloat(match[1]);
          if (!isNaN(required) && !isNaN(userCgpa) && userCgpa < required) {
            issues.push(`CGPA requirement not met: form requires ≥ ${required}, your CGPA is ${userCgpa}`);
          }
          break;
        }
      }

      const userBranch = normalizeBranch(profile.branch);
      for (const branch of KNOWN_BRANCHES) {
        const branchPatterns = [
          new RegExp(`only\\s+(?:for\\s+)?${branch}\\b`, 'i'),
          new RegExp(`${branch}\\s+students?\\s+only`, 'i'),
          new RegExp(`open\\s+to\\s+${branch}\\b`, 'i')
        ];
        const mentionsBranch = branchPatterns.some((p) => p.test(combined));
        if (mentionsBranch && userBranch && !userBranch.includes(branch) && !branch.includes(userBranch)) {
          issues.push(`Branch restriction: form appears limited to ${branch.toUpperCase()}, your branch is ${profile.branch}`);
        }
      }

      const batchPatterns = [
        /(?:batch|passout|pass\.out|graduating)\s*(?:of|:)?\s*(20\d\d)/i,
        /(20\d\d)\s*(?:batch|passout|graduating)/i
      ];

      const userYear = String(profile.graduationYear || '');
      for (const pattern of batchPatterns) {
        const match = combined.match(pattern);
        if (match) {
          const requiredYear = match[1];
          if (userYear && userYear !== requiredYear) {
            issues.push(`Batch/year mismatch: form targets ${requiredYear}, your graduation year is ${userYear}`);
          }
        }
      }

      const noBacklogPhrases = [
        'no backlog', 'no arrear', 'no active backlog', 'zero backlog',
        'no history of backlog'
      ];
      const requiresNoBacklog = noBacklogPhrases.some((p) => combined.includes(p));
      if (requiresNoBacklog) {
        const current = parseInt(profile.backlogsCurrent, 10);
        const total = parseInt(profile.backlogsTotal, 10);
        if ((!isNaN(current) && current > 0) || (!isNaN(total) && total > 0)) {
          issues.push('Backlog restriction: form requires no backlogs, but your profile lists backlogs');
        }
      }

      const pctPattern = /([\d.]+)\s*%\s*(?:and above|or above|minimum|atleast)/i;
      const pctMatch = combined.match(pctPattern);
      if (pctMatch) {
        const requiredPct = parseFloat(pctMatch[1]);
        const userPct = parseFloat(profile.aggregatePercentage || profile.tenthPercentage || profile.twelfthPercentage);
        if (!isNaN(requiredPct) && !isNaN(userPct) && userPct < requiredPct) {
          issues.push(`Percentage requirement not met: form requires ≥ ${requiredPct}%, your profile shows ${userPct}%`);
        }
      }
    } catch (err) {
      console.error('[AutoFill][Eligibility] Error:', err);
    }

    return { eligible: issues.length === 0, issues };
  }

  function showIneligibilityBanner(issues) {
    if (document.getElementById('paf-eligibility-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'paf-eligibility-banner';
    banner.style.cssText = [
      'position:fixed', 'top:0', 'left:0', 'width:100%', 'z-index:999999',
      'background:#dc2626', 'color:#fff', 'padding:16px 20px',
      'font-family:Inter,system-ui,sans-serif', 'font-size:14px',
      'box-shadow:0 4px 12px rgba(0,0,0,0.2)'
    ].join(';');

    const title = document.createElement('div');
    title.style.fontWeight = '600';
    title.style.marginBottom = '8px';
    title.textContent = 'Placement AutoFill — You may not be eligible for this form';
    banner.appendChild(title);

    issues.forEach((issue) => {
      const li = document.createElement('div');
      li.style.marginBottom = '4px';
      li.textContent = `• ${issue}`;
      banner.appendChild(li);
    });

    const dismiss = document.createElement('button');
    dismiss.textContent = 'Dismiss';
    dismiss.style.cssText = [
      'margin-top:12px', 'padding:6px 16px', 'background:#fff', 'color:#dc2626',
      'border:none', 'border-radius:6px', 'cursor:pointer', 'font-weight:600'
    ].join(';');
    dismiss.addEventListener('click', () => banner.remove());
    banner.appendChild(dismiss);

    document.body.prepend(banner);
  }

  const PANEL_ID = 'paf-review-panel';

  function createEl(tag, styles, text) {
    const el = document.createElement(tag);
    if (styles) el.style.cssText = styles;
    if (text != null) el.textContent = text;
    return el;
  }

  function showReviewPanel(matched, unmatched, profile) {
    if (document.getElementById(PANEL_ID)) return;

    const filledQuestions = [...matched.map((m) => m.question), ...unmatched.map((u) => u.question)];

    const panel = createEl('div', [
      'position:fixed', 'top:0', 'right:0', 'width:360px', 'height:100vh',
      'z-index:999999', 'background:#fff', 'box-shadow:-4px 0 20px rgba(0,0,0,0.15)',
      'font-family:Inter,system-ui,sans-serif', 'font-size:13px', 'color:#1f2937',
      'display:flex', 'flex-direction:column'
    ].join(';'));
    panel.id = PANEL_ID;

    const header = createEl('div', [
      'padding:16px', 'border-bottom:1px solid #e5e7eb', 'display:flex',
      'justify-content:space-between', 'align-items:center', 'flex-shrink:0'
    ].join(';'));
    const headerTitle = createEl('div', 'font-weight:600;font-size:14px;', 'Placement AutoFill — Review Before Submit');
    const closeBtn = createEl('button', [
      'background:none', 'border:none', 'font-size:18px', 'cursor:pointer',
      'color:#6b7280', 'padding:4px 8px'
    ].join(';'), '✕');
    header.appendChild(headerTitle);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    const body = createEl('div', 'overflow-y:auto;flex:1;padding:16px;');
    panel.appendChild(body);

    function addSection(title, dotColor, items, editable) {
      const section = createEl('div', 'margin-bottom:20px;');
      const sectionTitle = createEl('div', 'font-weight:600;margin-bottom:10px;display:flex;align-items:center;gap:8px;');
      const dot = createEl('span', `width:8px;height:8px;border-radius:50%;background:${dotColor};display:inline-block;`);
      sectionTitle.appendChild(dot);
      sectionTitle.appendChild(document.createTextNode(title));
      section.appendChild(sectionTitle);

      items.forEach((item) => {
        const row = createEl('div', 'margin-bottom:12px;padding:10px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;');
        const label = createEl('div', 'font-size:12px;color:#6b7280;margin-bottom:6px;', item.label);
        const input = createEl('input', [
          'width:100%', 'padding:8px', 'border:1px solid #e5e7eb', 'border-radius:6px',
          'font-size:13px', 'font-family:inherit'
        ].join(';'));
        input.type = 'text';
        input.value = item.answer || '';
        {
          input.addEventListener('input', () => {
            fillQuestion(item.question, input.value);
          });
        }
        row.appendChild(label);
        row.appendChild(input);
        section.appendChild(row);
      });

      body.appendChild(section);
    }

    addSection('MATCHED', '#10b981', matched.map((m) => ({ ...m })));
    addSection('UNMATCHED', '#f59e0b', unmatched.map((u) => ({ label: u.label, answer: '', question: u.question })));

    const resumeSection = createEl('div', 'margin-bottom:20px;');
    resumeSection.appendChild(createEl('div', 'font-weight:600;margin-bottom:10px;', 'Resume'));
    const select = createEl('select', [
      'width:100%', 'padding:8px', 'border:1px solid #e5e7eb', 'border-radius:6px',
      'font-size:13px', 'margin-bottom:8px'
    ].join(';'));
    const defaultOpt = createEl('option', '', 'Select a resume…');
    defaultOpt.value = '';
    select.appendChild(defaultOpt);
    (profile.resumes || []).forEach((r, i) => {
      const opt = createEl('option', '', r.roleName || `Resume ${i + 1}`);
      opt.value = r.downloadUrl || '';
      select.appendChild(opt);
    });
    resumeSection.appendChild(select);

    const downloadBtn = createEl('a', [
      'display:none', 'padding:8px 12px', 'background:#8B5CF6', 'color:#fff',
      'border-radius:6px', 'text-decoration:none', 'font-weight:600', 'font-size:12px',
      'text-align:center'
    ].join(';'), 'Download Resume');
    downloadBtn.target = '_blank';
    downloadBtn.rel = 'noopener noreferrer';
    select.addEventListener('change', () => {
      if (select.value) {
        downloadBtn.href = select.value;
        downloadBtn.style.display = 'inline-block';
      } else {
        downloadBtn.style.display = 'none';
      }
    });
    resumeSection.appendChild(downloadBtn);
    body.appendChild(resumeSection);

    const footer = createEl('div', [
      'padding:16px', 'border-top:1px solid #e5e7eb', 'display:flex', 'gap:10px', 'flex-shrink:0'
    ].join(';'));
    const confirmBtn = createEl('button', [
      'flex:1', 'padding:10px', 'background:#8B5CF6', 'color:#fff', 'border:none',
      'border-radius:8px', 'font-weight:600', 'cursor:pointer'
    ].join(';'), 'Confirm & Close');
    const cancelBtn = createEl('button', [
      'flex:1', 'padding:10px', 'background:#e5e7eb', 'color:#1f2937', 'border:none',
      'border-radius:8px', 'font-weight:600', 'cursor:pointer'
    ].join(';'), 'Cancel');
    footer.appendChild(confirmBtn);
    footer.appendChild(cancelBtn);
    panel.appendChild(footer);

    function closePanel() {
      panel.remove();
    }

    closeBtn.addEventListener('click', closePanel);
    confirmBtn.addEventListener('click', closePanel);
    cancelBtn.addEventListener('click', () => {
      filledQuestions.forEach((q) => clearQuestion(q));
      closePanel();
    });

    document.body.appendChild(panel);
  }

  const TOAST_ID = 'paf-toast';

  function showToast(message) {
    if (document.getElementById(TOAST_ID)) return;
    const toast = document.createElement('div');
    toast.id = TOAST_ID;
    toast.textContent = message;
    toast.style.cssText = [
      'position:fixed', 'bottom:24px', 'left:50%', 'transform:translateX(-50%)',
      'background:#1f2937', 'color:#fff', 'padding:12px 20px', 'border-radius:999px',
      'z-index:999999', 'font-family:Inter,system-ui,sans-serif', 'font-size:13px',
      'box-shadow:0 4px 12px rgba(0,0,0,0.2)'
    ].join(';');
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
  }

  function waitForFormLoad() {
    return new Promise((resolve) => {
      const ready = () =>
        document.querySelector('.freebirdFormviewerViewHeader') ||
        document.querySelector('.freebirdFormviewerViewHeaderTitle') ||
        document.title.includes('Google Forms');

      if (ready()) {
        setTimeout(resolve, 1000);
        return;
      }

      const observer = new MutationObserver(() => {
        if (ready()) {
          observer.disconnect();
          setTimeout(resolve, 1000);
        }
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });

      setTimeout(() => {
        observer.disconnect();
        resolve();
      }, 15000);
    });
  }

  async function run() {
    try {
      const data = await new Promise((resolve) => {
        chrome.storage.local.get(['profile', 'isAuthenticated'], resolve);
      });

      if (!data.isAuthenticated) return;

      const profile = data.profile;
      if (!profile || !profile.name) {
        showToast('Please complete your profile in the extension');
        return;
      }

      await waitForFormLoad();

      const eligibility = checkEligibility(profile);
      if (!eligibility.eligible) {
        showIneligibilityBanner(eligibility.issues);
        return;
      }

      const questions = scanForm();
      if (questions.length === 0) {
        console.log('[AutoFill] No form questions detected.');
        return;
      }

      const { matched, unmatched } = fillForm(questions, profile);
      showReviewPanel(matched, unmatched, profile);
    } catch (err) {
      console.error('[AutoFill][Content] Error:', err);
    }
  }

  run();

})();
