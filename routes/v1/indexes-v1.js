const express = require('express');
const router = express.Router();
const { Index } = require('../../app/model/models.js');
const errMessage = 'Error processing request:'

router.get('/', async (req, res) => {
  try {  // Get all indexes
    res.send(await Index.find().select('-_id'));
  } catch (error) {  // Error handling
    console.error(error);
    res.status(500).send({ error: errMessage });
  }
});

module.exports = router;