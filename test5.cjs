const fs = require('fs');
const PNG = require('pngjs').PNG;

fs.createReadStream('screenshot.png')
  .pipe(new PNG())
  .on('parsed', function() {
    let black = 0, white = 0, other = 0;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        let idx = (this.width * y + x) << 2;
        let r = this.data[idx];
        let g = this.data[idx+1];
        let b = this.data[idx+2];
        if (r < 30 && g < 30 && b < 30) black++;
        else if (r > 220 && g > 220 && b > 220) white++;
        else other++;
      }
    }
    console.log(`Black-ish: ${black}, White-ish: ${white}, Other: ${other}, Total: ${this.width * this.height}`);
  });
