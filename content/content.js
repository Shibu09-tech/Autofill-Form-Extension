import { scanForm } from './formScanner.js';
import { fillForm } from './formFiller.js';
import { checkEligibility, showIneligibilityBanner } from './eligibilityChecker.js';
import { showReviewPanel } from './reviewPanel.js';

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
