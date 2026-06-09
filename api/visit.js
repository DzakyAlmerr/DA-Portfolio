require('dotenv').config();
const { MongoClient } = require('mongodb');

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

// Helper: parse body di Vercel (Node.js native tidak auto-parse JSON)
async function parseBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => data += chunk);
    req.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = await parseBody(req);
    const { page } = body;

    const { db } = await connectToDatabase();
    const visits = db.collection('visits');

    const visitDoc = {
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      referrer: req.headers.referer || 'direct',
      page: page || 'unknown',
      createdAt: new Date()
    };

    await visits.insertOne(visitDoc);

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Visit error:', error);
    return res.status(500).json({ error: 'Failed to record visit' });
  }
};