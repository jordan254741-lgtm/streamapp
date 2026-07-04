import { chromium } from 'playwright';

const browser = await chromium.launch({
  executablePath: '/home/mike/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome',
  headless: true,
  args: ['--no-sandbox']
});

const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const results = [];

async function snap(name) {
  await page.waitForTimeout(500);
  await page.screenshot({ path: `screenshot-${name}.png`, fullPage: true });
  results.push(name);
}

// Light theme
await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
await snap('light-login');

await page.goto('http://localhost:5173/register', { waitUntil: 'networkidle' });
await snap('light-register');

// Dark theme
await page.evaluate(() => {
  document.documentElement.classList.add('dark');
  localStorage.setItem('streamapp-theme', 'dark');
});
await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
await snap('dark-login');

await page.goto('http://localhost:5173/register', { waitUntil: 'networkidle' });
await snap('dark-register');

// Verify button visibility
const btnText = await page.evaluate(() => {
  const btn = document.querySelector('button[aria-label*="Theme"]');
  if (!btn) return 'NO BUTTON FOUND';
  const rect = btn.getBoundingClientRect();
  return `visible: ${rect.width > 0 && rect.height > 0}, size: ${rect.width}x${rect.height}, text: ${btn.textContent}`;
});
console.log('Theme toggle:', btnText);

// Verify card bg in dark mode
const cardBg = await page.evaluate(() => {
  const cards = document.querySelectorAll('.bg-card');
  if (cards.length === 0) return 'NO CARDS FOUND';
  const style = getComputedStyle(cards[0]);
  return `bg-card color: ${style.backgroundColor}, count: ${cards.length}`;
});
console.log('Card backgrounds:', cardBg);

// Verify no white-on-white
const body = await page.textContent('body');
const errorKeywords = ['invisible', 'hidden', 'white text', 'undefined'];
for (const kw of errorKeywords) {
  if (body.toLowerCase().includes(kw)) console.log(`WARNING: "${kw}" found in page`);
}

console.log('All screenshots:', results.join(', '));
await browser.close();
