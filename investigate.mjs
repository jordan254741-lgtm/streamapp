import { chromium } from 'playwright'

const browser = await chromium.launch({
  executablePath: '/home/mike/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome',
  headless: true,
})

const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })

const requests = []
page.on('request', req => {
  const url = req.url()
  if (url.includes('m3u8') || url.includes('.mp4') || url.includes('caption') || url.includes('dash') || url.includes('hls') || url.includes('playlist') || url.includes('.ts')) {
    requests.push({ url, method: req.method(), type: req.resourceType() })
  }
})

const responses = []
page.on('response', res => {
  const url = res.url()
  if (url.includes('caption') || url.includes('detail') || url.includes('play-list') || url.includes('get-domain')) {
    responses.push({ url, status: res.status() })
  }
})

console.log('Loading MovieBox detail page for Enola Holmes 3...')
await page.goto('https://moviebox.ph/moviedetail/enola-holmes-3-gs48BrbKpV2', {
  waitUntil: 'networkidle',
  timeout: 30000,
})

// Wait for video player to initialize
await page.waitForTimeout(8000)

console.log('\n=== Network requests for video/media ===')
for (const r of requests) {
  console.log(`  ${r.method} ${r.url.substring(0, 150)}`)
}

console.log('\n=== API responses ===')
for (const r of responses) {
  console.log(`  ${r.status} ${r.url.substring(0, 150)}`)
}

// Check page for video elements
const videos = await page.$$('video')
console.log(`\n=== Video elements: ${videos.length} ===`)
for (let i = 0; i < videos.length; i++) {
  const src = await videos[i].getAttribute('src')
  const poster = await videos[i].getAttribute('poster')
  const duration = await videos[i].evaluate(el => el.duration)
  console.log(`  Video ${i}: src=${(src || '').substring(0, 100)}, duration=${duration}`)
}

// Check page text for context
const text = await page.evaluate(() => document.body.innerText)
console.log(`\nPage text (first 500): ${text.substring(0, 500)}`)

await page.screenshot({ path: '/tmp/moviebox_detail.png' })

// Also check for any iframes or embeds
const iframes = await page.$$('iframe')
console.log(`\nIframes: ${iframes.length}`)

await browser.close()
