import { chromium } from 'playwright'

const browser = await chromium.launch({
  executablePath: '/home/mike/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome',
  headless: true,
})

const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })

// Track all requests that look like video/streaming
const streamUrls = new Set()
page.on('request', req => {
  const url = req.url()
  if (url.includes('.m3u8') || url.includes('.mpd') || url.includes('.ts') || 
      url.includes('netfilm') || url.includes('123movie') || url.includes('playlist') ||
      (url.includes('.mp4') && !url.includes('macdn'))) {
    streamUrls.add(url)
    console.log('STREAM REQ:', url)
  }
})

// Track responses for API endpoints
page.on('response', async res => {
  const url = res.url()
  if (url.includes('subject/caption') || url.includes('detail?')) {
    try {
      const body = await res.text()
      console.log(`API ${url.substring(0, 120)} -> ${body.substring(0, 300)}`)
    } catch {}
  }
})

console.log('Loading MovieBox detail page...')
await page.goto('https://moviebox.ph/moviedetail/citizen-vigilante-IIt7oflBjm2', {
  waitUntil: 'domcontentloaded',
  timeout: 30000,
})
await page.waitForTimeout(3000)

console.log('\nLooking for "Watch Online" button...')

// Try to find and click the Watch Online button
const buttons = await page.$$('button, a, div[role="button"]')
for (const btn of buttons) {
  const text = await btn.evaluate(el => el.textContent?.trim() || '')
  if (text.includes('Watch Online') || text.includes('Play') || text.includes('▶')) {
    console.log('Found button:', text)
    const box = await btn.boundingBox()
    if (box) {
      console.log('Clicking...')
      await btn.click()
      await page.waitForTimeout(5000)
      break
    }
  }
}

// Check all videos again
const videos = await page.$$('video')
console.log(`\nVideos after click: ${videos.length}`)
for (let i = 0; i < videos.length; i++) {
  const src = await videos[i].getAttribute('src')
  const dur = await videos[i].evaluate(el => el.duration)
  console.log(`  Video ${i}: src=${(src || '').substring(0, 100)}, duration=${dur}s`)
}

// Check if any new video URLs were loaded
console.log('\nCollected stream URLs:', [...streamUrls])

await browser.close()
