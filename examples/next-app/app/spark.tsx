'use client';

import { SparkAnnotation } from 'spark-banana';

export default function Spark() {
  if (process.env.NODE_ENV !== 'development') return null;
  return <SparkAnnotation />;
}
