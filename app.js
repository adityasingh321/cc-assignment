const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();
const { getUser } = require('./common/utils');
const { options } = require('./common/constant');

const app = express();
const PORT = process.env.PORT || 9000;
JWT_SECRET = process.env.SECRET_KEY;

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const users = [];
const blackListedTokens = [];
  
const specs = swaggerJsdoc(options);
app.use('/api', swaggerUi.serve, swaggerUi.setup(specs));

// Register endpoint
/**
 * @swagger
 * /register:
 *   post:
 *     summary: User register
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: username should not be empty
 */
app.post('/register', (req, res) => {
  const { username, password } = req.body;

  if(!username){
    return res.status(400).json({message: 'username should not be empty', statusCode: 400});
  }

  if(!password){
    return res.status(400).json({message: 'password should not be empty', statusCode: 400});
  }

  if(password.length < 6){
    return res.status(400).json({message: 'password should contain atleast 6 characters', statusCode: 400});
  }

  const user = getUser(users, username)

  if(user){
    return res.status(409).json({message: 'User already exist', statusCode: 409});
  }

  // Hash the password
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to hash password', statusCode: 500});
    }
    // Store the user in memory (replace this with database storage)
    users.push({ username, password: hash });
    console.log('------------------ Updated User collection ------------------');
    console.log(users);

    res.status(201).json({ message: 'User registered successfully'});
  });
});

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Authenticate user and get JWT token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    // Find user by username
    const user = getUser(users, username);
    if (!user) {
      return res.status(404).json({ error: 'User not found', statusCode: 404});
    }
    // Validate password
    bcrypt.compare(password, user.password, (err, result) => {
      if (err || !result) {
        return res.status(401).json({ error: 'Invalid credentials', statusCode: 401});
      }
      // Generate JWT token
      const token = jwt.sign({ username }, JWT_SECRET);
      res.json({ token });
    });
  });

  // Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if(blackListedTokens.includes(token)){
        return res.status(403).json({ error: 'User has been logged out. Please login again to continue.', statusCode: 403 });
    }
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Forbidden', statusCode: 403});
      }
      req.user = user;
      next();
    });
  };

  /**
 * @swagger
 * /logout:
 *   post:
 *     summary: Logout user(blacklisting JWT token)
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */
  app.post('/logout', (req, res) => {
    const token = req.headers['authorization'];
    console.log(req.headers);
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized', statusCode: 401});
      }
    blackListedTokens.push(token)
    console.log(blackListedTokens);
    console.log(req.headers);
    
    res.json({ message: 'Logged out successfully' });
  });
  
/**
 * @swagger
 * /me:
 *   post:
 *     summary: Fetch logged in user detail
 *     tags: [Protected Route]
 *     parameters:
 *       - in: header
 *         name: Authorization
 *         required: true
 *         description: Your API token or key
 *         schema:
 *           type: string 
 *     responses:
 *       200:
 *         description: user data fetched
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   type: string
 *
 */
  app.get('/me', authenticateToken, (req, res) => {
    res.json({ message: 'This is a protected route', user: req.user });
  });


/**
 * @swagger
 * /data:
 *   get:
 *     summary: Fetch public api data
 *     tags: [Public API data]
 *     parameters:
 *       - in: query
 *         name: limit
 *         required: false
 *         description: Number of results to limit (default is 10)
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *       - in: query
 *         name: category
 *         required: false
 *         description: Category of the public API data
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Date fetched
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: string
  *                 entries:
 *                   type: string
 */
  app.get('/data', async (req, res) => {
    try {
      const { category, limit } = req.query;
      
      const queryParams = {};
      if (category) queryParams.category = category;
      
      
      const response = await axios.get('https://api.publicapis.org/entries', {
        params: queryParams,
      });
      if (limit) {
        response.data.entries = response.data.entries.splice(0, limit);
        response.data.count = limit;
      }
      return res.json(response.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      res.status(500).json({ error: 'Internal server error', statusCode: 500});
    }
  });

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});