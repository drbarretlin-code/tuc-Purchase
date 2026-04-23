const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1200, height: 800 });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  
  const mainGrid = await page.evaluate(() => {
    const r = document.querySelector('.main-grid');
    if (!r) return 'NO MAIN GRID';
    const rect = r.getBoundingClientRect();
    return `Rect: ${rect.width}x${rect.height} at ${rect.left},${rect.top}\nHTML: ${r.innerHTML.substring(0, 500)}`;
  });
  console.log("MAIN GRID:", mainGrid);
  
  const specForm = await page.evaluate(() => {
    const r = document.querySelector('.form-section');
    if (!r) return 'NO FORM SECTION';
    const rect = r.getBoundingClientRect();
    return `Rect: ${rect.width}x${rect.height} at ${rect.left},${rect.top}`;
  });
  console.log("SPEC FORM:", specForm);

  const preview = await page.evaluate(() => {
    const r = document.querySelector('.preview-content');
    if (!r) return 'NO PREVIEW CONTENT';
    const rect = r.getBoundingClientRect();
    return `Rect: ${rect.width}x${rect.height} at ${rect.left},${rect.top}`;
  });
  console.log("PREVIEW:", preview);
  
  await browser.close();
})();
