// App.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';

const BACKEND = 'https://file-upload-demo-8ti2.onrender.com';

// Loader Spinner
function Loader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', height: 40
    }}>
      <div style={{
        width: 32, height: 32, border: '4px solid #a5b4fc', borderTop: '4px solid #6366f1',
        borderRadius: '50%', animation: 'spin 1s linear infinite'
      }} />
      <style>
        {`@keyframes spin { to { transform: rotate(360deg); } }`}
      </style>
    </div>
  );
}

function getFileType(name) {
  const ext = name.split('.').pop().toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) return 'image';
  if (['pdf'].includes(ext)) return 'pdf';
  if (['txt', 'md', 'csv', 'json', 'log'].includes(ext)) return 'text';
  if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext)) return 'audio';
  if (['mp4', 'webm', 'mov', 'mkv'].includes(ext)) return 'video';
  return 'other';
}

function App() {
  // UI State
  const [gradientPos, setGradientPos] = useState(0);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [authStatus, setAuthStatus] = useState('');
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');
  const [statusAnim, setStatusAnim] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [showCard, setShowCard] = useState(false);
  const [listAnim, setListAnim] = useState(false);
  const [previews, setPreviews] = useState({});
  const [previewModal, setPreviewModal] = useState(null);

  const userEmail = token ? jwtDecode(token).email : '';

  // Animate gradient
  useEffect(() => {
    const animate = () => {
      setGradientPos(pos => (pos + 0.08) % 100);
      requestAnimationFrame(animate);
    };
    animate();
    return () => {};
  }, []);

  useEffect(() => {
    setTimeout(() => setShowCard(true), 80);
  }, [token]);

  useEffect(() => {
    setListAnim(false);
    setTimeout(() => setListAnim(true), 140);
  }, [uploadedFiles]);

  useEffect(() => {
    if (!status) return;
    setStatusAnim('fadeIn');
    if (status.startsWith('Error') || status.startsWith('Upload') || status.startsWith('Delete failed')) {
      setTimeout(() => setStatusAnim('shake'), 400);
    }
    const timeout = setTimeout(() => setStatusAnim(''), 1600);
    return () => clearTimeout(timeout);
  }, [status]);

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
    setPreviews({});
  }

  function handleFileChange(e) {
    setFile(e.target.files[0]);
    setStatus('');
  }

  // Drag/Drop logic
  function handleDragOver(e) { e.preventDefault(); setDragActive(true);}
  function handleDragLeave(e) { e.preventDefault(); setDragActive(false);}
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
    setStatus('');
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

  // Download file using fetch (auth)
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

  // Get file previews for images (auth)
  const fetchPreviews = useCallback(async (files) => {
    const out = {};
    for (let name of files) {
      if (getFileType(name) !== 'image') continue;
      try {
        // Load preview blob as a DataURL for security 
        const res = await fetch(`${BACKEND}/files/${encodeURIComponent(name)}/preview`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const blob = await res.blob();
          out[name] = URL.createObjectURL(blob);
        }
      } catch { /* skip error */ }
    }
    setPreviews(out);
  }, [token]);

  // Fetch file list
  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND}/files`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setUploadedFiles(data.files || []);
      // fetch previews for images
      fetchPreviews(data.files || []);
    } catch {
      setUploadedFiles([]);
    }
  }, [token, fetchPreviews]);

  useEffect(() => {
    if (token) fetchFiles();
  }, [token, fetchFiles]);

  // Show preview modal for file
  async function handleShowPreview(name) {
    const type = getFileType(name);
    setPreviewModal({ name, type, content: null, loading: true, error: null });

    try {
      // Images, audio, video, pdfs all fetched as blobs
      if (['image', 'audio', 'video', 'pdf'].includes(type)) {
        const res = await fetch(`${BACKEND}/files/${encodeURIComponent(name)}/preview`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Preview failed.');
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setPreviewModal({ name, type, content: url, loading: false, error: null });
      } else if (type === 'text') {
        // For text, fetch as text
        const res = await fetch(`${BACKEND}/files/${encodeURIComponent(name)}/preview`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Preview failed.');
        const text = await res.text();
        setPreviewModal({ name, type, content: text, loading: false, error: null });
      } else {
        setPreviewModal({ name, type, content: null, loading: false, error: 'No preview for this file type.' });
      }
    } catch (e) {
      setPreviewModal({ name, type, content: null, loading: false, error: e.message });
    }
  }

  // UI background
  const animatedBg = {
    minHeight: '100vh',
    minWidth: '100vw',
    width: '100vw',
    height: '100vh',
    fontFamily: 'Inter, sans-serif',
    background: `linear-gradient(120deg, 
      hsl(${200 + Math.sin(gradientPos/8)*40}, 93%, 91%) 0%, 
      hsl(${280 + Math.cos(gradientPos/6)*40}, 95%, 90%) 55%, 
      hsl(${305 + Math.sin(gradientPos/5)*25}, 90%, 88%) 100%)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 1s linear'
  };

  // Auth card
  if (!token) {
    return (
      <div style={animatedBg}>
        <div style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            width: '100%',
            maxWidth: 430,
            margin: '0 auto',
            padding: '3.2rem 2.2rem 2.7rem 2.2rem',
            background: 'rgba(255,255,255,0.85) linear-gradient(135deg,#f1f5f9 10%,#dbeafe 80%)',
            borderRadius: 36,
            boxShadow: `0 12px 44px 0 rgba(110,120,250,0.14),0 1.5px 14px 0 rgba(186,150,255,0.04)`,
            border: '1.5px solid #e0e7ff',
            opacity: showCard ? 1 : 0,
            transform: showCard ? 'scale(1)' : 'scale(0.97)',
            transition: 'all 0.65s cubic-bezier(.4,.6,0,1)'
          }}>
            <h2 style={{
              color: '#312e81',
              marginBottom: 22,
              letterSpacing: 0.5,
              fontWeight: 800,
              fontSize: 26
            }}>
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
              <div style={{
                position: 'relative',
                marginBottom: 22,
                width: '100%' // Ensures same width as email field
              }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '15px 44px 15px 16px', // right padding for the button
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
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword(p => !p)}
                  style={{
                    position: 'absolute',
                    right: 11,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    margin: 0,
                    cursor: 'pointer',
                    outline: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 28,
                    width: 28,
                  }}
                  tabIndex={0}
                >
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
                    <ellipse cx="12" cy="12" rx="10" ry="7.5" stroke="#7c3aed" strokeWidth="2" />
                    {showPassword ? (
                      <circle cx="12" cy="12" r="3" fill="#7c3aed" />
                    ) : (
                      <ellipse cx="12" cy="12" rx="2.2" ry="2.2" fill="#7c3aed" />
                    )}
                  </svg>
                </button>
              </div>
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
                  transition: 'background 0.18s, transform 0.18s',
                  transform: 'scale(1)',
                }}
                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                {authMode === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            </form>
            <div style={{
              color: authStatus.startsWith('Logged')
                ? '#22c55e'
                : authStatus.startsWith('Registration')
                ? '#0ea5e9'
                : '#dc2626',
              minHeight: 26,
              marginBottom: 14,
              fontSize: 15,
              opacity: authStatus ? 1 : 0,
              transform: authStatus ? 'translateY(0)' : 'translateY(-10px)',
              transition: 'all 0.33s'
            }}>
              {authStatus}
            </div>
            <div style={{ fontSize: 15 }}>
              {authMode === 'login' ? (
                <>
                  <span style={{ color: '#6d28d9' }}>New here?</span>{' '}
                  <span style={{
                    color: '#2563eb', cursor: 'pointer', fontWeight: 600
                  }}
                    onClick={() => { setAuthMode('register'); setAuthStatus(''); }}>
                    Create account
                  </span>
                </>
              ) : (
                <>
                  <span style={{ color: '#475569' }}>Already have an account?</span>{' '}
                  <span style={{
                    color: '#2563eb', cursor: 'pointer', fontWeight: 600
                  }}
                    onClick={() => { setAuthMode('login'); setAuthStatus(''); }}>
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

  // File Upload & Listing UI
  return (
    <div style={animatedBg}>
      {/* Preview Modal */}
      {previewModal && (
        <div style={{
          position: 'fixed', zIndex: 10000, left: 0, top: 0, width: '100vw', height: '100vh',
          background: 'rgba(30,21,50,0.33)', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
          onClick={() => setPreviewModal(null)}
        >
          <div style={{
            minWidth: 340, maxWidth: 600, width: '90vw',
            background: '#fff', borderRadius: 26, boxShadow: '0 8px 34px #6c47a93b',
            padding: '1.3rem 1.3rem 1rem 1.3rem', position: 'relative', textAlign: 'left'
          }}
            onClick={e => e.stopPropagation()}
          >
            <span style={{ position: 'absolute', right: 25, top: 16, fontWeight: 700, color: '#7c3aed', cursor: 'pointer', fontSize: 22 }}
              onClick={() => setPreviewModal(null)}
              title="Close">&times;</span>
            <div style={{ fontWeight: 700, color: '#312e81', fontSize: 18, marginBottom: 12, overflow: 'auto', wordBreak: 'break-word' }}>
              {previewModal.name}
            </div>
            {previewModal.loading && <Loader />}
            {previewModal.error && <div style={{ color: '#dc2626', fontWeight: 600 }}>{previewModal.error}</div>}
            {!previewModal.loading && !previewModal.error && (
              <>
                {previewModal.type === 'image' && previewModal.content && (
                  <img src={previewModal.content} alt="Preview" style={{ maxWidth: '100%', maxHeight: 350, borderRadius: 12 }} />
                )}
                {previewModal.type === 'pdf' && previewModal.content && (
                  <iframe src={previewModal.content} title="PDF Preview" style={{ width: '100%', height: 390, border: 'none', borderRadius: 10 }}></iframe>
                )}
                {previewModal.type === 'audio' && previewModal.content && (
                  <audio controls style={{ width: '100%' }}>
                    <source src={previewModal.content} />
                    Your browser does not support the audio tag.
                  </audio>
                )}
                {previewModal.type === 'video' && previewModal.content && (
                  <video controls style={{ width: '100%', maxHeight: 340, borderRadius: 8 }}>
                    <source src={previewModal.content} />
                    Your browser does not support the video tag.
                  </video>
                )}
                {previewModal.type === 'text' && previewModal.content && (
                  <pre style={{
                    background: '#f3f4f6', borderRadius: 8, padding: '1rem',
                    maxHeight: 290, overflow: 'auto', fontSize: 15, lineHeight: 1.4
                  }}>{previewModal.content}</pre>
                )}
                {previewModal.type === 'other' && (
                  <div style={{ color: '#888', fontStyle: 'italic' }}>No preview available for this file type.</div>
                )}
              </>
            )}
          </div>
        </div>
      )}
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          width: '100%',
          maxWidth: 500,
          margin: '0 auto',
          padding: '3rem 2rem 2.5rem 2rem',
          background: 'rgba(255,255,255,0.90) linear-gradient(135deg,#e0e7ff 0%,#f5d0fe 100%)',
          borderRadius: 36,
          boxShadow: '0 12px 48px 0 rgba(110,120,250,0.14),0 1.5px 14px 0 rgba(186,150,255,0.05)',
          border: '1.5px solid #e0e7ff',
          opacity: showCard ? 1 : 0,
          transform: showCard ? 'scale(1)' : 'scale(0.97)',
          transition: 'all 0.7s cubic-bezier(.5,.6,0,1)'
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18
          }}>
            <div>
              <h2 style={{
                color: '#312e81', margin: 0, letterSpacing: 0.5, fontWeight: 800, fontSize: 26
              }}>File Upload Demo</h2>
              <div style={{
                fontSize: 15.5, color: '#52525b', marginTop: 2, fontWeight: 500
              }}>{userEmail}</div>
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
                transition: 'background 0.18s, transform 0.13s',
                transform: 'scale(1)'
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >Logout</button>
          </div>
          <form
            onSubmit={handleFileUpload}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              border: dragActive ? '2.5px dashed #6366f1' : '1.5px solid #e5e7eb',
              background: dragActive
                ? 'rgba(196,181,253,0.13)'
                : '#f9fafb',
              borderRadius: 24,
              padding: 22,
              marginBottom: 16,
              boxShadow: dragActive
                ? '0 0 0 7px #a5b4fc33'
                : '0 0.5px 8px 0 #f3e8ff10',
              transition: 'box-shadow 0.3s, border 0.22s, background 0.24s'
            }}
          >
            <label
              htmlFor="file-upload"
              style={{
                display: 'inline-block',
                background: dragActive ? '#e0e7ff' : '#f3f4f6',
                color: dragActive ? '#6366f1' : '#6366f1',
                fontWeight: 600,
                padding: '13px 28px',
                borderRadius: 18,
                cursor: 'pointer',
                marginBottom: 14,
                border: dragActive ? '2px solid #6366f1' : '1.5px solid #a5b4fc',
                fontSize: 16,
                boxShadow: dragActive ? '0 0 0 3px #a5b4fc66' : ''
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
            <div style={{
              marginBottom: 19, fontSize: 15, color: '#3730a3', minHeight: 20, fontWeight: 500
            }}>
              {file ? file.name : (dragActive ? "Drop file here..." : "or drag & drop here")}
            </div>
            <button
              type="submit"
              disabled={uploading}
              style={{
                width: '100%',
                background: uploading
                  ? 'linear-gradient(90deg,#c7d2fe 30%,#818cf8 100%)'
                  : 'linear-gradient(90deg, #6366f1 10%, #818cf8 100%)',
                color: '#fff',
                padding: '14px 0',
                border: 'none',
                borderRadius: 24,
                fontWeight: 700,
                fontSize: 17,
                cursor: uploading ? 'not-allowed' : 'pointer',
                boxShadow: uploading ? 'none' : '0 2px 8px 0 #a5b4fc38',
                transition: 'background 0.18s, transform 0.13s'
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {uploading ? <Loader /> : 'Upload'}
            </button>
          </form>
          <div
            className={statusAnim}
            style={{
              margin: '18px 0 4px 0',
              minHeight: 30,
              color: status.startsWith('File uploaded successfully.')
                ? '#22c55e'
                : status.startsWith('Error') || status.startsWith('Upload') || status.startsWith('Delete failed')
                  ? '#dc2626'
                  : '#444',
              fontWeight: 600,
              fontSize: 15.5,
              letterSpacing: 0.03,
              opacity: status ? 1 : 0,
              transform: status
                ? statusAnim === 'shake'
                  ? 'translateX(-4px)'
                  : 'translateY(0)'
                : 'translateY(-14px)',
              transition: 'all 0.3s'
            }}
          >
            {status}
          </div>
          <hr style={{
            margin: '2rem 0 1.3rem 0',
            border: 'none',
            borderTop: '1.6px solid #c7d2fe',
            opacity: 0.58
          }} />
          <h3 style={{
            color: '#312e81',
            fontSize: 18.5,
            fontWeight: 800,
            marginBottom: 13,
            marginTop: 0,
            letterSpacing: 0.03
          }}>Your Files</h3>
          {uploadedFiles.length === 0 && <div style={{ color: '#b6b7bb', fontSize: 15, marginBottom: 7 }}>No files yet.</div>}
          <ul style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            maxHeight: 155,
            overflowY: 'auto'
          }}>
            {uploadedFiles.map((name, idx) => (
              <li
                key={name}
                style={{
                  margin: '11px 0',
                  display: 'flex',
                  alignItems: 'center',
                  opacity: listAnim ? 1 : 0,
                  transform: listAnim ? 'translateY(0)' : 'translateY(25px)',
                  transition: `all 0.45s cubic-bezier(.44,1.26,.52,1.01) ${0.11 * idx}s`
                }}
              >
                {getFileType(name) === 'image' && previews[name] && (
                  <img
                    src={previews[name]}
                    alt={name}
                    style={{
                      width: 34, height: 34, objectFit: 'cover', borderRadius: 6, marginRight: 10,
                      border: '1.4px solid #a5b4fc', background: '#f3f4f6'
                    }}
                  />
                )}
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
                  onClick={() => handleShowPreview(name)}
                  title="Preview"
                >
                  {name}
                </span>
                <button
                  onClick={() => handleDownload(name)}
                  style={{
                    marginLeft: 8,
                    background: 'linear-gradient(90deg, #bae6fd 50%, #93c5fd 100%)',
                    color: '#2563eb',
                    border: 'none',
                    borderRadius: 12,
                    padding: '6px 12px',
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'background 0.15s, color 0.15s'
                  }}
                >
                  Download
                </button>
                <button
                  onClick={() => handleDelete(name)}
                  style={{
                    marginLeft: 8,
                    background: 'linear-gradient(90deg, #fee2e2 70%, #fca5a5 100%)',
                    color: '#dc2626',
                    border: 'none',
                    borderRadius: 14,
                    padding: '6px 13px',
                    fontSize: 13.5,
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
      {/* Animation CSS */}
      <style>
        {`
          .fadeIn {
            animation: fadeIn 0.5s cubic-bezier(.36,1.2,.42,1.01);
          }
          .shake {
            animation: shake 0.38s cubic-bezier(.58,.01,.96,.7) 1;
          }
          @keyframes fadeIn {
            0% { opacity: 0; transform: translateY(18px);}
            80% { opacity: 1; transform: translateY(-4px);}
            100% { opacity: 1; transform: translateY(0);}
          }
          @keyframes shake {
            0%,100% { transform: translateX(0);}
            16% { transform: translateX(-7px);}
            34% { transform: translateX(5px);}
            52% { transform: translateX(-5px);}
            70% { transform: translateX(4px);}
            88% { transform: translateX(-2px);}
          }
        `}
      </style>
    </div>
  );
}

export default App;


















