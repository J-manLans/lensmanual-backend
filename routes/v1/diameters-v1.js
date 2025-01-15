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

router.patch('/:lensType/:lensQuality', async (req, res) => {
  // Extract the data from the body of the request...
  const { lensType, lensQuality } = req.params

  try {
    // ...and tries to update it
    const updatedDsb = await DiameterStrengthBounds.findOneAndUpdate(
      { type: lensType, quality: lensQuality }, // Query filter
      { $set: req.body }, // Update operation
      // returns the new document after the update and run validators on the fields that are to be updated
      { new: true, runValidators: true}
    )

    // If the operation was successful we send the result
    if (updatedDsb) {
      return res.send(updatedDsb)
    }

    // Error message if the lens don't exists
    res.status(404).send({ error: `The diameter strength bound does not exist`})

  } catch (error) {  // Checking for validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).send(validationErrors(error))
    }

    console.error(error);  // General error handling
    res.status(500).send({ error: errMessage });
  }

})

module.exports = router;
