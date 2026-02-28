# spark-banana

[English](./README.md) | [日本語](./README.ja.md) | [中文](./README.zh.md) | [한국어](./README.ko.md) | [Français](./README.fr.md) | [Deutsch](./README.de.md) | [Español](./README.es.md) | [Português](./README.pt.md) | [Italiano](./README.it.md) | [Русский](./README.ru.md) | العربية | [हिन्दी](./README.hi.md)

أداة لتعليق واجهة المستخدم بشكل فوري أثناء التطوير المحلي. انقر على عنصر في المتصفح، واكتب التعديل المطلوب، وسيقوم `spark-bridge` بتوجيه الطلب إلى Codex MCP.

## البدء السريع

```bash
npm install -D spark-banana spark-bridge
npx spark-bridge
```

النقطة الافتراضية: `ws://localhost:3700`

```tsx
import { SparkAnnotation } from 'spark-banana';
<SparkAnnotation projectRoot={import.meta.env.VITE_SPARK_PROJECT_ROOT} />
```

Vite (`.env`): `VITE_SPARK_PROJECT_ROOT=/absolute/path/to/your/project`

Next.js (`.env.local`): `NEXT_PUBLIC_SPARK_PROJECT_ROOT=/absolute/path/to/your/project`

`projectRoot` مطلوب كـ prop (يفضَّل تمريره من env مثل `import.meta.env.VITE_SPARK_PROJECT_ROOT`).

## الأوضاع

- Spark: طلبات إصلاح حسب العنصر
- Banana: اقتراحات بالاعتماد على لقطة شاشة ثم تطبيق عبر Codex

## التطوير

```bash
npm run dev
npm run dev:next
npm run build
npm test
```

## الترخيص

MIT
