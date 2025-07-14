import React, { useState, useEffect } from 'react';

function App() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);

  function handleFileChange(e) {
    setFile(e.target.files[0]);
    setStatus('');
  }

  async function handleSubmit(e) {
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
      const response = await fetch('https://file-upload-demo-8ti2.onrender.com/upload', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (result.success) {
        setStatus('✅ File uploaded!');
        setFile(null);
        fetchFiles();
      } else {
        setStatus(result.message || 'Upload failed.');
      }
    } catch (error) {
      console.error(error);
      setStatus('Error uploading file.');
    } finally {
      setUploading(false);
    }
  }

  async function fetchFiles() {
    try {
      const res = await fetch('https://file-upload-demo-8ti2.onrender.com/files');
      const data = await res.json();
      setUploadedFiles(data.files || []);
    } catch (error) {
      console.error(error);
      setUploadedFiles([]);
    }
  }

  useEffect(() => {
    fetchFiles();
  }, []);

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
        <h2 style={{ color: '#223555', marginBottom: 20, letterSpacing: 0.5 }}>File Upload Demo</h2>
        <form onSubmit={handleSubmit}>
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
            {file && file.name}
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
        <div style={{ margin: '20px 0', minHeight: 28, color: status.startsWith('✅') ? '#16a34a' : status.startsWith('❌') ? '#ef4444' : '#444' }}>{status}</div>
        <hr style={{ margin: '1.8rem 0' }} />
        <h3 style={{ color: '#223555', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Uploaded Files</h3>
        {uploadedFiles.length === 0 && <div style={{ color: '#bbb' }}>No files yet.</div>}
        <ul style={{ listStyle: 'none', padding: 0, maxHeight: 130, overflowY: 'auto' }}>
          {uploadedFiles.map(name => (
            <li key={name} style={{ margin: '7px 0' }}>
              <a
                href={`https://file-upload-demo-8ti2.onrender.com/files/${encodeURIComponent(name)}`}
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
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;




