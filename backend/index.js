// Backend server for file upload, download, and preview with user authentication
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'changeme!';

// Users storage
const USERS_FILE = path.join(__dirname, 'users.json');
async function loadUsers() {
  try {
    const data = await fsPromises.readFile(USERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}
async function saveUsers(users) {
  await fsPromises.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

// JWT Auth Middleware
function authMiddleware(req, res, next) {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ success: false, message: 'No token' });
  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

// Registration
app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ success: false, message: 'Email and password required.' });

  const users = await loadUsers();
  if (users.find(u => u.email === email))
    return res.status(409).json({ success: false, message: 'Email already registered.' });

  const hashed = await bcrypt.hash(password, 10);
  const newUser = { id: Date.now().toString(), email, password: hashed };
  users.push(newUser);
  await saveUsers(users);

  // Create user uploads folder
  const userUploadDir = path.join(__dirname, 'uploads', newUser.id);
  if (!fs.existsSync(userUploadDir)) {
    fs.mkdirSync(userUploadDir, { recursive: true });
  }

  res.json({ success: true, message: 'Registration successful.' });
});

// Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ success: false, message: 'Email and password required.' });

  const users = await loadUsers();
  const user = users.find(u => u.email === email);
  if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials.' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ success: false, message: 'Invalid credentials.' });

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '2h' });
  res.json({ success: true, token });
});

// Multer storage per user
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.user.id;
    const userUploadDir = path.join(__dirname, 'uploads', userId);
    if (!fs.existsSync(userUploadDir)) {
      fs.mkdirSync(userUploadDir, { recursive: true });
    }
    cb(null, userUploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage });

// Home
app.get('/', (req, res) => {
  res.send('Backend is running.');
});

// Upload file (auth)
app.post('/upload', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded!' });
  }
  res.json({ success: true, filename: req.file.originalname, message: 'File uploaded successfully.' });
});

// List files (auth)
app.get('/files', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const userUploadDir = path.join(__dirname, 'uploads', userId);
  fs.readdir(userUploadDir, (err, files) => {
    if (err) {
      return res.json({ files: [] });
    }
    res.json({ files });
  });
});

// Download file (auth)
app.get('/files/:name', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const filePath = path.join(__dirname, 'uploads', userId, req.params.name);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'File not found.' });
  }
  res.download(filePath);
});

// File preview endpoint (supports images, pdfs, audio, video, text)
app.get('/files/:name/preview', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const filePath = path.join(__dirname, 'uploads', userId, req.params.name);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found.');
  }
  const ext = path.extname(filePath).slice(1).toLowerCase();

  // Images
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) {
    res.setHeader('Content-Type', `image/${ext === 'jpg' ? 'jpeg' : ext}`);
    return fs.createReadStream(filePath).pipe(res);
  }

  // PDF
  if (ext === 'pdf') {
    res.setHeader('Content-Type', 'application/pdf');
    return fs.createReadStream(filePath).pipe(res);
  }

  // Audio
  if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext)) {
    res.setHeader('Content-Type', `audio/${ext}`);
    return fs.createReadStream(filePath).pipe(res);
  }

  // Video
  if (['mp4', 'webm', 'mov', 'mkv'].includes(ext)) {
    res.setHeader('Content-Type', `video/${ext}`);
    return fs.createReadStream(filePath).pipe(res);
  }

  // Text preview (first 20 lines)
  if (['txt', 'md', 'csv', 'json', 'log'].includes(ext)) {
    res.setHeader('Content-Type', 'text/plain');
    const stream = fs.createReadStream(filePath, { encoding: 'utf-8' });
    let data = '';
    let lineCount = 0;
    stream.on('data', chunk => {
      data += chunk;
      const lines = data.split('\n');
      if (lines.length > 20) {
        stream.destroy();
        res.end(lines.slice(0, 20).join('\n') + '\n... (truncated)');
      }
    });
    stream.on('close', () => {
      const lines = data.split('\n');
      if (lines.length <= 20) {
        res.end(lines.join('\n'));
      }
    });
    stream.on('error', () => res.status(500).send('Error reading file.'));
    return;
  }

  // Other: force download
  res.download(filePath);
});

// Delete file (auth)
app.delete('/files/:name', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const filePath = path.join(__dirname, 'uploads', userId, req.params.name);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: 'File not found.' });
  }
  fs.unlink(filePath, (err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Failed to delete file.' });
    }
    res.json({ success: true, message: 'File deleted.' });
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


