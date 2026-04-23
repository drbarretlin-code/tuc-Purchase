const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('pageerror', err => {
    console.error('Page error:', err.toString());
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('Console error:', msg.text());
    }
  });

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  await browser.close();
})();
