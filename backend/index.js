// Import required modules
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create an instance of Express
const app = express();

// Enable CORS 
app.use(cors());

// Make sure uploaded files go into a folder called "uploads"
const UPLOADS_FOLDER = path.join(__dirname, 'uploads');

// If uploads folder doesn't exist, create it
if (!fs.existsSync(UPLOADS_FOLDER)) {
  fs.mkdirSync(UPLOADS_FOLDER);
}

// Set up multer for handling file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_FOLDER); // Save files here
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

app.get('/', (req, res) => {
  res.send('Backend is running.');
});

// POST /upload will handle single file uploads from the frontend
app.post('/upload', upload.single('file'), (req, res) => {
  // If no file is attached, send an error
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded!' });
  }
  // File saved!
  res.json({ success: true, filename: req.file.originalname, message: 'File uploaded successfully.' });
});

// List uploaded files 
app.get('/files', (req, res) => {
  fs.readdir(UPLOADS_FOLDER, (err, files) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Unable to list files.' });
    }
    res.json({ files });
  });
});

// download a file by filename
app.get('/files/:name', (req, res) => {
  const filePath = path.join(UPLOADS_FOLDER, req.params.name);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'File not found.' });
  }
  res.download(filePath);
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
