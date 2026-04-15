App link: [gloria-midterm-project.vercel.app ](https://gloria-midterm-project.vercel.app/)

# 📚 LibraGate NEU — Library Visitor Management System

> A modern, real-time visitor logging and management system for **New Era University Library**, built with React and Firebase.

---

## 🗂️ Table of Contents

- [Overview](#overview)
- [Live Demo](#live-demo)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Roles & Access Control](#roles--access-control)
- [Pages & Modules](#pages--modules)
- [Data Models](#data-models)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Deployment (Vercel)](#deployment-vercel)
- [Firebase Setup](#firebase-setup)
- [Known Notes & Constraints](#known-notes--constraints)

---

## Overview

**LibraGate NEU** is a full-stack web application that replaces the traditional paper-based library logbook at New Era University. It allows students and faculty to log their library visits through a kiosk interface, while administrators can monitor real-time activity, generate reports, and manage user accounts — all from a clean, modern dashboard.

---

## Live Demo

> Deployed on Vercel. Access requires a `@neu.edu.ph` institutional email.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + React Router v6 |
| Auth | Firebase Authentication (Google OAuth + Email/Password) |
| Database | Firebase Firestore (real-time NoSQL) |
| Hosting | Vercel |
| UI Library | Lucide React (icons) |
| Notifications | react-hot-toast |
| Fonts | Poppins (Google Fonts) |
| Date Utilities | date-fns |

---

## Features

### 🔐 Authentication
- **Google Sign-In** via Firebase OAuth — restricted to `@neu.edu.ph` accounts only
- **Email/Password** login for both students and admins
- **Super-Admin hook** — `jcesperanza@neu.edu.ph` is automatically assigned Admin role on any sign-in
- **Popup-to-redirect fallback** — automatically falls back to `signInWithRedirect` when browser tracking prevention blocks popups (Safari, Edge)
- **Blocked account detection** — blocked users are signed out immediately with a clear error message
- **Password reset** via Firebase email link

### 🖥️ Visitor Kiosk (Student/Faculty)
- Email-only login — no password required for visitors
- Select **Purpose of Visit** from 11 options with emoji icons
- Select **College / Department** from 12 colleges
- Select **Course / Program** (dynamically filtered by college)
- Select **Year Level / Role**
- One-tap **Log My Visit** button records the visit instantly
- Success screen with logged timestamp
- Pre-fills college, course, and year level from stored profile

### 📊 Admin Dashboard
- Real-time stats cards: **Today**, **This Week**, **This Month**
- **Visits by College** bar chart with college-specific color coding
- **Visits by Purpose** bar chart
- Advanced **dropdown filters**: Purpose of Visit, College, Employment Status
- Active filter indicators with clear/reset
- **Library Gallery** carousel
- Refresh button with spin animation

### 📋 Visit Logs
- Real-time log of all library visits
- Full-text search by name, email, college, or purpose
- **Date range filter** (from / to)
- **Dropdown filters**: College, Purpose, Visitor Type
- Visitor type tags: 🎓 Student · 👩‍🏫 Faculty/Staff · 🏛️ Visitor
- Record count display

### 👥 User Management
- Full list of all registered visitor accounts
- Search by name, email, or college
- **Dropdown filters**: College, Visitor Type (Student / Faculty & Staff)
- Edit user profile (College, Year Level)
- Block / Unblock accounts
- Visual type tags per user

### 📈 Reports
- Summary cards: Today / This Week / This Month
- **Visits by College** breakdown chart
- **Custom Date Range** report generator
- **CSV Export** of date-range results (Name, Email, College, Purpose, Time In, Time Out, Status)

### ⚙️ Settings
- View current admin account info (Name, Email, Role)
- **Admin QR Code** generator (one-time use, expires in 5 minutes)
- **Register New Admin** — create additional admin accounts directly from the dashboard

### 🖨️ Kiosk Mode (Admin)
- Admins can switch to the visitor kiosk via the **Kiosk Mode** button in the sidebar
- Admins are automatically identified as **Faculty / Staff** in the kiosk
- A **Back to Dashboard** button appears in the kiosk header for admins

### 🎨 UI/UX
- Smooth page transitions with CSS animations
- Sidebar collapse to icon-only mode with tooltips
- Mobile-responsive layout with slide-in sidebar
- Skeleton loading states
- Consistent navy/white design language

---

## Project Structure

```
src/
├── components/
│   ├── auth/
│   │   └── RoleRoute.jsx          # Role-based route guard
│   ├── layout/
│   │   ├── Sidebar.jsx            # Admin sidebar with navigation
│   │   ├── Sidebar.css
│   │   ├── AdminLayout.jsx
│   │   └── VisitorLayout.jsx
│   ├── transitions/
│   │   ├── PageTransition.jsx     # Route transition wrapper
│   │   └── PageTransition.css
│   └── ui/
│       ├── LibraryCarousel.jsx    # Auto-sliding image carousel
│       ├── QRCode.jsx             # QR code renderer (CDN-based)
│       ├── QRModal.jsx            # Admin QR modal
│       └── QRModal.css
├── firebase/
│   ├── config.js                  # Firebase app init + persistence
│   ├── auth.js                    # All auth functions
│   └── firestore.js               # All Firestore read/write functions
├── hooks/
│   └── useAuth.jsx                # Auth context + role resolver
├── pages/
│   ├── Login.jsx                  # Login/register page (all views)
│   ├── Login.css
│   ├── admin/
│   │   ├── AdminDashboard.jsx     # Stats + filters + charts
│   │   ├── AdminLogs.jsx          # Visit log table
│   │   ├── AdminUsers.jsx         # User management table
│   │   ├── AdminReports.jsx       # Reports + CSV export
│   │   └── AdminSettings.jsx      # Account info + new admin
│   ├── visitor/
│   │   ├── VisitorHome.jsx        # Kiosk logger
│   │   └── VisitorHome.css
│   └── qr/
│       ├── AdminQRPage.jsx        # QR scan landing (admin)
│       └── VisitorQRPage.jsx      # QR scan landing (visitor)
├── styles/
│   ├── globals.css                # CSS variables + resets
│   └── animations.css             # Keyframe animations
└── utils/
    ├── helpers.js                 # Constants, formatters, college/course data
    ├── qrToken.js                 # QR token utilities
    └── transitions.js             # Navigation transition helpers
```

---

## Roles & Access Control

| Role | Login Method | Access |
|------|-------------|--------|
| **Student / Faculty** | Google (`@neu.edu.ph`) or Email | Kiosk only (`/visitor/home`) |
| **Admin** | Email + Password | Dashboard (`/admin/*`) + Kiosk (`/kiosk`) |
| **Super-Admin** | Google or Email (`jcesperanza@neu.edu.ph`) | Auto-assigned Admin role |

### Route Guards
- `RoleRoute` component wraps every protected page
- Students attempting to access admin routes are redirected to `/visitor/home`
- Admins can access both admin routes and the kiosk
- Unauthenticated users are redirected to `/login`

---

## Pages & Modules

### `/login`
Multi-view login page with the following states:
- `select` — Choose Student/Faculty or Administrator
- `visitor` — Google sign-in + email-only sign-in form
- `visitor-register` — Name + email registration (no password)
- `visitor-setup` — First-time Google users choose Faculty or Student
- `admin-login` — Email + password sign-in
- `admin-register` — Create a new admin account
- `forgot` — Password reset via email

### `/visitor/home` and `/kiosk`
The visitor kiosk logger. Identical page, accessible by students at `/visitor/home` and by admins at `/kiosk`.

### `/admin/dashboard`
Real-time overview with filterable stats cards and breakdown charts.

### `/admin/logs`
Full searchable, filterable table of all visit records.

### `/admin/users`
User account management with edit and block/unblock controls.

### `/admin/reports`
Analytics summary with date-range querying and CSV export.

### `/admin/settings`
Admin profile info, QR code generator, and new admin registration.

---

## Data Models

### `users` collection
```js
{
  uid:         string,
  email:       string,
  name:        string,
  displayName: string,
  photoURL:    string,
  college:     string,
  course:      string,
  yearLevel:   string,   // '1st Year' | ... | 'Faculty / Staff'
  visitorType: string,   // 'Student' | 'Faculty / Staff' | 'Visitor'
  role:        string,   // 'visitor' | 'admin'
  blocked:     boolean,
  createdAt:   Timestamp,
  lastLogin:   Timestamp,
}
```

### `admins` collection
```js
{
  uid:         string,
  email:       string,
  displayName: string,
  role:        'admin',
  createdAt:   Timestamp,
}
```

### `logs` collection
```js
{
  uid:         string,
  name:        string,
  email:       string,
  college:     string,
  course:      string,
  yearLevel:   string,
  purpose:     string,
  visitorType: string,
  photoURL:    string,
  timeIn:      Timestamp,
  timeOut:     Timestamp | null,
  status:      'in' | 'out',
  createdAt:   Timestamp,
}
```

### `qr_tokens` collection
```js
{
  uid:       string,   // Admin UID
  token:     string,   // Random 32-byte hex
  exp:       number,   // Unix timestamp — expires in 5 minutes
  used:      boolean,  // One-time use flag
  createdAt: Timestamp,
}
```

---

## Supported Colleges

| College |
|---------|
| College of Arts and Sciences |
| College of Business and Accountancy |
| College of Computer Studies |
| College of Education |
| College of Engineering |
| College of Law |
| College of Medicine |
| College of Nursing |
| College of Psychology |
| Graduate School |
| Senior High School |
| Other |

## Supported Purposes of Visit

| Icon | Purpose |
|------|---------|
| 📖 | Reading |
| 🔬 | Researching |
| 📝 | Studying |
| 💻 | Using a Computer |
| 📚 | Borrowing Books |
| ↩️ | Returning Books |
| 👥 | Group Study |
| 🎓 | Thesis / Capstone Work |
| 🖨️ | Printing / Photocopying |
| 👩‍🏫 | Faculty Work |
| 📌 | Other |

---

## Environment Variables

Create a `.env.local` file in the project root with the following keys from your Firebase project settings:

```env
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

> ⚠️ Never commit `.env.local` to version control. Add it to `.gitignore`.

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+
- A Firebase project with Firestore and Authentication enabled

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/janneogloria/Gloria-Midterm-Project.git
cd Gloria-Midterm-Project

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Fill in your Firebase config values in .env.local

# 4. Start development server
npm start
```

The app will run at `http://localhost:3000`.

---

## Deployment (Vercel)

### Step 1 — Push to GitHub
```bash
git add .
git commit -m "your message"
git push origin main
```

### Step 2 — Connect to Vercel
1. Go to [vercel.com](https://vercel.com) and import your GitHub repository
2. Vercel auto-detects Create React App — no build config needed

### Step 3 — Add Environment Variables
In Vercel → Project → **Settings → Environment Variables**, add all 6 `REACT_APP_*` keys from your `.env.local`.

### Step 4 — Deploy
Vercel automatically deploys on every push to `main`. Monitor builds in the **Deployments** tab.

---

## Firebase Setup

### 1. Enable Authentication Providers
Firebase Console → **Authentication → Sign-in method**:
- ✅ Enable **Google**
- ✅ Enable **Email/Password**

### 2. Add Authorized Domains
Firebase Console → **Authentication → Settings → Authorized domains**:
- Add `localhost` (for local development)
- Add `your-project.vercel.app` (for production)

### 3. Create Firestore Database
Firebase Console → **Firestore Database → Create database**
- Start in **production mode**
- Add the following security rules:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Admins can read/write everything
    match /{document=**} {
      allow read, write: if request.auth != null &&
        exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }
    // Users can read/write their own document
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    // Authenticated users can create logs
    match /logs/{logId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null;
    }
  }
}
```

### 4. Super-Admin Setup
The email `jcesperanza@neu.edu.ph` is hardcoded in `src/firebase/auth.js` as a super-admin. On first sign-in (Google or email), an admin document is automatically created in the `admins` collection.

To add more super-admins, edit the `ADMIN_EMAILS` array in `src/firebase/auth.js`:
```js
export const ADMIN_EMAILS = [
  'jcesperanza@neu.edu.ph',
  // add more emails here
];
```

---

## Known Notes & Constraints

- **Composite indexes avoided** — all multi-field queries are done with a single Firestore `where`/`orderBy` and filtered in JavaScript to avoid requiring index creation.
- **Visitor authentication** — visitors log in with email only. A hidden system-generated password is used internally with Firebase Auth so no password is ever shown to the user.
- **Admin QR codes** are one-time use and expire after 5 minutes for security.
- **Google Sign-In** requires the domain to be listed in Firebase Authorized Domains. `localhost` must be added manually for local development.
- **`@neu.edu.ph` domain enforcement** — Google sign-in rejects any non-NEU Google account with a clear error message.

---

## Author

**Jan-neo S. Gloria**
New Era University — Midterm Project
Library Management System — LibraGate NEU

---

*Built with React + Firebase · Deployed on Vercel*
