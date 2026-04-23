const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1200, height: 800 });
  await page.goto('https://tuc-purchase.vercel.app/', { waitUntil: 'networkidle0' });
  
  const whiteElements = await page.evaluate(() => {
    const isVisibleAndWhite = (el) => {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      if (style.opacity === '0' || style.visibility === 'hidden' || style.display === 'none') return false;
      
      const bg = style.backgroundColor;
      // Check if background is white or almost white
      if (bg === 'rgb(255, 255, 255)' || bg === 'rgba(255, 255, 255, 1)') {
         return true;
      }
      return false;
    };
    
    return Array.from(document.querySelectorAll('*'))
      .filter(isVisibleAndWhite)
      .map(el => {
        const rect = el.getBoundingClientRect();
        return `${el.tagName}.${el.className} - ${rect.width}x${rect.height} at ${rect.left},${rect.top} (z: ${window.getComputedStyle(el).zIndex})`;
      });
  });
  
  console.log("White Elements:", whiteElements);
  await browser.close();
})();
