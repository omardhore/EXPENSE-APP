const sharp = require('sharp');
const fs = require('fs');

async function generate() {
  const svg = fs.readFileSync('public/icon.svg');
  
  await sharp(svg)
    .resize(192, 192)
    .png()
    .toFile('public/icon-192x192.png');
    
  await sharp(svg)
    .resize(512, 512)
    .png()
    .toFile('public/icon-512x512.png');
    
  console.log('Icons generated!');
}

generate();