/**
 * ノンデリ診断ゲーム - OGP画像 動的生成エンドポイント
 *
 * 配置先: app/api/og/route.tsx  (Next.js App Router)
 * URL例:  /api/og?score=73
 *
 * 必要パッケージ:
 *   npm install next@latest react@latest react-dom@latest
 *
 * Next.js 13.3+ なら @vercel/og は内蔵 (`next/og` から import) なので追加インストール不要。
 *
 * 他フレームワーク(Vite/Astro等)で使う場合は `@vercel/og` を直接インストール:
 *   npm install @vercel/og
 *   そして `import { ImageResponse } from '@vercel/og'` に変更。
 */

import { ImageResponse } from 'next/og';

export const runtime = 'edge';

// ===== ランク定義 (questions.json と同期させること) =====
const RANKS = [
  { max: 20,  name: 'デリカシーの神', emoji: '😇', bg: '#7FDBB6', tc: '#1a1a1a' },
  { max: 40,  name: '気配り上手',     emoji: '😊', bg: '#B4E5A2', tc: '#1a1a1a' },
  { max: 60,  name: 'ふつうの人',     emoji: '😅', bg: '#FFD93D', tc: '#1a1a1a' },
  { max: 80,  name: 'ノンデリ寄り',   emoji: '💥', bg: '#FFA552', tc: '#1a1a1a' },
  { max: 100, name: 'ノンデリ無双',   emoji: '🔥', bg: '#FF6B6B', tc: '#FFFFFF' },
] as const;

function getRank(score: number) {
  return RANKS.find(r => score <= r.max) ?? RANKS[2];
}

/**
 * Google Fonts を Edge Runtime で読み込むユーティリティ。
 * text= パラメータで実際に使う文字だけをサブセット化することで、
 * 日本語フォントでも軽量に取得できる。
 */
async function loadGoogleFont(family: string, text: string): Promise<ArrayBuffer> {
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}&text=${encodeURIComponent(text)}`;
  const cssRes = await fetch(url, {
    headers: {
      // User-Agent を指定することで woff2 (Satori対応形式) を確実に取得
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });
  const css = await cssRes.text();
  const match = css.match(/src:\s*url\((.+?)\)\s*format/);
  if (!match) throw new Error(`Font URL not found for ${family}`);
  return await (await fetch(match[1])).arrayBuffer();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const score = Math.max(0, Math.min(100, parseInt(searchParams.get('score') ?? '50', 10) || 0));
    const rank = getRank(score);

    // 実際にレンダリングされる文字をすべて含めてフォントをサブセット取得
    const allText =
      'ノンデリ診断ゲームあなたの度点' +
      RANKS.map(r => r.name).join('') +
      '0123456789' +
      '#';

    const [bodyFont, displayFont] = await Promise.all([
      loadGoogleFont('M PLUS Rounded 1c:wght@900', allText),
      loadGoogleFont('Reggae One', allText + score),
    ]);

    return new ImageResponse(
      (
        <div
          style={{
            width: '1200px',
            height: '630px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FFF4E0',
            backgroundImage:
              'radial-gradient(circle at 20% 20%, #FFE8C2 0%, transparent 40%), ' +
              'radial-gradient(circle at 80% 80%, #FFE8C2 0%, transparent 40%)',
            position: 'relative',
            fontFamily: 'MPlus',
          }}
        >
          {/* 装飾サークル (右上の黄色) */}
          <div
            style={{
              position: 'absolute',
              top: -80,
              right: -80,
              width: 240,
              height: 240,
              backgroundColor: '#FFD93D',
              borderRadius: '50%',
              opacity: 0.35,
              display: 'flex',
            }}
          />
          {/* 装飾サークル (左下のピンク) */}
          <div
            style={{
              position: 'absolute',
              bottom: -100,
              left: -100,
              width: 280,
              height: 280,
              backgroundColor: '#FF3D7F',
              borderRadius: '50%',
              opacity: 0.18,
              display: 'flex',
            }}
          />

          {/* ヘッダー */}
          <div
            style={{
              fontSize: 40,
              fontWeight: 900,
              color: '#1a1a1a',
              letterSpacing: '0.1em',
              marginBottom: 4,
              display: 'flex',
            }}
          >
            ノンデリ診断ゲーム
          </div>

          {/* 絵文字 */}
          <div style={{ fontSize: 110, lineHeight: 1.1, display: 'flex' }}>
            {rank.emoji}
          </div>

          {/* スコアラベル */}
          <div
            style={{
              fontSize: 28,
              color: '#1a1a1a',
              opacity: 0.7,
              display: 'flex',
            }}
          >
            あなたのノンデリ度
          </div>

          {/* スコア値 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              marginTop: 4,
              marginBottom: 28,
            }}
          >
            <div
              style={{
                fontSize: 220,
                fontFamily: 'Reggae',
                color: '#FF3D7F',
                lineHeight: 0.9,
                textShadow: '8px 8px 0 #1a1a1a',
                display: 'flex',
              }}
            >
              {score}
            </div>
            <div
              style={{
                fontSize: 72,
                fontFamily: 'Reggae',
                color: '#1a1a1a',
                marginLeft: 8,
                display: 'flex',
              }}
            >
              点
            </div>
          </div>

          {/* ランクバッジ */}
          <div
            style={{
              backgroundColor: rank.bg,
              color: rank.tc,
              border: '6px solid #1a1a1a',
              borderRadius: 24,
              padding: '18px 56px',
              fontSize: 52,
              fontWeight: 900,
              boxShadow: '10px 10px 0 #1a1a1a',
              letterSpacing: '0.05em',
              display: 'flex',
            }}
          >
            {rank.name}
          </div>

          {/* ハッシュタグ */}
          <div
            style={{
              marginTop: 28,
              fontSize: 24,
              color: '#1a1a1a',
              opacity: 0.6,
              fontFamily: 'Reggae',
              letterSpacing: '0.1em',
              display: 'flex',
            }}
          >
            #ノンデリ診断
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
        fonts: [
          { name: 'MPlus',  data: bodyFont,    style: 'normal', weight: 900 },
          { name: 'Reggae', data: displayFont, style: 'normal', weight: 400 },
        ],
        headers: {
          // 結果ページごとに同じスコアなら同じ画像なので長めにキャッシュ
          'Cache-Control': 'public, immutable, no-transform, max-age=31536000',
        },
      },
    );
  } catch (e) {
    console.error('OG image generation failed:', e);
    return new Response('Failed to generate OG image', { status: 500 });
  }
}
