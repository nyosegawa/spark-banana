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
    { id: 1, text: 'Try spark-banana', done: false },
    { id: 2, text: 'Click UI to send annotations', done: false },
    { id: 3, text: 'Customize this sample app', done: false },
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

  return (
    <div className="app">
      <header className="header">
        <h1>Todo App</h1>
        <p className="subtitle">spark-banana example</p>
      </header>

      <main className="main">
        <div className="input-area">
          <input
            className="todo-input"
            type="text"
            placeholder="What needs to be done?"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTodo()}
          />
          <button className="add-btn" onClick={addTodo}>
            Add
          </button>
        </div>

        <ul className="todo-list">
          {todos.map((todo) => (
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
                Delete
              </button>
            </li>
          ))}
        </ul>

        {todos.length > 0 && (
          <footer className="footer">
            <span className="remaining">{remaining} item{remaining !== 1 ? 's' : ''} left</span>
            <button
              className="clear-btn"
              onClick={() => setTodos((prev) => prev.filter((t) => !t.done))}
              disabled={remaining === todos.length}
            >
              Clear completed
            </button>
          </footer>
        )}

        {todos.length === 0 && (
          <div className="empty-state">
            <p>No todos yet. Add one above!</p>
          </div>
        )}
      </main>

      <SparkAnnotation projectRoot={projectRoot} />
    </div>
  );
}
