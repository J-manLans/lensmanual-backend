const express = require('express');
const router = express.Router();
const { DiameterStrengthBounds } = require('../../app/model/models.js');
const errMessage = 'Error processing request:'

router.get('/', async (req, res) => {
  try {  // Get all DiameterStrengthBounds
    res.send(await DiameterStrengthBounds.find().select('-_id'));
  } catch (error) {  // Error handling
    console.error(error);
    res.status(500).send({ error: errMessage });
  }
});

router.get('/:lensType/:lensQuality', async (req, res) => {
  try {
    const dsb = await DiameterStrengthBounds.findOne({ type: req.params.lensType, quality: req.params.lensQuality }).select('-_id')

    // If the document is empty we send an empty object together with a 404 not found status
    if (!dsb) return res.status(404).send('{}')

    res.send(dsb)  // Send the dsb as a response

  } catch (error) {  // Error handling
    console.error(error);
    res.status(500).send({ error: errMessage });
  }
})

module.exports = router;
