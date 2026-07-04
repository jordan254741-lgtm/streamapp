import { chromium } from 'playwright';
const browser = await chromium.launch({
  executablePath: '/home/mike/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome',
  headless: true,
  args: ['--no-sandbox']
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

// Light login
await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
await page.screenshot({ path: 'screenshot-light-login.png', fullPage: true });

const toggleLight = await page.evaluate(() => {
  const btn = document.querySelector('button.absolute.top-4');
  return btn ? `FOUND: ${btn.textContent.trim()}` : 'NOT FOUND';
});
console.log('Light theme toggle:', toggleLight);

// Dark login
await page.evaluate(() => {
  document.documentElement.classList.add('dark');
  localStorage.setItem('streamapp-theme', 'dark');
});
await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
await page.screenshot({ path: 'screenshot-dark-login.png', fullPage: true });

const toggleDark = await page.evaluate(() => {
  const btn = document.querySelector('button.absolute.top-4');
  return btn ? `FOUND: ${btn.textContent.trim()}` : 'NOT FOUND';
});
console.log('Dark theme toggle:', toggleDark);

// Verify card bg in dark
const cardBg = await page.evaluate(() => {
  const el = document.querySelector('.bg-card');
  if (!el) return 'NO bg-card found';
  return getComputedStyle(el).backgroundColor;
});
console.log('bg-card color:', cardBg);

// Verify the page bg
const pageBg = await page.evaluate(() => {
  const el = document.querySelector('.min-h-screen');
  if (!el) return 'NO min-h-screen';
  return getComputedStyle(el).backgroundColor;
});
console.log('Page bg color:', pageBg);

await browser.close();
