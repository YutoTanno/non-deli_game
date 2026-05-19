/**
 * ノンデリ診断ゲーム — 静的OGP画像一括生成スクリプト
 *
 * 使い方:
 *   npm install
 *   npm run generate-ogp
 *
 * 出力先: ogp/score-0.png 〜 ogp/score-100.png (5点刻み、計21枚)
 * 利用方法:
 *   nondeli_game.html の OGP_API_BASE を '/ogp/score-' に変え、
 *   getStaticOGPImageURL(score) を呼ぶよう切り替えるか、
 *   SNS共有時の og:image を `/ogp/score-${roundedScore}.png` 形式で指定してください。
 */

const puppeteer = require('puppeteer');
const path      = require('path');
const fs        = require('fs');

const ROOT_DIR    = path.resolve(__dirname, '..');
const PREVIEW_URL = `file://${path.join(ROOT_DIR, 'og-preview.html').replace(/\\/g, '/')}`;
const OUT_DIR     = path.join(ROOT_DIR, 'ogp');

(async () => {
  console.log('OGP画像の生成を開始します...\n');

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({ headless: 'new' });
  const page    = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 2 });

  const scores = Array.from({ length: 21 }, (_, i) => i * 5); // 0,5,10,...,100

  for (const score of scores) {
    const url = `${PREVIEW_URL}?score=${score}&raw=1`;
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });

    // Google Fonts の読み込みを待機
    await page.waitForFunction(() => document.fonts.ready);

    const outPath = path.join(OUT_DIR, `score-${score}.png`);
    await page.screenshot({
      path: outPath,
      clip: { x: 0, y: 0, width: 1200, height: 630 },
    });
    console.log(`  ✓ score=${String(score).padStart(3)} → ogp/score-${score}.png`);
  }

  await browser.close();

  console.log(`\n✅ 完了! ${scores.length}枚の画像を生成しました: ${OUT_DIR}`);
  console.log('\n利用方法:');
  console.log('  nondeli_game.html の OGP_API_BASE を変更してください:');
  console.log('  const OGP_API_BASE = \'/ogp/score-\';');
  console.log('  ※ スコアを5刻みに丸めて使用: Math.round(score / 5) * 5');
})().catch(err => {
  console.error('エラーが発生しました:', err.message);
  process.exit(1);
});
