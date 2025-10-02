import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import jwt from 'jsonwebtoken';
import { eq, and, desc, sql } from 'drizzle-orm';

dotenv.config();

// Database schema
const { users, animeReviews, reviewVotes } = await import('./db/schema.js');

// Database connection
const connectionString = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
const client = postgres(connectionString);
const db = drizzle(client);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.userId = decoded.userId;
    }
    next();
  } catch (error) {
    next();
  }
};

// ==================== REVIEW ENDPOINTS ====================

// Submit a review
app.post('/api/reviews', authenticate, async (req, res) => {
  try {
    const { animeId, animeTitle, rating, reviewText, spoilerWarning } = req.body;
    const userId = req.userId;

    // Validate rating
    if (!rating || rating < 1 || rating > 10) {
      return res.status(400).json({ error: 'Rating must be between 1 and 10' });
    }

    // Check if user already reviewed this anime
    const existingReview = await db
      .select()
      .from(animeReviews)
      .where(and(
        eq(animeReviews.userId, userId),
        eq(animeReviews.animeId, animeId)
      ))
      .limit(1);

    if (existingReview.length > 0) {
      return res.status(400).json({ error: 'You have already reviewed this anime' });
    }

    // Insert review
    const [review] = await db
      .insert(animeReviews)
      .values({
        userId,
        animeId,
        animeTitle,
        rating,
        reviewText: reviewText || null,
        spoilerWarning: spoilerWarning || false,
        helpful: 0,
        reported: false,
      })
      .returning();

    res.status(201).json(review);
  } catch (error) {
    console.error('Submit review error:', error);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// Get reviews for an anime
app.get('/api/reviews/anime/:animeId', optionalAuth, async (req, res) => {
  try {
    const { animeId } = req.params;
    const { page = 1, limit = 10, sortBy = 'recent' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Determine sort order
    let orderBy;
    if (sortBy === 'helpful') {
      orderBy = desc(animeReviews.helpful);
    } else {
      orderBy = desc(animeReviews.createdAt);
    }

    // Get reviews with user info
    const reviews = await db
      .select({
        id: animeReviews.id,
        userId: animeReviews.userId,
        username: users.username,
        avatar: users.avatarId,
        animeId: animeReviews.animeId,
        animeTitle: animeReviews.animeTitle,
        rating: animeReviews.rating,
        reviewText: animeReviews.reviewText,
        spoilerWarning: animeReviews.spoilerWarning,
        helpful: animeReviews.helpful,
        reported: animeReviews.reported,
        createdAt: animeReviews.createdAt,
        updatedAt: animeReviews.updatedAt,
      })
      .from(animeReviews)
      .leftJoin(users, eq(animeReviews.userId, users.id))
      .where(eq(animeReviews.animeId, animeId))
      .orderBy(orderBy)
      .limit(parseInt(limit))
      .offset(offset);

    // Get total count
    const [{ count }] = await db
      .select({ count: sql`count(*)` })
      .from(animeReviews)
      .where(eq(animeReviews.animeId, animeId));

    res.json({
      reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(count),
        pages: Math.ceil(parseInt(count) / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Get user's review for an anime
app.get('/api/reviews/anime/:animeId/mine', authenticate, async (req, res) => {
  try {
    const { animeId } = req.params;
    const userId = req.userId;

    const [review] = await db
      .select()
      .from(animeReviews)
      .where(and(
        eq(animeReviews.userId, userId),
        eq(animeReviews.animeId, animeId)
      ))
      .limit(1);

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json(review);
  } catch (error) {
    console.error('Get user review error:', error);
    res.status(500).json({ error: 'Failed to fetch review' });
  }
});

// Update a review
app.put('/api/reviews/:reviewId', authenticate, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, reviewText, spoilerWarning } = req.body;
    const userId = req.userId;

    // Check if review exists and belongs to user
    const [existingReview] = await db
      .select()
      .from(animeReviews)
      .where(eq(animeReviews.id, parseInt(reviewId)))
      .limit(1);

    if (!existingReview) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (existingReview.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Update review
    const [updatedReview] = await db
      .update(animeReviews)
      .set({
        rating,
        reviewText: reviewText || null,
        spoilerWarning: spoilerWarning || false,
        updatedAt: new Date(),
      })
      .where(eq(animeReviews.id, parseInt(reviewId)))
      .returning();

    res.json(updatedReview);
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

// Delete a review
app.delete('/api/reviews/:reviewId', authenticate, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.userId;

    // Check if review exists and belongs to user
    const [existingReview] = await db
      .select()
      .from(animeReviews)
      .where(eq(animeReviews.id, parseInt(reviewId)))
      .limit(1);

    if (!existingReview) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (existingReview.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Delete votes first
    await db
      .delete(reviewVotes)
      .where(eq(reviewVotes.reviewId, parseInt(reviewId)));

    // Delete review
    await db
      .delete(animeReviews)
      .where(eq(animeReviews.id, parseInt(reviewId)));

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

// Vote on a review
app.post('/api/reviews/:reviewId/vote', authenticate, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { helpful } = req.body;
    const userId = req.userId;

    // Check if user already voted
    const [existingVote] = await db
      .select()
      .from(reviewVotes)
      .where(and(
        eq(reviewVotes.reviewId, parseInt(reviewId)),
        eq(reviewVotes.userId, userId)
      ))
      .limit(1);

    if (existingVote) {
      // Update vote
      await db
        .update(reviewVotes)
        .set({ helpful })
        .where(eq(reviewVotes.id, existingVote.id));
    } else {
      // Insert new vote
      await db
        .insert(reviewVotes)
        .values({
          reviewId: parseInt(reviewId),
          userId,
          helpful,
        });
    }

    // Update review helpful count
    const [{ count: helpfulCount }] = await db
      .select({ count: sql`count(*)` })
      .from(reviewVotes)
      .where(and(
        eq(reviewVotes.reviewId, parseInt(reviewId)),
        eq(reviewVotes.helpful, true)
      ));

    await db
      .update(animeReviews)
      .set({ helpful: parseInt(helpfulCount) })
      .where(eq(animeReviews.id, parseInt(reviewId)));

    res.json({ message: 'Vote recorded successfully' });
  } catch (error) {
    console.error('Vote review error:', error);
    res.status(500).json({ error: 'Failed to vote on review' });
  }
});

// Report a review
app.post('/api/reviews/:reviewId/report', authenticate, async (req, res) => {
  try {
    const { reviewId } = req.params;

    await db
      .update(animeReviews)
      .set({ reported: true })
      .where(eq(animeReviews.id, parseInt(reviewId)));

    res.json({ message: 'Review reported successfully' });
  } catch (error) {
    console.error('Report review error:', error);
    res.status(500).json({ error: 'Failed to report review' });
  }
});

// Get anime rating statistics
app.get('/api/reviews/anime/:animeId/stats', async (req, res) => {
  try {
    const { animeId } = req.params;

    const stats = await db
      .select({
        averageRating: sql`avg(${animeReviews.rating})`,
        totalReviews: sql`count(*)`,
      })
      .from(animeReviews)
      .where(eq(animeReviews.animeId, animeId));

    res.json({
      averageRating: parseFloat(stats[0]?.averageRating || 0).toFixed(1),
      totalReviews: parseInt(stats[0]?.totalReviews || 0),
    });
  } catch (error) {
    console.error('Get rating stats error:', error);
    res.status(500).json({ error: 'Failed to fetch rating stats' });
  }
});

// Get user's all reviews
app.get('/api/reviews/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const reviews = await db
      .select()
      .from(animeReviews)
      .where(eq(animeReviews.userId, parseInt(userId)))
      .orderBy(desc(animeReviews.createdAt))
      .limit(parseInt(limit))
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql`count(*)` })
      .from(animeReviews)
      .where(eq(animeReviews.userId, parseInt(userId)));

    res.json({
      reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(count),
        pages: Math.ceil(parseInt(count) / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get user reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch user reviews' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Review API is running' });
});

app.listen(PORT, () => {
  console.log(`🚀 Review API server running on http://localhost:${PORT}`);
  console.log(`📊 Database: ${connectionString ? 'Connected' : 'Not configured'}`);
});
