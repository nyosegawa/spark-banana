# spark-banana

[English](./README.md) | [日本語](./README.ja.md) | [中文](./README.zh.md) | 한국어 | [Français](./README.fr.md) | [Deutsch](./README.de.md) | [Español](./README.es.md) | [Português](./README.pt.md) | [Italiano](./README.it.md) | [Русский](./README.ru.md) | [العربية](./README.ar.md) | [हिन्दी](./README.hi.md)

로컬 개발용 실시간 UI 주석 도구입니다. 브라우저에서 요소를 클릭하고 수정 지시를 입력하면 `spark-bridge` 가 Codex MCP로 작업을 전달합니다.

## 빠른 시작

```bash
npm install -D spark-banana spark-bridge
npx spark-bridge
```

기본 엔드포인트: `ws://localhost:3700`

```tsx
import { SparkAnnotation } from 'spark-banana';
<SparkAnnotation projectRoot={import.meta.env.VITE_SPARK_PROJECT_ROOT} />
```

Vite (`.env`): `VITE_SPARK_PROJECT_ROOT=/absolute/path/to/your/project`

Next.js (`.env.local`): `NEXT_PUBLIC_SPARK_PROJECT_ROOT=/absolute/path/to/your/project`

`projectRoot`는 필수 prop이며, 보통 `import.meta.env.VITE_SPARK_PROJECT_ROOT` 같은 env 값을 전달합니다.

## 모드

- Spark: 요소 기반 수정 요청
- Banana: 스크린샷 기반 제안 생성 후 Codex 적용

## bridge 옵션

```bash
npx spark-bridge [options]
```

기본값에서 `projectRoot` 미등록 클라이언트는 거부됩니다.

## 개발

```bash
npm run dev
npm run dev:next
npm run build
npm test
```

## 라이선스

MIT
