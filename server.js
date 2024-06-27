const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
require('dotenv').config();

const app = express();
let feedbacks = []; 

app.use(bodyParser.json());
app.use(cors());

// CORS headers middleware
app.use((req, res, next) => {
  res.setHeader("Permissions-Policy", "fullscreen=(self), geolocation=()");
  next();
});

// Define a simple route for the root URL
app.get('/', (req, res) => {
  res.send('Welcome to the backend server!');
});


app.post('/api/feedback', (req, res) => {
    const { userName, feedback } = req.body;
  
    const newFeedback = {
      id: uuidv4(),
      userName: userName,
      content: feedback,
      timestamp: new Date()
    };
  
    feedbacks.push(newFeedback);
    res.status(201).json({ message: 'Feedback submitted successfully', feedback: newFeedback });
  });
  
  // Endpoint to get all feedback
  app.get('/api/feedbacks', (req, res) => {
    res.status(200).json(feedbacks);
  });

  app.delete('/api/feedback/:id', (req, res) => {
    const feedbackId = req.params.id;
    const index = feedbacks.findIndex(f => f.id === feedbackId);
    if (index !== -1) {
      feedbacks.splice(index, 1);
      res.status(200).json({ message: 'Feedback deleted successfully' });
    } else {
      res.status(404).json({ message: 'Feedback not found' });
    }
  });
  


app.post('/api/inquiries', (req, res) => {
    const { type, fundName, isin, sedolOrTicker, stockName } = req.body;

    console.log(`Received ${type} request with data:`, req.body);

    if (type === 'fund') {
        if (!fundName || !isin || !sedolOrTicker) {
            return res.status(400).json({ message: 'Missing required fields for fund inquiry' });
        }

        // Handle fund inquiry logic here (e.g., send email)
    } else if (type === 'stock') {
        if (!stockName || !isin || !sedolOrTicker) {
            return res.status(400).json({ message: 'Missing required fields for stock inquiry' });
        }

        // Handle stock inquiry logic here (e.g., send email)
    } else {
        return res.status(400).json({ message: 'Invalid inquiry type' });
    }

    // Example code for sending email (for both fund and stock)
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASS
        }
    });

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

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
            return res.status(500).json({ message: 'Error sending email' });
        }
        console.log('Email sent:', info.response);

        feedbacks.push(feedback);
        res.status(200).json({ message: 'Inquiry sent successfully' });
    });

});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
