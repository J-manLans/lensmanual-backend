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

/* ===============================================
HELPER FUNCTIONS
================================================*/

/**
* Extracts validation errors from a Mongoose error object and formats them in a structured way.
*
* @param {Object} error - The error object returned by Mongoose validation. It contains details about the validation failures.
* @param {Object} error.errors - An object where keys are the names of the fields that failed validation, and the values contain error messages.
* @param {string} error._message - The general error message, typically describing the type of error (e.g., 'Validation failed').
*
* @returns {Object} A structured response containing the validation error message and a mapping of field names to their corresponding error messages.
*
* @example
* return res.status(400).send(validationErrors(error));
* {
*   error: "Validation failed",
*   wrongOrMissingFields: {
*     "staticCorrectionDetails.prism": "Path `staticCorrectionDetails.prism` is required.",
*     "type": "Path `type` is required.",
*     "quality": "Path `quality` (7.5) is more than maximum allowed value (7)."
*   }
* }
*/
function validationErrors(error) {
// Extracting the missing fields and their error messages by using
// Object.keys which gives me an array of the specified keys
const wrongOrMissingFields = Object.keys(error.errors);
const errorMessages = Object.keys(error.errors)
.map(field => error.errors[field].message)  // Extract the message for each field
const errors = {}

for (let i = 0; i < wrongOrMissingFields.length; i++) {
  errors[wrongOrMissingFields[i]] = errorMessages[i]
}

// Send back a response with the wrong and missing fields
return { error: error._message, wrongOrMissingFields: errors };
}

module.exports = router;
