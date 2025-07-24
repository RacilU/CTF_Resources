const http = require('http');
const fs = require('fs');
const path = require('path');
const load = require('loader');
const url = require('url');
const imageList = ['beauty.png', 'fire.png', 'good_night.png'];
const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

let isAdminRunning = false;


let adminWatchdog = null;
function startAdminWatchdog() {
  if (adminWatchdog) clearTimeout(adminWatchdog); 
  adminWatchdog = setTimeout(() => {
    console.warn('[*] watchdog: isAdminRunning reset');
    isAdminRunning = false;
    adminWatchdog = null;
  }, 10_000); 
}


function renderTemplate(html, data) {
  return html.replace(/{{\s*test\s*}}/g, data);
}

function getFirstQueryValue(url) {
  const queryStart = url.indexOf('?');
  if (queryStart === -1) return '';
  const queryString = url.substring(queryStart + 1);
  const pairs = queryString.split('&');
  const first = pairs[0];
  const value = first.includes('=') ? first.split('=')[1] : '';
  return value || '';
}

async function visitAsAdmin(targetUrl) {
  if (isAdminRunning) return;
  isAdminRunning = true;
  startAdminWatchdog();
  console.log('[+] Admin bot 시작');

  let driver;
  try {
    const options = new chrome.Options()
      .addArguments('--headless=new', '--no-sandbox',
                    '--disable-dev-shm-usage',
                    `--user-data-dir=/tmp/profile-${Date.now()}`);

    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    await driver.get('http://localhost:80/');

    await driver.manage().addCookie({
      name: 'flag',
      value: 'FLAG',
      path: '/'
    });

    await driver.sleep(3000);
    await driver.get(targetUrl);
    await driver.sleep(3000);
  } catch (err) {
    console.error('[!] Admin bot error:', err.message || err);
  } finally {
    try { if (driver) await driver.quit(); } catch (e) {
      console.error('[!] driver.quit() 실패:', e.message);
    }
    if (adminWatchdog) { clearTimeout(adminWatchdog); adminWatchdog = null; } // ★ 타이머 해제
    isAdminRunning = false;
    console.log('[+] Admin bot 종료, isAdminRunning =', isAdminRunning);
  }
}


function getRawQueryString(url) {
  const idx = url.indexOf('?');
  return idx === -1 ? '' : url.substring(idx + 1);
}

function sendCustomErrorPage(res) {
  const errorPath = path.join(__dirname, 'views', 'error.html');
  fs.readFile(errorPath, 'utf8', (err, html) => {
    if (err) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      return res.end('An error occurred');
    }
    res.writeHead(400, { 'Content-Type': 'text/html' });
    res.end(html);
  });
}

const server = http.createServer((req, res) => {
  try {
    const parsed = url.parse(req.url, true);
    const pathname = parsed.pathname;
    const query = parsed.query;
    const img = parsed.query['url'];
    const ref = getRawQueryString(req.url);
    const testInput = parsed.query.test || '';
    console.log('req.url:', req.url);

    if (pathname === '/toilet.html') {
      const filePath = path.join(__dirname, 'views', 'toilet.html');
      fs.readFile(filePath, 'utf8', (err, html) => {
        if (err) return res.writeHead(500).end('Error loading toilet.html');
        const selectedImage = imageList[Math.floor(Math.random() * imageList.length)];
        const rendered = renderTemplate(html, ref);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(rendered);
      });
    }

    else if (pathname === '/history.html') {
      const filePath = path.join(__dirname, 'views', 'history.html');
      fs.readFile(filePath, 'utf8', (err, html) => {
        if (err) return res.writeHead(500).end('Error loading history.html');
        const rendered = renderTemplate(html, testInput);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(rendered);
      });
    }

    else if (pathname === '/intro.html') {
      const filePath = path.join(__dirname, 'views', 'intro.html');
      fs.readFile(filePath, 'utf8', (err, html) => {
        if (err) return res.writeHead(500).end('Error loading intro.html');
        const rendered = renderTemplate(html, testInput);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(rendered);
      });
    }

    else if (pathname === '/map.html') {
      const filePath = path.join(__dirname, 'views', 'map.html');
      fs.readFile(filePath, 'utf8', (err, html) => {
        if (err) return res.writeHead(500).end('Error loading map.html');
        const rendered = renderTemplate(html, testInput);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(rendered);
      });
    }

    else if (pathname === '/admin.html') {
      const filePath = path.join(__dirname, 'views', 'admin.html');
      fs.readFile(filePath, 'utf8', (err, html) => {
        if (err) return res.writeHead(500).end('Error loading admin.html');
        const rendered = renderTemplate(html, testInput);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(rendered);
      });
    }

    else if (pathname === '/post.html') {
      const filePath = path.join(__dirname, 'views', 'post.html');
      fs.readFile(filePath, 'utf8', (err, html) => {
        if (err) return res.writeHead(500).end('Error loading post.html');
        const rendered = renderTemplate(html, img);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(rendered);
      });
    }

    else if (pathname === '/submit') {
      if (isAdminRunning) {
        res.writeHead(429);
        return res.end('Admin bot is already running. Try again later.');
      }

      const userPath = query.url;
      if (typeof userPath !== 'string' || !userPath.startsWith('/')) {
        res.writeHead(400);
        return res.end('Invalid or missing url parameter');
      }

      const targetUrl = `http://localhost:80${userPath}`;
      visitAsAdmin(targetUrl);

      res.writeHead(200, { 'Content-Type': 'text/plain' });
      return res.end('Admin will visit page.');
    }

    else if (pathname.startsWith('/resources/')) {
      const filePath = path.join(__dirname, 'views', pathname);
      const safeBase = path.join(__dirname, 'views', 'resources');
      if (!filePath.startsWith(safeBase)) {
        res.writeHead(403).end('Forbidden');
        return;
      }

      fs.readFile(filePath, (err, data) => {
        if (err) {
          sendCustomErrorPage(res);
          return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentTypes = {
          '.png':  'image/png',
          '.jpg':  'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.gif':  'image/gif',
          '.svg':  'image/svg+xml',
          '.css':  'text/css',
          '.js':   'application/javascript'
        };

        const contentType = contentTypes[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      });
    }

    else {
      const filePath = path.join(__dirname, 'views', 'index.html');
      fs.readFile(filePath, 'utf8', (err, html) => {
        if (err) return res.writeHead(500).end('Error loading index.html');
        const rendered = renderTemplate(html, testInput);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(rendered);
      });
    }
  } catch (err) {
    console.error('[!] Unexpected error:', err.stack || err);
    sendCustomErrorPage(res);
  }
});

server.listen(3000, () => {
  console.log('Kimboan Park is now open!!');
});
