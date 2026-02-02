import React, { useEffect, useMemo, useState } from 'react';
import './App.css';

const API_BASE_URL = 'http://localhost:3001';

function normalizeError(e) {
  if (typeof e === 'string') return e;
  if (e && typeof e.message === 'string') return e.message;
  return 'Something went wrong.';
}

// PUBLIC_INTERFACE
function App() {
  const [tasks, setTasks] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');

  const [error, setError] = useState(null);

  const remainingCount = useMemo(() => tasks.filter(t => !t.completed).length, [tasks]);

  async function apiFetch(path, options) {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });

    if (res.status === 204) return null;

    let data = null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = await res.text();
    }

    if (!res.ok) {
      const detail =
        data && typeof data === 'object' && data.detail ? String(data.detail) : String(data);
      throw new Error(detail || `Request failed (${res.status})`);
    }
    return data;
  }

  async function loadTasks() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('/tasks', { method: 'GET' });
      setTasks(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
  }, []);

  async function createTask(e) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;

    setError(null);
    try {
      const created = await apiFetch('/tasks', {
        method: 'POST',
        body: JSON.stringify({ title }),
      });
      setTasks(prev => [created, ...prev]);
      setNewTitle('');
    } catch (err) {
      setError(normalizeError(err));
    }
  }

  function startEdit(task) {
    setEditingId(task.id);
    setEditingTitle(task.title);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingTitle('');
  }

  async function saveEdit(taskId) {
    const title = editingTitle.trim();
    if (!title) {
      setError('Title cannot be empty.');
      return;
    }

    setError(null);
    try {
      const updated = await apiFetch(`/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({ title }),
      });
      setTasks(prev => prev.map(t => (t.id === taskId ? updated : t)));
      cancelEdit();
    } catch (err) {
      setError(normalizeError(err));
    }
  }

  async function deleteTask(taskId) {
    setError(null);
    try {
      await apiFetch(`/tasks/${taskId}`, { method: 'DELETE' });
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      setError(normalizeError(err));
    }
  }

  async function toggleComplete(taskId) {
    setError(null);
    try {
      const updated = await apiFetch(`/tasks/${taskId}/toggle`, { method: 'POST' });
      setTasks(prev => prev.map(t => (t.id === taskId ? updated : t)));
    } catch (err) {
      setError(normalizeError(err));
    }
  }

  return (
    <div className="page">
      <main className="card" aria-label="Todo application">
        <header className="header">
          <div>
            <h1 className="title">Todos</h1>
            <p className="subtitle">
              {remainingCount} remaining · {tasks.length} total
            </p>
          </div>

          <button className="ghostButton" type="button" onClick={loadTasks} disabled={loading}>
            Refresh
          </button>
        </header>

        <form className="addRow" onSubmit={createTask}>
          <input
            className="input"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Add a task…"
            aria-label="New task title"
            maxLength={200}
            disabled={loading}
          />
          <button className="primaryButton" type="submit" disabled={loading || !newTitle.trim()}>
            Add
          </button>
        </form>

        {error ? (
          <div className="errorBox" role="alert">
            {error}
          </div>
        ) : null}

        <section className="list" aria-label="Task list">
          {loading ? <div className="emptyState">Loading…</div> : null}

          {!loading && tasks.length === 0 ? (
            <div className="emptyState">No tasks yet. Add one above.</div>
          ) : null}

          {tasks.map(task => {
            const isEditing = editingId === task.id;

            return (
              <div className="row" key={task.id}>
                <button
                  type="button"
                  className={task.completed ? 'check checked' : 'check'}
                  onClick={() => toggleComplete(task.id)}
                  aria-label={task.completed ? 'Mark as not completed' : 'Mark as completed'}
                  title={task.completed ? 'Mark as not completed' : 'Mark as completed'}
                >
                  {task.completed ? '✓' : ''}
                </button>

                <div className="content">
                  {isEditing ? (
                    <input
                      className="editInput"
                      value={editingTitle}
                      onChange={e => setEditingTitle(e.target.value)}
                      aria-label="Edit task title"
                      maxLength={200}
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveEdit(task.id);
                        if (e.key === 'Escape') cancelEdit();
                      }}
                    />
                  ) : (
                    <div className={task.completed ? 'taskTitle done' : 'taskTitle'}>
                      {task.title}
                    </div>
                  )}
                </div>

                <div className="actions">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        className="smallButton"
                        onClick={() => saveEdit(task.id)}
                      >
                        Save
                      </button>
                      <button type="button" className="smallButton" onClick={cancelEdit}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="smallButton" onClick={() => startEdit(task)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="dangerButton"
                        onClick={() => deleteTask(task.id)}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
}

export default App;
