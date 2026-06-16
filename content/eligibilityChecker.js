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

export function checkEligibility(profile) {
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

export function showIneligibilityBanner(issues) {
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
