const fs = require('fs');
const path = require('path');

// This script converts the SVG icon to PNG files in all required sizes
// Run with: node scripts/generate-icons.js

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputSvg = path.join(__dirname, '../public/icon.svg');
const outputDir = path.join(__dirname, '../public');

async function generateIcons() {
  try {
    // Try to use sharp if available
    const sharp = require('sharp');

    console.log('Generating PWA icons...');

    for (const size of sizes) {
      const outputPath = path.join(outputDir, `icon-${size}.png`);

      await sharp(inputSvg)
        .resize(size, size)
        .png()
        .toFile(outputPath);

      console.log(`✓ Generated icon-${size}.png`);
    }

    // Also generate favicon.ico (using 32px size)
    await sharp(inputSvg)
      .resize(32, 32)
      .png()
      .toFile(path.join(outputDir, 'favicon.png'));

    console.log('✓ Generated favicon.png');
    console.log('\n✅ All icons generated successfully!');
    console.log('\nNote: For favicon.ico, you may want to use an online converter');
    console.log('to convert favicon.png to .ico format with multiple sizes.');

  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('⚠️  Sharp package not found. Installing...');
      console.log('\nPlease run: npm install --save-dev sharp');
      console.log('Then run this script again: node scripts/generate-icons.js');
    } else {
      console.error('Error generating icons:', error);
    }
    process.exit(1);
  }
}

// Check if running directly
if (require.main === module) {
  generateIcons();
}

module.exports = { generateIcons };
