/* ==============================
    Import necessary modules
============================== */

/** Imports the express framework for building the web application and API. */
const express = require('express');
/** Imports the cors middleware to enable Cross-Origin Resource Sharing. */
const cors = require('cors')
/** Import the Mongoose library for interacting with MongoDB. */
const mongoose = require('mongoose')
require('dotenv').config()  // Load environment variables from the .env file into process.env.

// ===== Routes for API versions =====

/** Router for handling lenses-related endpoints (API v1). */
const lensesRouter = require('./routes/v1/lenses-v1');
/** Router for handling diameters-related endpoints (API v1). */
const diametersRouter = require('./routes/v1/diameters-v1');
/** Router for handling indexes-related endpoints (API v1). */
const indexesRouter = require('./routes/v1/indexes-v1');

/* ==============================
    API versions
============================== */

/** Base path for version 1 of the API. */
const apiVersion1 = '/api/v1'

/* =======================================================================
    Connect to MongoDB, initialize middleware, and start the HTTP server
======================================================================= */

/** Access the MongoDB server URL from the loaded environment variables. */
const dbServer = process.env.DB_SERVER
if (!dbServer) {
    console.error('DB_SERVER environment variable is not defined');
    process.exit(1); // Exit if DB_SERVER is not set
}

/** The Express server instance. */
const app = express();

mongoose.connect(dbServer)
.then(() => {
    console.log('Connected to MongoDB')

    /* ==============================
        Initialize middleware
    ============================== */

    app.use(express.json())  // Adds the built in body-parser in express for JSON requests
    app.use(cors())  // Add CORS middleware to server, allowing it to handle cross-origin requests
    // Use the routers for api v1
    // NOTE: The most specific route must be defined first,
    // otherwise we get a hit on the more general one
    app.use(apiVersion1 + '/lenses/indexes', indexesRouter);
    app.use(apiVersion1 + '/lenses/diameters', diametersRouter);
    app.use(apiVersion1 + '/lenses', lensesRouter);

    /* ==============================
        Server Initialization
    ============================== */

    /**
     * The port on which the Express server will listen for incoming requests.
     * Uses the environment variable PORT.
     */
    const port = process.env.PORT || 3000
    const host = process.env.HOST || 'localhost'

    // Start server, binding it to specified port
    app.listen(port, function() {
        // Log a message when server is successfully started
        console.log(`Server is running on port ${port} and is available at http://${host}:${port}`)
    })

    // Define a route for handling HTTP GET requests to the root path
    app.get('/', function(req, res) {
        res.status(200).send('Backend is running')
    })
})
.catch(err => {
    console.error('Failed to connect to MongoDB', err)
    process.exit(1);  // Exit the process on DB connection failure
});

/* ==============================
    Class exports
============================== */

module.exports = app;
