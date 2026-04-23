const fs = require('fs');
const https = require('https');
const path = require('path');

const binDir = path.join(__dirname, '../bin');
if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
}

const isWin = process.platform === 'win32';
const url = isWin 
    ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe' 
    : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux';

const filename = isWin ? 'yt-dlp.exe' : 'yt-dlp';
const dest = path.join(binDir, filename);

function download(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                download(response.headers.location, dest).then(resolve).catch(reject);
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                if (!isWin) fs.chmodSync(dest, 0o755);
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
}

console.log(`Downloading standalone yt-dlp binary to ${dest}...`);
download(url, dest)
    .then(() => console.log('✅ Standalone yt-dlp downloaded successfully.'))
    .catch(err => {
        console.error('❌ Failed to download yt-dlp:', err);
        process.exit(1);
    });
