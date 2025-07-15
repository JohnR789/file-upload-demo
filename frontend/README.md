# File Upload Demo – Full Stack Node.js/Express/React

A modern, extensible file upload platform featuring JWT-based authentication, secure RESTful API endpoints, and advanced file handling. This repository demonstrates hands-on proficiency with Node.js (Express), React, and the construction of robust, real-world authentication and file-management workflows.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Technical Highlights](#technical-highlights)
- [Architecture](#architecture)
- [API Specification](#api-specification)
- [Setup & Local Development](#setup--local-development)
- [Extending/Configuring](#extendingconfiguring)
- [Contact](#contact)

---

## Project Overview

This project implements a secure file upload and management application:

- **Frontend:** React (custom UI, hooks, live previews, animated feedback)
- **Backend:** Node.js (Express), Multer (file upload), JWT (authentication), bcrypt (password security)
- **Security:** JWT access tokens, password hashing, strict CORS, secure file streaming
- **API:** RESTful endpoints, consistent error handling, stateless auth

---

## Technical Highlights

- **Node.js/Express**
  - Layered API design using modular route and middleware structure
  - JWT-based stateless authentication, integrated via Express middleware
  - Password hashing with bcrypt, zero plaintext persistence
  - File upload with Multer, user-level isolation, streaming-safe endpoints
  - Error handling: explicit 4xx/5xx status, secure logging, user-safe messages
  - Cross-origin security: CORS policy, CSRF protection patterns
  - Extensible storage interface: local disk by default, easily swapped for S3, GCS, etc.
- **React Frontend**
  - Single-page app with functional components and hooks
  - Modern, custom UI: animated gradient, interactive feedback, accessible forms
  - Drag-and-drop, modal previews (images, text, PDF, video, audio)
  - Frontend token/session persistence (localStorage)
  - Granular error handling and feedback

---

## Architecture

file-upload-demo/
├── backend/
│ ├── server.js # Express app, routes, CORS, error handlers
│ ├── middleware/ # Auth, file handling, validation
│ └── routes/ # Auth, file, preview endpoints
├── frontend/
│ └── src/
│ └── App.jsx # All UI logic, auth, API calls
└── README.md


**JWT secret** and all sensitive values are environment-driven (`.env`).  
**Backend and frontend are decoupled** and communicate only via RESTful API.

---

## API Specification

**Authentication**

- `POST /register`  
  - Input: `{ email, password }`
  - Output: `{ success, message }`  
  - Hashes password (bcrypt); enforces uniqueness

- `POST /login`  
  - Input: `{ email, password }`
  - Output: `{ success, token }`  
  - Issues JWT on success

**Files**

- `POST /upload`  
  - Auth: Bearer JWT  
  - FormData: `file`  
  - Stores file for user, returns status

- `GET /files`  
  - Auth: Bearer JWT  
  - Output: `{ files: [names...] }`  
  - Lists files for user

- `GET /files/:name`  
  - Auth: Bearer JWT  
  - Returns file as attachment

- `GET /files/:name/preview`  
  - Auth: Bearer JWT  
  - For images, text, PDF, audio, video: streams safe browser preview  
  - Returns 415 for unsupported types

- `DELETE /files/:name`  
  - Auth: Bearer JWT  
  - Deletes file for user

**Auth header**:  
`Authorization: Bearer <jwt_token>`

---

## Setup & Local Development

**Backend**

```bash
cd backend
npm install
# Add .env with:
#   JWT_SECRET=your_jwt_secret
npm start
# Default: http://localhost:4000

**Frontend**

cd frontend
npm install
npm start
# Default: http://localhost:3000

Extending/Configuring
Storage:

The backend supports local disk by default; swap in S3/GCS adapters for cloud use.

Security:

JWT expiration and password requirements configurable in .env

CORS origin(s) are easily locked down for production

API:

All endpoints are modular, with clear separation of validation, business logic, and transport

Frontend:

Easily replace custom CSS with Tailwind, MUI, or integrate into a larger app

Contact
John Rollins
rollinsj789@gmail.com
www.linkedin.com/in/johnr789
