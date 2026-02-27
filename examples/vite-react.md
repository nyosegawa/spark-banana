# Example: Vite + React

## Setup

```bash
# Create a new Vite project (if you don't have one)
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install

# Install spark-banana
npm install spark-banana -D

# Set project root for SparkAnnotation
echo "VITE_SPARK_PROJECT_ROOT=$(pwd)" > .env
```

## Add to your app

```tsx
// src/App.tsx
import { SparkAnnotation } from 'spark-banana';
import './App.css';

function App() {
  return (
    <>
      <div className="app">
        <header className="header">
          <h1>My App</h1>
          <nav>
            <a href="#">Home</a>
            <a href="#">About</a>
            <a href="#">Contact</a>
          </nav>
        </header>

        <main className="main">
          <div className="card">
            <h2>Welcome</h2>
            <p>Click the ⚡ button to start annotating UI elements.</p>
            <button className="btn-primary">Get Started</button>
          </div>
        </main>
      </div>

      {/* Add the annotation overlay (dev only) */}
      {import.meta.env.DEV && (
        <SparkAnnotation projectRoot={import.meta.env.VITE_SPARK_PROJECT_ROOT} />
      )}
    </>
  );
}

export default App;
```

## Run

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Start bridge server
npx spark-bridge --project . --model gpt-5.3-codex-spark
```

## Usage

1. Open http://localhost:5173 in your browser
2. Click the ⚡ button in the bottom-right corner
3. Click on the "Get Started" button
4. Type: "change background to blue, text to white, border-radius to 8px"
5. Press Enter
6. Watch the button update in ~1-3 seconds via HMR
