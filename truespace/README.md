# Truespace - Educational Video Platform

Truespace is an educational platform that provides access to video courses through promo codes. It's built with a modern tech stack including Next.js, React, TypeScript, Tailwind CSS, and MongoDB.

## Features

- 🔒 Secure authentication system
- 🎟️ Promo code-based access to premium content
- 📚 Course catalog with video playback
- ❤️ Favorites system for saved courses
- 🔍 Search and filter functionality
- 👤 User profiles
- 📱 Responsive design for all devices
- 🎨 Dark mode UI

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT (JSON Web Tokens)

## Getting Started

### Prerequisites

- Node.js (v14 or newer)
- npm or yarn
- MongoDB database (local or Atlas)

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/truespace.git
   cd truespace
   ```

2. Install dependencies
   ```bash
   npm install
   # or
   yarn
   ```

3. Create a `.env.local` file in the root directory with the following variables:
   ```
   MONGODB_URI=your_mongodb_uri
   JWT_SECRET=your_jwt_secret
   ```

4. Start the development server
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Deployment on Render

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Configure the service:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment Variables**: Add `MONGODB_URI` and `JWT_SECRET`
4. Deploy the service

## Project Structure

```
truespace/
├── src/
│   ├── app/             # Next.js App Router
│   │   ├── api/         # API routes
│   │   ├── auth/        # Authentication pages
│   │   ├── courses/     # Course pages
│   │   ├── profile/     # User profile pages
│   │   ├── favorites/   # Favorites pages
│   │   └── admin/       # Admin panel
│   ├── components/      # React components
│   │   ├── auth/        # Authentication components
│   │   ├── courses/     # Course-related components
│   │   ├── navigation/  # Navigation components
│   │   └── ui/          # UI components
│   ├── lib/             # Utility functions
│   ├── models/          # Mongoose models
│   └── hooks/           # Custom React hooks
├── public/              # Static files
└── ...
```

## Database Schema

The application uses the following MongoDB collections:

- **users**: User accounts with authentication
- **courses**: Course information
- **videos**: Video content linked to courses
- **promoCodes**: Promo codes for course access
- **admins**: Administrator accounts

## Promo Code System

The promo code system works as follows:

1. Administrators generate promo codes with specific permissions
2. Each promo code can grant access to one or more courses
3. Promo codes can have expiration dates and usage limits
4. Users enter promo codes in their profile to unlock content
5. Once a course is unlocked, it remains available in the user's account

## License

This project is licensed under the ISC License. 