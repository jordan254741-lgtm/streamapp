import { chromium } from 'playwright'

const CHROME_PATH = '/home/mike/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome'
const BASE = 'http://localhost:5173'
const VIEWPORT = { width: 1280, height: 800 }

const SUPABASE_URL = 'https://fjfoxblggheamexvrxdo.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqZm94YmxnZ2hlYW1leHZyeGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMzM0MDQsImV4cCI6MjA5NjYwOTQwNH0.enLMiuOsKGuJT4jXjKyzb0zrHJ6y6pMvREb2bOoF5LY'

const TEST_EMAIL = `review-session-${Date.now()}@example.com`
const TEST_PASSWORD = 'TestPass123!'

async function createTestUser() {
  const headers = { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY }

  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  })
  const data = await res.json()
  if (data.access_token) return data

  // Fallback: try to sign in
  const res2 = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  })
  return res2.json()
}

async function main() {
  await createTestUser()

  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
  })

  const ctx = await browser.newContext({ viewport: VIEWPORT })
  const page = await ctx.newPage()

  // 1. Login page
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.screenshot({ path: '/home/mike/streamapp/screenshot-login.png', fullPage: true })
  console.log('saved screenshot-login.png')

  // 2. Register page
  await page.goto(`${BASE}/register`, { waitUntil: 'networkidle' })
  await page.screenshot({ path: '/home/mike/streamapp/screenshot-register.png', fullPage: true })
  console.log('saved screenshot-register.png')

  // 3. Browse – log in with our test user
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.fill('input[type="email"]', TEST_EMAIL)
  await page.fill('input[type="password"]', TEST_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/browse', { timeout: 10000 }).catch(() => {})
  await page.waitForTimeout(3000)
  await page.screenshot({ path: '/home/mike/streamapp/screenshot-browse.png', fullPage: true })
  console.log('saved screenshot-browse.png')

  await browser.close()
  console.log('\nDone. Screenshots saved to /home/mike/streamapp/')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
