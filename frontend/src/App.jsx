import React, { useState, useEffect, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';


const BACKEND = 'https://file-upload-demo-8ti2.onrender.com';

function App() {
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [authStatus, setAuthStatus] = useState('');

  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);

  // Get user email from token
  const userEmail = token ? jwtDecode(token).email : '';


  async function handleAuthSubmit(e) {
    e.preventDefault();
    setAuthStatus('Loading...');
    try {
      const url = `${BACKEND}/${authMode}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.success && data.token) {
        setToken(data.token);
        localStorage.setItem('token', data.token);
        setAuthStatus('Logged in.');
        setEmail('');
        setPassword('');
      } else if (data.success) {
        setAuthStatus('Registration successful. You can now log in.');
        setAuthMode('login');
      } else {
        setAuthStatus(data.message || 'Error. Try again.');
      }
    } catch {
      setAuthStatus('Network error.');
    }
  }

  function handleLogout() {
    setToken('');
    localStorage.removeItem('token');
    setUploadedFiles([]);
    setFile(null);
    setStatus('');
  }

  function handleFileChange(e) {
    setFile(e.target.files[0]);
    setStatus('');
  }

  // Drag and drop logic
  function handleDragOver(e) {
    e.preventDefault();
    setDragActive(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    setDragActive(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
      setStatus('');
    }
  }

  async function handleFileUpload(e) {
    e.preventDefault();
    if (!file) {
      setStatus('Please choose a file first.');
      return;
    }
    setUploading(true);
    setStatus('Uploading...');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${BACKEND}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const result = await response.json();
      if (result.success) {
        setStatus('File uploaded successfully.');
        setFile(null);
        fetchFiles();
      } else {
        setStatus(result.message || 'Upload failed.');
      }
    } catch {
      setStatus('Error uploading file.');
    } finally {
      setUploading(false);
    }
  }

  // Delete file
  async function handleDelete(name) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${BACKEND}/files/${encodeURIComponent(name)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setStatus('File deleted.');
        fetchFiles();
      } else {
        setStatus(data.message || 'Delete failed.');
      }
    } catch {
      setStatus('Error deleting file.');
    }
  }

  // Fetch file list
  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND}/files`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setUploadedFiles(data.files || []);
    } catch {
      setUploadedFiles([]);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchFiles();
    }
  }, [token, fetchFiles]);

  if (!token) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f3f4f8 0%, #c8e0f4 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          background: '#fff',
          borderRadius: 16,
          padding: '2.5rem 2.5rem 2rem 2.5rem',
          boxShadow: '0 6px 36px rgba(44,62,80,0.12)',
          width: 350,
          maxWidth: '90vw'
        }}>
          <h2 style={{ color: '#223555', marginBottom: 20 }}>{authMode === 'login' ? 'Login' : 'Register'}</h2>
          <form onSubmit={handleAuthSubmit}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
                width: '100%', padding: '9px', marginBottom: 12, borderRadius: 6,
                border: '1px solid #bcdcff', fontSize: 15
              }}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{
                width: '100%', padding: '9px', marginBottom: 18, borderRadius: 6,
                border: '1px solid #bcdcff', fontSize: 15
              }}
            />
            <button
              type="submit"
              style={{
                width: '100%',
                background: '#2563eb',
                color: '#fff',
                padding: '10px 0',
                border: 'none',
                borderRadius: 8,
                fontWeight: 600,
                fontSize: 16,
                cursor: 'pointer',
                marginBottom: 12
              }}
            >
              {authMode === 'login' ? 'Login' : 'Register'}
            </button>
          </form>
          <div style={{ color: authStatus.startsWith('Logged') ? '#16a34a' : '#ef4444', minHeight: 24, marginBottom: 12 }}>
            {authStatus}
          </div>
          <div style={{ fontSize: 14 }}>
            {authMode === 'login' ? (
              <>
                No account?{' '}
                <span style={{ color: '#2563eb', cursor: 'pointer' }} onClick={() => { setAuthMode('register'); setAuthStatus(''); }}>
                  Register here
                </span>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <span style={{ color: '#2563eb', cursor: 'pointer' }} onClick={() => { setAuthMode('login'); setAuthStatus(''); }}>
                  Login here
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f3f4f8 0%, #c8e0f4 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 16,
        padding: '2.5rem 2.5rem 2rem 2.5rem',
        boxShadow: '0 6px 36px rgba(44,62,80,0.12)',
        width: 370,
        maxWidth: '90vw'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <h2 style={{ color: '#223555', margin: 0, letterSpacing: 0.5 }}>File Upload Demo</h2>
            <div style={{ fontSize: 14, color: '#555', marginTop: 2 }}>
              {userEmail}
            </div>
          </div>
          <button onClick={handleLogout} style={{
            background: '#e5e7eb',
            color: '#223555',
            border: 'none',
            borderRadius: 6,
            padding: '6px 16px',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500
          }}>Logout</button>
        </div>
        <form
          onSubmit={handleFileUpload}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            border: dragActive ? '2px dashed #2563eb' : '2px solid #e5e7eb',
            background: dragActive ? '#eaf6ff' : '',
            borderRadius: 8,
            padding: 18,
            marginBottom: 12
          }}
        >
          <label htmlFor="file-upload" style={{
            display: 'inline-block',
            background: '#eaf6ff',
            color: '#2563eb',
            fontWeight: 500,
            padding: '10px 22px',
            borderRadius: 8,
            cursor: 'pointer',
            marginBottom: 12,
            border: '1px solid #bcdcff'
          }}>
            Choose File
            <input
              id="file-upload"
              type="file"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </label>
          <div style={{ marginBottom: 16, fontSize: 13, color: '#444', minHeight: 20 }}>
            {file ? file.name : (dragActive ? "Drop file here..." : "or drag & drop here")}
          </div>
          <button
            type="submit"
            disabled={uploading}
            style={{
              width: '100%',
              background: uploading ? '#bcdcff' : '#2563eb',
              color: '#fff',
              padding: '10px 0',
              border: 'none',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 16,
              cursor: uploading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s'
            }}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </form>
        <div style={{ margin: '20px 0', minHeight: 28, color: status.startsWith('File uploaded successfully.') ? '#16a34a' : status.startsWith('Error') || status.startsWith('Upload') ? '#ef4444' : '#444' }}>{status}</div>
        <hr style={{ margin: '1.8rem 0' }} />
        <h3 style={{ color: '#223555', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Your Files</h3>
        {uploadedFiles.length === 0 && <div style={{ color: '#bbb' }}>No files yet.</div>}
        <ul style={{ listStyle: 'none', padding: 0, maxHeight: 130, overflowY: 'auto' }}>
          {uploadedFiles.map(name => (
            <li key={name} style={{ margin: '7px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <a
                href={`${BACKEND}/files/${encodeURIComponent(name)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#2563eb',
                  fontWeight: 500,
                  textDecoration: 'underline'
                }}
              >
                {name}
              </a>
              <button
                onClick={() => handleDelete(name)}
                style={{
                  marginLeft: 12,
                  background: '#fee2e2',
                  color: '#dc2626',
                  border: 'none',
                  borderRadius: 6,
                  padding: '4px 10px',
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;







