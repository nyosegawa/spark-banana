import { useState } from 'react';
import { SparkAnnotation } from 'spark-banana';

interface Todo {
  id: number;
  text: string;
  done: boolean;
}

export function App() {
  const projectRoot = import.meta.env.VITE_SPARK_PROJECT_ROOT as string | undefined;
  const [todos, setTodos] = useState<Todo[]>([
    { id: 1, text: 'spark-banana を試す', done: false },
    { id: 2, text: 'UI をクリックしてアノテーションを送る', done: false },
    { id: 3, text: 'サンプルアプリを改造する', done: false },
  ]);
  const [input, setInput] = useState('');

  const addTodo = () => {
    if (!input.trim()) return;
    setTodos((prev) => [
      ...prev,
      { id: Date.now(), text: input.trim(), done: false },
    ]);
    setInput('');
  };

  const toggleTodo = (id: number) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  };

  const deleteTodo = (id: number) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  const remaining = todos.filter((t) => !t.done).length;
  const todoItems = todos.map((todo) => (
    <li key={todo.id} className={`todo-item ${todo.done ? 'done' : ''}`}>
      <label className="todo-label">
        <input
          type="checkbox"
          checked={todo.done}
          onChange={() => toggleTodo(todo.id)}
        />
        <span className="todo-text">{todo.text}</span>
      </label>
      <button
        className="delete-btn"
        onClick={() => deleteTodo(todo.id)}
      >
        削除
      </button>
    </li>
  ));
  

  return (
    <div className="app">
      <header className="header">
        <h1>Todo App</h1>
        <p className="subtitle">spark-bananaのサンプル</p>
      </header>

      <main className="main">
        <div className="input-area">
          <input
            className="todo-input"
            type="text"
            placeholder="やることを入力してください"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTodo()}
          />
          <button className="add-btn" onClick={addTodo}>
            追加
          </button>
        </div>

        <ul className="todo-list">
          {todoItems}
        </ul>

        {todos.length > 0 && (
          <footer className="footer">
            <span className="remaining">{remaining} 件残り</span>
            <button
              className="clear-btn"
              onClick={() => setTodos((prev) => prev.filter((t) => !t.done))}
              disabled={remaining === todos.length}
            >
              完了済みを削除
            </button>
          </footer>
        )}

        {todos.length === 0 && (
          <div className="empty-state">
            <p>タスクがありません。上の入力欄から追加してください。</p>
          </div>
        )}
      </main>

      <SparkAnnotation projectRoot={projectRoot} />
    </div>
  );
}
