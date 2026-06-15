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

export function scanForm() {
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
