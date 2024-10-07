const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();
const { MongoClient } = require('mongodb');

// Initialize the app
const app = express();

// Environment variables
const mongoUri = process.env.MONGO_URI;
const dbName = 'portfolio-feedbacks';
const collectionName = 'feedback';

let feedbackCollection;

async function connectToDatabase() {
  try {
    const client = await MongoClient.connect(mongoUri);
    const db = client.db(dbName);
    feedbackCollection = db.collection(collectionName);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection failed:', error);
  }
}

connectToDatabase();

// Middleware
app.use(bodyParser.json());

// CORS setup
const allowedOrigins = ['https://hargreaves-lansdown.onrender.com', 'http://localhost:3000'];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

// Set security headers
app.use((req, res, next) => {
  res.setHeader("Permissions-Policy", "fullscreen=(self), geolocation=()");
  next();
});

// Root route
app.get('/', (req, res) => {
  res.send('Welcome to the backend server!');
});

// Feedback submission route
app.post('/api/feedback', (req, res) => {
  const { userName, feedback } = req.body;

  const newFeedback = {
    id: uuidv4(),
    userName: userName,
    content: feedback,
    timestamp: new Date()
  };

  feedbackCollection.insertOne(newFeedback)
    .then(result => {
      res.status(201).json({ message: 'Feedback submitted successfully', feedback: newFeedback });
    })
    .catch(error => {
      console.error('Error inserting feedback:', error);
      res.status(500).json({ message: 'Error submitting feedback' });
    });
});

// Retrieve feedbacks route
app.get('/api/feedbacks', (req, res) => {
  feedbackCollection.find().toArray()
    .then(feedbacks => {
      res.status(200).json(feedbacks.map(feedback => ({
        _id: feedback.id, 
        feedback: feedback.content,
        userName: feedback.userName,
        timestamp: feedback.timestamp
      })));
    })
    .catch(error => {
      console.error('Error retrieving feedbacks:', error);
      res.status(500).json({ message: 'Error retrieving feedbacks' });
    });
});

// Feedback deletion route
app.delete('/api/feedback/:id', (req, res) => {
  const feedbackId = req.params.id;

  feedbackCollection.deleteOne({ id: feedbackId })
    .then(result => {
      if (result.deletedCount === 1) {
        res.status(200).json({ message: 'Feedback deleted successfully' });
      } else {
        res.status(404).json({ message: 'Feedback not found' });
      }
    })
    .catch(error => {
      console.error('Error deleting feedback:', error);
      res.status(500).json({ message: 'Error deleting feedback' });
    });
});

// Inquiry handling and email notification route
app.post('/api/inquiries', (req, res) => {
  const { type, fundName, isin, sedolOrTicker, stockName } = req.body;

  console.log(`Received ${type} request with data:`, req.body);

  // Validate required fields for the inquiries
  if (type === 'fund') {
    if (!fundName || !isin || !sedolOrTicker) {
      return res.status(400).json({ message: 'Missing required fields for fund inquiry' });
    }
  } else if (type === 'stock') {
    if (!stockName || !isin || !sedolOrTicker) {
      return res.status(400).json({ message: 'Missing required fields for stock inquiry' });
    }
  } else {
    return res.status(400).json({ message: 'Invalid inquiry type' });
  }

  // Nodemailer setup for email notifications
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS
    }
  });

  // Email options based on inquiry type
  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: 'goyalsachin398@gmail.com',
    subject: type === 'fund' ? `You have Received a Fund File request` : `You have Received a Stock File request`,
    html: type === 'fund' ? `
      <p>Fund Name: ${fundName}</p>
      <p>ISIN: ${isin}</p>
      <p>SEDOL or Ticker: ${sedolOrTicker}</p>
      <p>Click the button below to approve the request:</p>
      <a href="https://your-website.com/approve-request" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-align: center; text-decoration: none; display: inline-block; border-radius: 4px;">Approve Request</a>
    ` : `
      <p>Stock Name: ${stockName}</p>
      <p>ISIN: ${isin}</p>
      <p>SEDOL or Ticker: ${sedolOrTicker}</p>
      <p>Click the button below to approve the request:</p>
      <a href="https://your-website.com/approve-request" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-align: center; text-decoration: none; display: inline-block; border-radius: 4px;">Approve Request</a>
    `
  };

  // Send email
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
      return res.status(500).json({ message: 'Error sending email' });
    }
    console.log('Email sent:', info.response);
    res.status(200).json({ message: 'Inquiry sent successfully' });
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
