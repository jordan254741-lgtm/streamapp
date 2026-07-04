import { chromium } from 'playwright'

const browser = await chromium.launch({
  executablePath: '/home/mike/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome',
  headless: true,
})

const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })

// Track all network requests
const allReqs = []
page.on('request', req => {
  allReqs.push({ url: req.url(), type: req.resourceType() })
})

async function checkMovie(label, detailPath) {
  console.log(`\n=== ${label} ===`)
  allReqs.length = 0
  
  await page.goto(`https://moviebox.ph/moviedetail/${detailPath}`, {
    waitUntil: 'networkidle',
    timeout: 30000,
  })
  await page.waitForTimeout(5000)
  
  // Check video elements
  const videos = await page.$$('video')
  for (let i = 0; i < videos.length; i++) {
    const src = await videos[i].getAttribute('src')
    const dur = await videos[i].evaluate(el => el.duration)
    const ready = await videos[i].evaluate(el => el.readyState)
    console.log(`  Video ${i}: src=${(src || '').substring(0, 80)}, duration=${dur}s, readyState=${ready}`)
    // Try to get video dimensions
    const vw = await videos[i].evaluate(el => el.videoWidth)
    const vh = await videos[i].evaluate(el => el.videoHeight)
    console.log(`    Resolution: ${vw}x${vh}`)
  }
  
  // Check for streaming URLs
  const streamReqs = allReqs.filter(r => 
    r.url.includes('.m3u8') || r.url.includes('.ts') || 
    r.url.includes('.mpd') || r.url.includes('caption') ||
    r.url.includes('wefeed') || r.url.includes('h5-api')
  )
  
  console.log(`  Video/media requests:`)
  for (const r of streamReqs) {
    console.log(`    ${r.type} ${r.url.substring(0, 120)}`)
  }
  
  // Check page for video duration text
  const text = await page.evaluate(() => document.body.innerText)
  const durMatch = text.match(/(\d+)\s*(?:h|m|min)/)
  if (durMatch) {
    console.log(`  Page says duration: ${durMatch[0]}`)
  }
  
  await page.screenshot({ path: `/tmp/mb_${label.replace(/\s+/g, '_')}.png` })
}

// Check movies that might have web play
await checkMovie('Avengers Endgame', 'avengers-endgame-suQ7hMMeFZ4')
await checkMovie('Top Gun Maverick', 'top-gun-maverick-CphKhIv3EV5')
await checkMovie('Titanic', 'titanic-m7a9yt0abq6')
await checkMovie('Avengers Infinity War', 'avengers-infinity-war-kqyUcfKDuya')

console.log('\n=== All done ===')
await browser.close()
