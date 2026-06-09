require('dotenv').config();
const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('portfolio');
  cachedClient = client;
  cachedDb = db;
  return { client, db };
}

function verifyToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7);
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const decoded = verifyToken(req);
  if (!decoded) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { db } = await connectToDatabase();

    const messages = db.collection('messages');
    const visits = db.collection('visits');

    const totalMessages = await messages.countDocuments();
    const unreadMessages = await messages.countDocuments({ read: false });
    const totalVisits = await visits.countDocuments();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentVisits = await visits
      .find({ createdAt: { $gte: sevenDaysAgo } })
      .sort({ createdAt: -1 })
      .toArray();

    const visitsByDate = {};
    recentVisits.forEach(v => {
      const date = v.createdAt.toISOString().split('T')[0];
      visitsByDate[date] = (visitsByDate[date] || 0) + 1;
    });

    return res.status(200).json({
      success: true,
      stats: {
        totalMessages,
        unreadMessages,
        totalVisits,
        recentVisits: recentVisits.length
      },
      visitsByDate
    });

  } catch (error) {
    console.error('Analytics error:', error);
    return res.status(500).json({ error: 'Failed to fetch analytics' });
  }
};