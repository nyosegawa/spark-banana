# spark-banana

[English](./README.md) | 日本語 | [中文](./README.zh.md) | [한국어](./README.ko.md) | [Français](./README.fr.md) | [Deutsch](./README.de.md) | [Español](./README.es.md) | [Português](./README.pt.md) | [Italiano](./README.it.md) | [Русский](./README.ru.md) | [العربية](./README.ar.md) | [हिन्दी](./README.hi.md)

![spark-banana header](.github/assets/spark-banana-header.jpeg)

ローカル開発向けのリアルタイムUIアノテーションツールです。ブラウザ上で要素をクリックして修正内容を入力すると、`spark-bridge` がCodex MCPへ処理を中継します。

## クイックスタート

### 1. インストール

```bash
npm install -D spark-banana spark-bridge
```

### 2. bridgeサーバーを起動

```bash
npx spark-bridge
```

デフォルトのWebSocketエンドポイントは `ws://localhost:3700` です。

### 3. アプリにオーバーレイを追加

```tsx
import { SparkAnnotation } from 'spark-banana';

<SparkAnnotation projectRoot={import.meta.env.VITE_SPARK_PROJECT_ROOT} />
```

Vite（`.env`）:

```bash
VITE_SPARK_PROJECT_ROOT=/absolute/path/to/your/project
```

Next.js（`.env.local`）:

```bash
NEXT_PUBLIC_SPARK_PROJECT_ROOT=/absolute/path/to/your/project
```

CSPでインラインstyleがブロックされる場合は、次を追加してください。

```tsx
import 'spark-banana/styles.css';
```

Next.jsの例:

```tsx
'use client';
import { SparkAnnotation } from 'spark-banana';

export default function Spark() {
  if (process.env.NODE_ENV !== 'development') return null;
  return <SparkAnnotation projectRoot={process.env.NEXT_PUBLIC_SPARK_PROJECT_ROOT} />;
}
```

### 4. アノテーションを送信

1. フローティングボタンを有効化します。
2. 要素を選択します（Sparkモード）または領域をキャプチャします（Bananaモード）。
3. 指示文を入力して送信します。
4. パネルで進捗とログを確認します。

## 前提条件

- Codex CLIをインストールして認証済みであること

```bash
npm install -g @openai/codex
codex
```

- React 18以上
- HMRが有効なローカル開発サーバー
- Gitリポジトリ

## モード

- Sparkモード: 要素ベースで修正依頼を送信
- Bananaモード: スクリーンショットベースで候補を生成し、Codexで適用

## 設定

### `spark-bridge` CLI

```bash
npx spark-bridge [options]

Options:
  --port <n>           WebSocket port (default: 3700)
  --project <path>     Project root directory (default: cwd)
  --allow-default-project-root  Allow unregistered clients to use --project/cwd fallback (legacy)
  --model <name>       Codex model (default: gpt-5.3-codex-spark)
  --concurrency <n>    Max concurrent jobs (default: 1)
  --banana-model <n>   Gemini model for banana mode (optional)
  --dry-run            Mock mode (no Codex CLI)
  --help, -h           Show help
```

### `SparkAnnotation` props

```tsx
<SparkAnnotation
  bridgeUrl="ws://localhost:3700"
  projectRoot="/absolute/path/to/your/project"
  position="bottom-right" // or "bottom-left"
/>
```

`projectRoot` は必須のpropsです（`import.meta.env.VITE_SPARK_PROJECT_ROOT` のように環境変数から渡す運用を推奨）。
デフォルトでは、`--allow-default-project-root` を付けない限り、`spark-bridge` は未登録クライアントを拒否します。

## 主な機能

- WebSocket bridgeによるクライアント単位ルーティング
- 再接続時でも進行中メッセージ（ログ/プラン更新）を継続配信
- 実行コマンドの承認フロー
- Plan mode（3案生成と選択適用）
- Follow-upアノテーション
- 領域キャプチャと画像ベース提案
- 12言語のi18n
- テーマ/モデル/ロケール/モードのローカル保存

## 開発

```bash
git clone git@github.com:nyosegawa/spark-banana.git
cd spark-banana
npm install
```

```bash
npm run dev        # Vite example
npm run dev:next   # Next.js example
```

```bash
npm run build
npm test
```

## ライセンス

MIT
