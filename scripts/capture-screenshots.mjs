import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'gitpulse_super_secret_jwt_key_2026_dev_prod'
);

async function createToken() {
  return await new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(JWT_SECRET);
}

async function run() {
  const screenshotsDir = path.join(process.cwd(), 'docs', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  console.log('Launching headless Chrome...');

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 820, deviceScaleFactor: 2 });

  // 1. Capture Login Page
  console.log('Capturing Login Page...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: path.join(screenshotsDir, '01-login.png'), fullPage: false });

  // Authenticate by setting cookie
  const sessionToken = await createToken();
  await page.setCookie({
    name: 'gitpulse_session',
    value: sessionToken,
    domain: 'localhost',
    path: '/',
    httpOnly: true,
  });

  // 2. Capture Dashboard
  console.log('Capturing Dashboard...');
  await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(screenshotsDir, '02-dashboard.png'), fullPage: false });

  // 3. Capture Repositories Page
  console.log('Capturing Repositories Page...');
  await page.goto('http://localhost:3000/dashboard/repositories', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(screenshotsDir, '03-repositories.png'), fullPage: false });

  // 4. Capture Settings & Scheduler Page
  console.log('Capturing Settings & Scheduler Page...');
  await page.goto('http://localhost:3000/dashboard/settings', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(screenshotsDir, '04-settings.png'), fullPage: false });

  // 5. Capture Activity Logs Page
  console.log('Capturing Activity Logs Page...');
  await page.goto('http://localhost:3000/dashboard/logs', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(screenshotsDir, '05-logs.png'), fullPage: false });

  await browser.close();
  console.log('All screenshots captured successfully in docs/screenshots/!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
