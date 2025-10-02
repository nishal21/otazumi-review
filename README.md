# Otazumi Review API

Backend API server for anime reviews, ratings, and user feedback system.

## Features

- ✅ Submit anime reviews with ratings (1-10)
- ✅ Get reviews for specific anime
- ✅ Update and delete your own reviews
- ✅ Vote on reviews (helpful/not helpful)
- ✅ Report inappropriate reviews
- ✅ Get anime rating statistics
- ✅ User authentication with JWT
- ✅ PostgreSQL database with Drizzle ORM

## Setup

### 1. Install Dependencies

```bash
cd review-api
npm install
```

### 2. Configure Environment Variables

Edit `.env` file:

```env
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_secret_key
PORT=3000
```

### 3. Make Sure Database is Migrated

The database tables should already be created from the main project's migration:

```bash
# Run from main project folder
npm run db:push
```

### 4. Start the Server

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

The API will be available at `http://localhost:3000`

## API Endpoints

### Reviews

- `POST /api/reviews` - Submit a review (requires auth)
- `GET /api/reviews/anime/:animeId` - Get reviews for an anime
- `GET /api/reviews/anime/:animeId/mine` - Get your review for an anime (requires auth)
- `PUT /api/reviews/:reviewId` - Update your review (requires auth)
- `DELETE /api/reviews/:reviewId` - Delete your review (requires auth)
- `POST /api/reviews/:reviewId/vote` - Vote on a review (requires auth)
- `POST /api/reviews/:reviewId/report` - Report a review (requires auth)
- `GET /api/reviews/anime/:animeId/stats` - Get rating statistics
- `GET /api/reviews/user/:userId` - Get all reviews by a user

### Health Check

- `GET /api/health` - Check if API is running

## Authentication

Include JWT token in Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Deployment

### Deploy to Vercel

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

### Deploy to Railway/Render

1. Push code to GitHub
2. Connect repository to Railway/Render
3. Set environment variables
4. Deploy

## Update Frontend

Make sure your frontend `.env` has the review API URL:

```env
# Review API (this backend)
VITE_REVIEW_API_URL=http://localhost:3000/api

# Or for production:
VITE_REVIEW_API_URL=https://your-backend-url.vercel.app/api

# Note: Keep your existing VITE_API_URL for anime data
VITE_API_URL=https://animeapi-tau.vercel.app/api
```

## Notes

- JWT secret should be changed in production
- The same database is used as the main app
- CORS is enabled for all origins (configure for production)
