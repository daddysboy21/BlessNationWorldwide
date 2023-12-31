const { urlencoded } = require('body-parser');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const WebSocket = require('ws')
const app = express();
app.use(cors());
app.use(urlencoded({extended : true}))
app.use(express.json());

const voteSchema = new mongoose.Schema({
    option: {
        type: String,
        required: true
    },
    count: {
        type: Number,
        default: 0
    }
});

const Vote = mongoose.model('Vote', voteSchema);

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/test', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Mongo-Database connected'))
  .catch(err => console.log('Database connection error', err));

// Create a WebSocket server
const wss = new WebSocket.Server({ server });
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, ws => {
    wss.emit('connection', ws, request);
  });
});

server.listen(5500, () => {
  console.log('Server is running on port 5500');
});

// WebSocket connection to send real-time updates
wss.on('connection', ws => {
  ws.on('message', message => {
      // If a new vote is created, send the updated vote counts to all clients
      if (message === 'new vote') {
          Vote.find().then(votes => {
              wss.clients.forEach(client => {
                  if (client.readyState === WebSocket.OPEN) {
                      client.send(JSON.stringify(votes));
                  }
              });
          });
      }
  });
});

app.post('/votes', async (req, res) => {
  const { option } = req.body;
  try {
    const vote = await Vote.findOneAndUpdate(
      { option },
      { $inc: { count: 1 } },
      { new: true, upsert: true }
    );
    res.json(vote);

    // Broadcast the updated vote to all connected clients
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(vote));
      }
    });

    res.status(200).json(vote);
  } catch (err) {
    res.status(500).json({ error: 'Error updating vote' });
  }
});

// GET route for /votes
app.get('/votes', async (_req, res) => {
  try {
    const votes = await Vote.find();
    res.json(votes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//SERVER STARTER
const port = 5500;
const server = require('http').createServer(app);
server.listen(port, '0.0.0.0', () => {
  console.log(`Server started on port ${port}`);
});

// Handle WebSocket requests
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, ws => {
    wss.emit('connection', ws, request);
  });
});

const redis = require('redis');
const client = redis.createClient();
client.on('connect', function() {
  console.log('Connected to Redis...');
});
