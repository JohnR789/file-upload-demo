import React, { useState, useEffect } from 'react';

// File upload
function App() {
  // Store the selected file, upload state, and feedback/status messages
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);

  // Handle when a user picks a file
  function handleFileChange(e) {
    setFile(e.target.files[0]);
    setStatus('');
  }

  // Upload the selected file to the backend
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
        setStatus('File uploaded!');
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

  // Get the current list of uploaded files
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

  // Load files when the page first appears
  useEffect(() => {
    fetchFiles();
  }, []);

  return (
    <div style={{
      maxWidth: 400,
      margin: '3rem auto',
      textAlign: 'center',
      padding: 24,
      border: '1px solid #eee',
      borderRadius: 12
    }}>
      <h2>File Upload Demo</h2>
      <form onSubmit={handleSubmit}>
        <input type="file" onChange={handleFileChange} />
        <br /><br />
        <button
          type="submit"
          disabled={uploading}
          style={{
            padding: '8px 24px',
            borderRadius: 6,
            cursor: uploading ? 'not-allowed' : 'pointer'
          }}
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </form>
      <div style={{ marginTop: 16, minHeight: 24 }}>{status}</div>
      <hr style={{ margin: '2rem 0' }} />
      <h3>Uploaded Files</h3>
      {uploadedFiles.length === 0 && <div>No files yet.</div>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {uploadedFiles.map(name => (
          <li key={name} style={{ margin: '8px 0' }}>
            <a
              href={`https://file-upload-demo-8ti2.onrender.com/files/${encodeURIComponent(name)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {name}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;



