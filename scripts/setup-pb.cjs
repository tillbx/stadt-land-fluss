const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');

const rootDir = path.join(__dirname, '..');
const pbExePath = path.join(rootDir, 'pocketbase.exe');
const zipPath = path.join(rootDir, 'pocketbase.zip');

if (fs.existsSync(pbExePath)) {
  console.log('PocketBase executable already exists.');
  process.exit(0);
}

console.log('PocketBase executable not found. Downloading for Windows (amd64) from GitHub...');
const initialUrl = 'https://github.com/pocketbase/pocketbase/releases/download/v0.22.14/pocketbase_0.22.14_windows_amd64.zip';

function download(url, dest, callback) {
  https.get(url, (response) => {
    const code = response.statusCode;
    
    // Follow redirect if 3xx status code and location is present
    if (code >= 300 && code < 400 && response.headers.location) {
      // console.log(`Following redirect to: ${response.headers.location}`);
      download(response.headers.location, dest, callback);
      return;
    }
    
    if (code !== 200) {
      console.error(`Failed to download PocketBase. Status code: ${code}`);
      process.exit(1);
    }
    
    const file = fs.createWriteStream(dest);
    response.pipe(file);
    
    file.on('finish', () => {
      file.close(callback);
    });
  }).on('error', (err) => {
    if (fs.existsSync(dest)) {
      fs.unlinkSync(dest);
    }
    console.error('Error downloading PocketBase:', err);
    process.exit(1);
  });
}

download(initialUrl, zipPath, () => {
  console.log('Download complete. Extracting pocketbase.zip using PowerShell Expand-Archive...');
  try {
    // Expand-Archive is native on Windows 10/11
    execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${rootDir}' -Force"`);
    console.log('Extraction complete.');
    
    // Clean up temporary zip file
    if (fs.existsSync(zipPath)) {
      fs.unlinkSync(zipPath);
    }
    
    // Clean up other optional zip contents if present
    const changelog = path.join(rootDir, 'CHANGELOG.md');
    const license = path.join(rootDir, 'LICENSE.md');
    if (fs.existsSync(changelog)) fs.unlinkSync(changelog);
    if (fs.existsSync(license)) fs.unlinkSync(license);
    
    console.log('PocketBase setup successful!');
  } catch (err) {
    console.error('Error extracting zip file:', err);
    process.exit(1);
  }
});
