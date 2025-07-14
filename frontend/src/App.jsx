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

  // Download file using fetch so JWT can be included
  async function handleDownload(name) {
    try {
      const res = await fetch(`${BACKEND}/files/${encodeURIComponent(name)}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setStatus('Error downloading file.');
        return;
      }
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = name;
      link.click();
      window.URL.revokeObjectURL(link.href);
    } catch {
      setStatus('Error downloading file.');
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

  // ---- FULLSCREEN UI starts here ----

  if (!token) {
    return (
      <div
        style={{
          minHeight: '100vh',
          minWidth: '100vw',
          width: '100vw',
          height: '100vh',
          background: 'linear-gradient(135deg, #dbeafe 0%, #c7d2fe 50%, #f0abfc 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <div
          style={{
            width: '100vw',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 430,
              margin: '0 auto',
              padding: '3.2rem 2.2rem 2.7rem 2.2rem',
              background: 'rgba(255,255,255,0.85) linear-gradient(135deg,#f1f5f9 10%,#dbeafe 80%)',
              borderRadius: 36,
              boxShadow: '0 12px 44px 0 rgba(110,120,250,0.14),0 1.5px 14px 0 rgba(186,150,255,0.04)',
              border: '1.5px solid #e0e7ff',
              transition: 'box-shadow 0.2s'
            }}
          >
            <h2
              style={{
                color: '#312e81',
                marginBottom: 22,
                letterSpacing: 0.5,
                fontWeight: 800,
                fontSize: 26
              }}
            >
              {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <form onSubmit={handleAuthSubmit} autoComplete="off">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '15px 16px',
                  marginBottom: 14,
                  borderRadius: 18,
                  border: 'none',
                  outline: 'none',
                  fontSize: 16,
                  background: '#f3f4f6',
                  color: '#312e81',
                  boxShadow: '0 0.5px 2px 0 #e0e7ff,0 1.5px 8px 0 #e0e7ff',
                  transition: 'box-shadow 0.15s'
                }}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '15px 16px',
                  marginBottom: 22,
                  borderRadius: 18,
                  border: 'none',
                  outline: 'none',
                  fontSize: 16,
                  background: '#f3f4f6',
                  color: '#312e81',
                  boxShadow: '0 0.5px 2px 0 #e0e7ff,0 1.5px 8px 0 #e0e7ff',
                  transition: 'box-shadow 0.15s'
                }}
              />
              <button
                type="submit"
                style={{
                  width: '100%',
                  background: 'linear-gradient(90deg, #6366f1 10%, #818cf8 100%)',
                  color: '#fff',
                  padding: '13px 0',
                  border: 'none',
                  borderRadius: 24,
                  fontWeight: 700,
                  fontSize: 17,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px 0 #a5b4fc36',
                  marginBottom: 12,
                  letterSpacing: 0.1,
                  transition: 'background 0.18s'
                }}
              >
                {authMode === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            </form>
            <div
              style={{
                color: authStatus.startsWith('Logged')
                  ? '#22c55e'
                  : authStatus.startsWith('Registration')
                  ? '#0ea5e9'
                  : '#dc2626',
                minHeight: 26,
                marginBottom: 14,
                fontSize: 15
              }}
            >
              {authStatus}
            </div>
            <div style={{ fontSize: 15 }}>
              {authMode === 'login' ? (
                <>
                  <span style={{ color: '#6d28d9' }}>New here?</span>{' '}
                  <span
                    style={{
                      color: '#2563eb',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                    onClick={() => {
                      setAuthMode('register');
                      setAuthStatus('');
                    }}
                  >
                    Create account
                  </span>
                </>
              ) : (
                <>
                  <span style={{ color: '#475569' }}>Already have an account?</span>{' '}
                  <span
                    style={{
                      color: '#2563eb',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                    onClick={() => {
                      setAuthMode('login');
                      setAuthStatus('');
                    }}
                  >
                    Sign in
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------- Main Authenticated UI ---------
  return (
    <div
      style={{
        minHeight: '100vh',
        minWidth: '100vw',
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(135deg, #dbeafe 0%, #c7d2fe 50%, #f0abfc 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, sans-serif'
      }}
    >
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 500,
            margin: '0 auto',
            padding: '3rem 2rem 2.5rem 2rem',
            background: 'rgba(255,255,255,0.88) linear-gradient(135deg,#e0e7ff 0%,#f5d0fe 100%)',
            borderRadius: 36,
            boxShadow: '0 12px 48px 0 rgba(110,120,250,0.14),0 1.5px 14px 0 rgba(186,150,255,0.05)',
            border: '1.5px solid #e0e7ff',
            transition: 'box-shadow 0.2s'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 18
            }}
          >
            <div>
              <h2
                style={{
                  color: '#312e81',
                  margin: 0,
                  letterSpacing: 0.5,
                  fontWeight: 800,
                  fontSize: 26
                }}
              >
                File Upload Demo
              </h2>
              <div
                style={{
                  fontSize: 15.5,
                  color: '#52525b',
                  marginTop: 2,
                  fontWeight: 500
                }}
              >
                {userEmail}
              </div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                background: 'linear-gradient(90deg,#c7d2fe 60%,#a5b4fc 100%)',
                color: '#312e81',
                border: 'none',
                borderRadius: 18,
                padding: '8px 22px',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                transition: 'background 0.18s'
              }}
            >
              Logout
            </button>
          </div>
          <form
            onSubmit={handleFileUpload}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              border: dragActive
                ? '2.5px dashed #6366f1'
                : '1.5px solid #e5e7eb',
              background: dragActive
                ? 'rgba(196,181,253,0.08)'
                : '#f9fafb',
              borderRadius: 24,
              padding: 22,
              marginBottom: 16,
              boxShadow: dragActive
                ? '0 0 0 4px #a5b4fc33'
                : '0 0.5px 8px 0 #f3e8ff10'
            }}
          >
            <label
              htmlFor="file-upload"
              style={{
                display: 'inline-block',
                background: '#f3f4f6',
                color: '#6366f1',
                fontWeight: 600,
                padding: '13px 28px',
                borderRadius: 18,
                cursor: 'pointer',
                marginBottom: 14,
                border: '1.5px solid #a5b4fc',
                boxShadow: '0 0.5px 2px 0 #e0e7ff',
                fontSize: 15.5,
                transition: 'background 0.16s, color 0.16s'
              }}
            >
              Choose File
              <input
                id="file-upload"
                type="file"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </label>
            <div
              style={{
                marginBottom: 18,
                fontSize: 14.5,
                color: dragActive ? '#312e81' : '#6d28d9',
                minHeight: 24,
                fontWeight: 500,
                letterSpacing: 0.01,
                transition: 'color 0.12s'
              }}
            >
              {file
                ? file.name
                : dragActive
                ? 'Drop file here to upload'
                : 'or drag & drop here'}
            </div>
            <button
              type="submit"
              disabled={uploading}
              style={{
                width: '100%',
                background: uploading
                  ? 'linear-gradient(90deg, #d1fae5 10%, #a7f3d0 100%)'
                  : 'linear-gradient(90deg, #a5b4fc 10%, #6366f1 100%)',
                color: uploading ? '#52525b' : '#fff',
                padding: '15px 0',
                border: 'none',
                borderRadius: 24,
                fontWeight: 800,
                fontSize: 17.2,
                cursor: uploading ? 'not-allowed' : 'pointer',
                boxShadow: uploading
                  ? '0 1px 2px #d1fae5'
                  : '0 2px 8px 0 #a5b4fc33',
                letterSpacing: 0.1,
                marginBottom: 5,
                transition: 'background 0.18s'
              }}
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </form>
          <div
            style={{
              margin: '17px 0',
              minHeight: 28,
              color: status.startsWith('File uploaded')
                ? '#22c55e'
                : status.startsWith('Error') || status.startsWith('Upload')
                ? '#dc2626'
                : '#444',
              fontWeight: 600,
              fontSize: 16
            }}
          >
            {status}
          </div>
          <hr style={{ margin: '2.2rem 0 1.2rem', borderColor: '#e0e7ff' }} />
          <h3
            style={{
              color: '#312e81',
              fontSize: 19,
              fontWeight: 800,
              marginBottom: 12,
              letterSpacing: 0.2
            }}
          >
            Your Files
          </h3>
          {uploadedFiles.length === 0 && (
            <div
              style={{
                color: '#bbb',
                fontWeight: 500,
                fontSize: 15,
                marginBottom: 10
              }}
            >
              No files yet.
            </div>
          )}
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              maxHeight: 140,
              overflowY: 'auto',
              marginBottom: 8
            }}
          >
            {uploadedFiles.map(name => (
              <li
                key={name}
                style={{
                  margin: '11px 0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <span
                  style={{
                    color: '#6366f1',
                    fontWeight: 700,
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    fontSize: 15.8,
                    paddingRight: 6,
                    transition: 'color 0.13s'
                  }}
                  onClick={() => handleDownload(name)}
                  title="Download"
                >
                  {name}
                </span>
                <button
                  onClick={() => handleDelete(name)}
                  style={{
                    marginLeft: 16,
                    background: 'linear-gradient(90deg, #fee2e2 70%, #fca5a5 100%)',
                    color: '#dc2626',
                    border: 'none',
                    borderRadius: 14,
                    padding: '6px 17px',
                    fontSize: 14.2,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'background 0.15s, color 0.15s'
                  }}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;











