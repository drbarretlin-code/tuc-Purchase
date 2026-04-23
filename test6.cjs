const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1200, height: 800 });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  
  const bodyStyle = await page.evaluate(() => {
    return window.getComputedStyle(document.body).backgroundColor;
  });
  console.log("Body Background:", bodyStyle);
  
  await browser.close();
})();
