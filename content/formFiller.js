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

export function fillTextInput(element, value) {
  if (!element || value == null) return;
  element.focus();
  element.value = String(value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  element.blur();
}

export function fillRadio(elements, value) {
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

export function fillCheckbox(elements, value) {
  const parts = String(value).split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  for (const checkbox of elements) {
    const label = checkbox.closest('[role="checkbox"]') || checkbox.parentElement;
    const text = (label?.textContent || checkbox.value || '').toLowerCase();
    if (parts.some((p) => text.includes(p) || p.includes(text.trim()))) {
      if (!checkbox.checked) (label || checkbox).click();
    }
  }
}

export function fillDropdown(element, value) {
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

export function fillQuestion(question, value) {
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

export function fillForm(questions, profile) {
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

export function clearQuestion(question) {
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
