# OGP画像 動的生成 ガイド

ノンデリ診断ゲームの結果ページに合わせて、スコアごとに動的なOGP画像を生成・配信する方法をまとめます。

## 構成図

```
┌─────────────────────┐    GET /api/og?score=73
│  SNSクローラー       │ ───────────────────────┐
│ (X, LINE, Slack等)  │                        │
└─────────────────────┘                        ▼
        ↑                            ┌─────────────────┐
        │ <meta og:image>           │ Edge Function   │
        │                           │ og-image-route  │
┌──────────────────┐                 │ (@vercel/og)    │
│ 結果ページHTML    │                │                 │
│ /result?score=73 │                 │ → PNG (1200x630)│
└──────────────────┘                 └─────────────────┘
```

ポイント:
- 結果ページのHTMLが返す `<meta property="og:image">` に、Edge Function のURLを指す
- クローラーはそのURLを取得し、生成されたPNGをカードとして表示

---

## 1. ファイル構成 (Next.js App Router の場合)

```
my-nondeli-app/
├── app/
│   ├── page.tsx              # トップ (ゲーム本体)
│   ├── result/
│   │   └── page.tsx          # 結果ページ (OGPメタタグを動的に生成)
│   └── api/
│       └── og/
│           └── route.tsx     # ← og-image-route.tsx をここに配置
├── public/
│   └── questions.json
└── package.json
```

## 2. セットアップ

```bash
# Next.js 13.3+ なら @vercel/og は内蔵 (next/og)
npx create-next-app@latest my-nondeli-app
cd my-nondeli-app

# og-image-route.tsx を app/api/og/route.tsx として配置
mkdir -p app/api/og
cp ../og-image-route.tsx app/api/og/route.tsx
```

ローカル確認:
```bash
npm run dev
# → http://localhost:3000/api/og?score=73 にアクセスしてPNGが返ればOK
```

## 3. 結果ページでの meta タグ設定

```tsx
// app/result/page.tsx
import { Metadata } from 'next';

type Props = { searchParams: { score?: string } };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const score = searchParams.score ?? '50';
  const ogUrl = `https://example.com/api/og?score=${score}`;
  const pageUrl = `https://example.com/result?score=${score}`;

  return {
    title: `ノンデリ度 ${score}点 - ノンデリ診断ゲーム`,
    description: 'あなたのノンデリ(デリカシーの無さ)度を10問で診断!',
    openGraph: {
      title: `ノンデリ度 ${score}点でした!`,
      description: 'あなたも診断してみよう',
      url: pageUrl,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `ノンデリ度 ${score}点でした!`,
      description: 'あなたも診断してみよう',
      images: [ogUrl],
    },
  };
}

export default function ResultPage({ searchParams }: Props) {
  // ... ゲームの結果UI
  return <div>...</div>;
}
```

シェアURLとしてユーザーには `https://example.com/result?score=73` を渡せばOK。
SNSクローラーがそのURLを取りに来た際、自動的に動的OGP画像が表示されます。

## 4. 動作確認

### OGPバリデーター

各プラットフォームの公式デバッガで確認:

| プラットフォーム | URL |
|------|------|
| X (Twitter) Card Validator | https://cards-dev.twitter.com/validator |
| Facebook Sharing Debugger  | https://developers.facebook.com/tools/debug/ |
| LinkedIn Post Inspector    | https://www.linkedin.com/post-inspector/ |
| LINE Card Validator        | https://poker.line.naver.jp/ |

### 一発確認スクリプト

```bash
# OGPメタタグだけを抜き出して表示
curl -sL "https://example.com/result?score=73" | grep -E 'og:|twitter:'
```

---

## 5. Vercel以外でデプロイする場合

### Cloudflare Workers
- `@vercel/og` はCF Workersでも動作する
- `wrangler.toml` で `compatibility_flags = ["nodejs_compat"]` を有効化
- Edge Function コードはほぼそのまま使える

### Netlify Edge Functions
- Deno ベース。`@vercel/og` の互換ライブラリ `og-edge` を使うか、`satori` + `resvg-wasm` で代用

### 自前サーバー / Express
- `npm install @vercel/og` してNode.jsで動かす
- 18+ の Node.js で Edge Runtime API がサポート済

---

## 6. 静的フォールバック (Edge Function を使わない選択肢)

サーバー側のランタイムを増やしたくない場合は、**Puppeteerで事前に各スコアの画像を生成して静的配信**する手があります。

### 手順

```bash
npm install puppeteer
```

```javascript
// scripts/generate-ogp.js
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 2 });

  const previewPath = `file://${path.resolve(__dirname, '../og-preview.html')}`;
  fs.mkdirSync('public/ogp', { recursive: true });

  // 0〜100点まで5点刻みで生成 (21枚)
  for (let score = 0; score <= 100; score += 5) {
    await page.goto(`${previewPath}?score=${score}&raw=1`, { waitUntil: 'networkidle0' });
    await page.screenshot({
      path: `public/ogp/score-${score}.png`,
      clip: { x: 0, y: 0, width: 1200, height: 630 },
    });
    console.log(`✓ score=${score}`);
  }

  await browser.close();
})();
```

```bash
node scripts/generate-ogp.js
```

ビルド時に実行すれば、`public/ogp/score-0.png` 〜 `score-100.png` が出来上がります。
HTMLからは:

```html
<!-- 結果ページ側で、スコアを5刻みに丸めて参照 -->
<meta property="og:image" content="https://example.com/ogp/score-75.png">
```

ランクごとに5枚だけ生成する省エネ運用もアリ (神/上手/普通/寄り/無双)。

---

## 7. クライアント側で「結果カードを画像保存」する追加機能 (任意)

OGP用とは別に、ユーザーが自分の結果を画像としてダウンロード/共有できると便利です。
プロトタイプの `nondeli_game.html` に以下を追加:

```html
<script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
```

```javascript
async function downloadResultImage() {
  const card = document.getElementById('result-card');
  const canvas = await html2canvas(card, { backgroundColor: null, scale: 2 });
  const link = document.createElement('a');
  link.download = `nondeli-${state.finalScore}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
```

シェアボタンの隣に「💾 画像保存」を追加するだけで実装完了です。

---

## 8. キャッシュ戦略

`og-image-route.tsx` は以下のヘッダを付けています:

```
Cache-Control: public, immutable, no-transform, max-age=31536000
```

`/api/og?score=73` のように **URLが同じなら出力も同じ** なので、長期キャッシュ可能です。
Vercel/Cloudflare のCDN側で勝手に効くので、コールドスタートのコストは初回のみ。

---

## 9. トラブルシュート

| 症状 | 原因 | 対処 |
|------|------|------|
| 日本語が「□□□」になる | フォント未読み込み | `loadGoogleFont` の `text=` パラメータに使用文字を全部入れる |
| ローカルでは出るのに本番で出ない | フォントCDNがブロックされている | フォント `.ttf` をリポジトリに含めて `fs.readFileSync` で読む |
| SNSでカードが更新されない | クローラーがキャッシュしている | 各プラットフォームのデバッガで「再取得」を実行 |
| `flex container` warning | @vercel/og の制約 | div を1つだけ持つ要素にも `display: flex` を付ける |
| 画像が重い (>500KB) | フォントが全文字含んでいる | `text=` で必要な文字だけにサブセット化 |

---

## 10. 参考資料

- @vercel/og 公式: https://vercel.com/docs/og-image-generation
- Satori (内部エンジン): https://github.com/vercel/satori
- OGP仕様: https://ogp.me/
- X Cards: https://developer.x.com/en/docs/twitter-for-websites/cards/overview/abouts-cards
