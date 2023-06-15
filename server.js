/*
 * This require() statement reads environment variable values from the file
 * called .env in the project directory.  You can set up the environment
 * variables in that file to specify connection information for your own DB
 * server.
 */
require('dotenv').config()

const express = require('express')
const morgan = require('morgan')

const { requireAuthentication } = require('./lib/auth')
const api = require('./api')
const sequelize = require('./lib/sequelize')
const { setAssociations } = require('./lib/associations')

const app = express()
const port = process.env.PORT || 8000

const redis = require('redis')
const redisHost = "localhost"
const redisPort = "6379"
const redisClient = redis.createClient({
    url: `redis://${redisHost}:${redisPort}`
})

async function rateLimit(req, res, next) {
    // Its a minute in millis
    const rateLimitWindowMillis = 60000
    // If the user is logged-in the ternary should pass to be 30, else 10
    // This is done with a check for a Bearer token as any other way would need a global variable
    const rateLimitMaxRequests = (req.rawHeaders[5].split(' ')[1]) ? 30:10
    // refreshRate = 30?10/min
    const refreshRate = rateLimitMaxRequests / rateLimitWindowMillis

    // This is the bucket
    let tokenStore
    try {
        tokenStore = await redisClient.hGetAll(req.ip)
    } catch (err) {
        next()
        return
    }

    // Fillup that bucket with "normalization" (easier to think about it as normalization even tho its not)
    tokenStore = {
        tokens: parseFloat(tokenStore.tokens) || rateLimitMaxRequests,
        last: parseInt(tokenStore.last) || Date.now()
    }

    const tstamp = Date.now()
    const ellapsedMs = tstamp - tokenStore.last
    tokenStore.tokens += ellapsedMs * refreshRate
    tokenStore.tokens = Math.min(tokenStore.tokens, rateLimitMaxRequests)
    tokenStore.last = tstamp

    if (tokenStore.tokens >= 1) {
        tokenStore.tokens -= 1
        await redisClient.hSet(req.ip, [
            [ "tokens", tokenStore.tokens ],
            [ "last", tokenStore.last ]
        ])
        next()
    } else {
        await redisClient.hSet(req.ip, [
            [ "tokens", tokenStore.tokens ],
            [ "last", tokenStore.last ]
        ])
        res.status(429).send({
            "error": "Too many requests...cry about it"
        })
    }
}


/*
 * Morgan is a popular request logger.
 */
app.use(morgan('dev'))

app.use(express.json())

/*
 * All routes for the API are written in modules in the api/ directory.  The
 * top-level router lives in api/index.js.  That's what we include here, and
 * it provides all of the routes.
 */
// app.use(requireAuthentication, rateLimit)
app.use(rateLimit)
app.use('/', api)
app.use('/uploads', express.static('uploads'))

// If the endpoints are valid, send that datestamp
app.get('/', (req, res) => {
  res.status(200).json({
    timestamp: new Date().toString()
  });
});

app.use('*', function (req, res, next) {
  res.status(404).json({
    error: "Requested resource " + req.originalUrl + " does not exist"
  })
})

/*
 * This route will catch any errors thrown from our API endpoints and return
 * a response with a 500 status to the client.
 */
app.use('*', function (err, req, res, next) {
  console.error("== Error:", err)
  res.status(500).send({
      err: "Server error.  Please try again later."
  })
})

/*
 * Start the API server listening for requests after establishing a connection
 * to the MySQL server.
 */
/*
sequelize.sync().then(function () {
  app.listen(port, function() {
    console.log("== Server is running on port", port)
  })
})
*/
redisClient.connect().then(function () {
	setAssociations()
    sequelize.sync().then(function () {
        app.listen(port, function() {
            console.log("== Server is running on port", port)
        })
    })
})
