# ノンデリ診断ゲーム

あなたのノンデリ（デリカシーの無さ）度を10問で診断するカジュアルWebゲーム。

## ファイル構成

```
/
├── nondeli_game.html   ← ゲーム本体（これだけで動く）
├── questions.json      ← 40問の問題集（fetchで読み込み）
├── og-preview.html     ← OGP画像デザイン確認・静的生成テンプレート
├── package.json        ← npm スクリプト定義
├── scripts/
│   └── generate-ogp.js ← Puppeteer で静的OGP画像を一括生成
├── ogp/                ← 生成されたOGP画像の出力先（gitignore推奨）
│   └── score-0.png 〜 score-100.png
├── files/              ← 仕様書・参考資料
│   ├── questions.json
│   ├── og-image-route.tsx
│   ├── og-preview.html
│   └── OGP-INTEGRATION.md
├── vercel.json         ← Vercel 静的ホスティング設定
├── netlify.toml        ← Netlify 設定
└── .nojekyll           ← GitHub Pages 用（Jekyll 無効化）
```

---

## ローカル確認

```bash
# ファイルをそのままブラウザで開く（fetchはCORSで失敗するが内蔵データで動作）
open nondeli_game.html

# ローカルサーバーで正しく動作確認（推奨）
npx serve . -l 3000
# → http://localhost:3000/nondeli_game.html
```

---

## OGP画像の生成（静的ホスティング向け）

```bash
npm install
npm run generate-ogp
```

`ogp/score-0.png` 〜 `ogp/score-100.png` が生成されます（5点刻み・計21枚）。

生成後、`nondeli_game.html` の設定を変更：

```js
// 静的OGP画像を使う場合
const OGP_API_BASE = '/ogp/score-';
// ↑ に変更し、updateOGPForScore() 内の imgUrl を
// `${location.origin}${OGP_API_BASE}${Math.round(score / 5) * 5}.png` に合わせてください
```

---

## デプロイ

### Vercel（推奨・最短）

```bash
npm install -g vercel
vercel --prod
```

`vercel.json` が適用され、キャッシュ設定が自動で有効になります。

**動的OGP（Edge Function）を使う場合：**
`files/og-image-route.tsx` と `files/OGP-INTEGRATION.md` を参照して
Next.js プロジェクトとして再構成してください。

---

### Netlify

```bash
# Netlify CLI
npm install -g netlify-cli
netlify deploy --prod --dir .
```

または GitHub リポジトリを Netlify に接続し、
- Publish directory: `.`（または `./`）
- Build command: `npm run generate-ogp`（OGP画像を事前生成する場合）

---

### GitHub Pages

1. リポジトリに push
2. Settings → Pages → Branch: `main` / folder: `/ (root)`
3. `.nojekyll` が既にあるので Jekyll は無効化済み

**注意**: GitHub Pages は `nondeli_game.html` がそのまま公開されます。
トップページにするには `index.html` にリネームしてください。

```bash
cp nondeli_game.html index.html
```

---

## 動的OGP（Vercel + Next.js）

SNSクローラーに対してスコア別の動的OGP画像を返すには
`files/og-image-route.tsx` と `files/OGP-INTEGRATION.md` を参照してください。

---

## OGP バリデーター

| プラットフォーム | URL |
|---|---|
| X (Twitter) | https://cards-dev.twitter.com/validator |
| Facebook     | https://developers.facebook.com/tools/debug/ |
| LINE         | https://poker.line.naver.jp/ |
| LinkedIn     | https://www.linkedin.com/post-inspector/ |
