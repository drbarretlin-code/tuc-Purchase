const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1200, height: 800 });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  
  const childrenInfo = await page.evaluate(() => {
    const r = document.querySelector('.main-grid');
    if (!r) return 'NO MAIN GRID';
    return Array.from(r.children).map((c, i) => {
      const rect = c.getBoundingClientRect();
      const style = window.getComputedStyle(c);
      return `Child ${i}: ${c.tagName} ${c.className} - Rect: ${rect.width}x${rect.height} at ${rect.left},${rect.top} - gridArea: ${style.gridArea}`;
    }).join('\n');
  });
  console.log("CHILDREN:\n", childrenInfo);
  
  await browser.close();
})();
