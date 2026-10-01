# CampusConnectICU Web Frontend

A modern React-based web application for CampusConnectICU, a student social networking platform.

## Features

- **Authentication System**: Login and signup with student credentials
- **User Profiles**: Create and edit profiles with skills, bio, and student information
- **Search Functionality**: Find friends by name, student number, or department
- **Messaging System**: Real-time chat with media sharing capabilities
- **Posts/Feed System**: Create posts with media and view activity feed
- **Responsive Design**: Modern UI built with TailwindCSS

## Tech Stack

- **React 18** - UI library
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **TailwindCSS** - Utility-first CSS framework
- **Lucide React** - Icon library

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn

## Installation

1. Navigate to the web directory:
```bash
cd web
```

2. Install dependencies:
```bash
npm install
```

## Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Build for Production

Create an optimized production build:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Project Structure

```
web/
├── src/
│   ├── pages/
│   │   ├── Login.jsx          # Login page
│   │   ├── Signup.jsx         # Registration page
│   │   ├── Home.jsx           # Main feed with posts
│   │   ├── Profile.jsx        # User profile page
│   │   ├── Search.jsx         # Search for users
│   │   └── Messages.jsx       # Messaging interface
│   ├── App.jsx                # Main app component with routing
│   ├── main.jsx               # Entry point
│   └── index.css              # Global styles
├── index.html                 # HTML template
├── package.json               # Dependencies and scripts
├── vite.config.js             # Vite configuration
├── tailwind.config.js         # TailwindCSS configuration
└── postcss.config.js          # PostCSS configuration
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Features Overview

### Authentication
- Email/username and password login
- Student registration with full credentials (student number, email, phone, password)
- Form validation

### User Profile
- Profile picture upload
- Personal information (name, student number, email, phone)
- Academic information (age, year of study, department)
- Skills showcase
- Bio/about section
- Edit profile functionality

### Search
- Search users by name
- Search by student number
- Search by department
- Real-time filtering
- Quick actions (message, add friend)

### Messaging
- Conversation list with online status
- Real-time chat interface
- Media sharing (images, videos, files)
- Unread message indicators
- Message timestamps

### Posts/Feed
- Create text posts
- Add media to posts (photos, videos)
- Like and comment on posts
- Share posts
- Activity feed with chronological ordering

## Future Enhancements

- Backend API integration
- Real-time messaging with WebSocket
- Image upload and storage
- Video upload and streaming
- Notification system
- Friend request system
- Group messaging
- Story features
- Advanced search filters

## Notes

- This is a frontend-only implementation
- Currently uses mock data for demonstration
- Backend API integration is pending
- All authentication flows are simulated

## License

This project is part of CampusConnectICU.
