import { fillQuestion, clearQuestion } from './formFiller.js';

const PANEL_ID = 'paf-review-panel';

function createEl(tag, styles, text) {
  const el = document.createElement(tag);
  if (styles) el.style.cssText = styles;
  if (text != null) el.textContent = text;
  return el;
}

export function showReviewPanel(matched, unmatched, profile) {
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
      if (editable) {
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

  addSection('MATCHED', '#10b981', matched.map((m) => ({ ...m })), true);
  addSection('UNMATCHED', '#f59e0b', unmatched.map((u) => ({ label: u.label, answer: '', question: u.question })), true);

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
