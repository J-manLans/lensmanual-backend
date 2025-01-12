const express = require('express');
const router = express.Router();
const { Lens } = require('../../app/model/models.js');
const errMessage = 'Error processing request:'

/* ===============================================
  GET
================================================*/

router.get('/', async (req, res) => {
  try {
    // Get all lenses with additional information from the database
    const lenses = await getEnrichedLenses()

    res.send(lenses);  // Send the array of lenses as a response

  } catch (error) {  // Error handling
    console.error(error);
    res.status(500).send({ error: errMessage });
  }
});

router.get('/:lensName/:lensQuality', async (req, res) => {
  try {
    /*
    Get the requested lens and de-structures the result using array destructuring,
    meaning it grabs the first element (and only one) of the array returned from the promise and
    saves it in the lens constant
    */
    const [lens] = await getEnrichedLenses(req.params.lensName, req.params.lensQuality)

    // If the array is empty we send an empty object together with a 404 not found status
    if (!lens) return res.status(404).send('{}')

    res.send(lens)  // Send the lense as a response

  } catch (error) {  // Error handling
    console.error(error);
    res.status(500).send({ error: errMessage });
  }
})

/* ===============================================
  POST
================================================*/

router.post('/', async (req, res) => {
  try {
    // Check if the lens exists in the database
    const lens = await Lens.findOne({ name: req.body.name, quality: req.body.quality })

    // If the lens don't exists we go ahead and add it
    if (!lens) {
      // Build the lens object
      const newLens = new Lens({
        type: req.body.type,
        name: req.body.name,
        quality: req.body.quality,
        manufacturingType: req.body.manufacturingType.toUpperCase(),
        treatment: req.body.treatment,
        staticCorrectionDetails: req.body.staticCorrectionDetails,
        indexData: req.body.indexData
      })

      await newLens.save()  // Add it to the database

      return res.status(201).send(newLens);  // Send the added lense as a response
    }

    // Error message if the lens already exists
    res.status(409).send({ error: 'Lens is already in the lenses collection' });

  } catch (error) {  // Checking for validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).send(validationErrors(error))
    }

    console.error(error);  // General error handling
    res.status(500).send({ error: errMessage });
  }
})

/* ===============================================
  DELETE
================================================*/

router.delete('/:lensName/:lensQuality', async (req, res) => {
  // Extract the lens name and quality from the body of the request...
  const { lensName, lensQuality } = req.params

  try {
    // ...and retrieve the lens from the database if it exists
    const [deleteLens] = await getEnrichedLenses(lensName, lensQuality)

    if (deleteLens) {
      // If it exist we delete it with the compound id...
      await Lens.findOneAndDelete({ name: lensName, quality: parseFloat(lensQuality) })
      return res.send(deleteLens)  // ...and send the deleted lens as a response
    }

    // Error message if the lens don't exists
    res.status(404).send({ error: `The lens ${lensName} does not exist`})

  } catch (error) {  // Error handling
    console.error(error);
    res.status(500).send({ error: errMessage });
  }
})

/* ===============================================
  PATCH
================================================*/

router.patch('/:lensName/:lensQuality', async (req, res) => {
  // Extract the lens name from the body of the request...
  const { lensName, lensQuality } = req.params

  try {
    // ...and tries to update it
    const updatedLens = await Lens.findOneAndUpdate(
      { name: lensName, quality: parseFloat(lensQuality) }, // Query filter
      { $set: req.body }, // Update operation
      // returns the new document after the update and run validators on the fields that are to be updated
      { new: true, runValidators: true}
    )

    // If the operation was successful we send the result
    if (updatedLens) {
      return res.send(updatedLens)
    }

    // Error message if the lens don't exists
    res.status(404).send({ error: `The lens ${lensName} does not exist`})

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
  // NOTE: maybe look into the error messages and figure out how to remove the 'Path' and everything except the end of the path. ex: 'Path `staticCorrectionDetails.prism' should be: 'prism' only. Or maybe I handle this on the frontend.

  // Print errors to the console
  console.error(error);

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

/**
 * This function fetches and enriches lens data from the database.
 * It connects to the MongoDB server via aggregation and performs various operations
 * to enrich the lens data, including joining with other collections and setting additional fields.
 *
 * @param {String} lensName The name of the lens we wish to fetch.
 * If provided, it filters the documents to only those that match the lens name.
 * If not provided (null or empty), all documents will be included.
 * @returns A promise that resolves to an array of enriched lens data.
 * The array will contain documents from the lenses collection enriched with data from related collections
 * (indexes, diameterStrengthBounds), or an empty array if a lensName is provided but no matching documents are found.
 */
function getEnrichedLenses(lensName, lensQuality) {
  return Lens.aggregate([
    {
      /*
      If lensName and lensQuality is provided, only documents with a matching fields will be included.
      If not provided (null or empty), an empty object is used, which effectively
      applies no filtering, meaning all documents are included in the result.
      */
      $match: lensName && lensQuality ? { name: lensName, quality: parseFloat(lensQuality) } : {}
    },
    {
      /*
      Performs a left outer join from the 'lenses' collection to the specified collection.
      Matches documents 'from' the selected collection with documents from 'lenses' where
      the 'localField' are equal to the 'foreignField' in the selected collection.
      The result of this operation is stored in an array with the name dictated in 'as'
      at the bottom in each lenses document.
      */
      $lookup: {
        from: "indexes",  // Selected collection
        localField: "indexData.name",  // Field from lenses
        foreignField: "name",  // Field from selected collection
        as: "indexes", // Name of the array
        pipeline: [{ $project: { _id: 0 } }]  // Excludes the _id
      }
    },
    {
      $lookup: {
        from: "diameterStrengthBounds",
        localField: "name",
        foreignField: "identifiers",
        as: "diameterStrengthBounds",
        pipeline: [{ $project: { _id: 0 } }]
      }
    },
    {
      /*
      Here I enrich the 'indexData' field with the corresponding 'diameterStrengthBounds' information.
      For each 'indexData' item, I merge it with matching 'diameterStrengthBounds' information,
      if the 'name' field matches the 'identifiers' of 'diameterStrengthBounds' and the 'index' field matches
      the 'index' of the matching variants.
      */
      $set: {
        indexData: {  // Selects the 'indexData' field
          $map: {
            input: "$indexData",  // References the 'indexData' as an array
            as: "indexDataItem",
            in: {
              $mergeObjects: [
                "$$indexDataItem",  // Keeps the original fields of index data
                {
                  diameterStrengthBounds: {  // Replaces the empty placeholder with the content below
                    $let: {  // Allows the usage of variables
                      vars: {  // Here the temporary variables are defined
                        matchingDiameters: {  // The first variable we are going to use
                          $arrayElemAt: [{  // This extracts an element from the array by its index. Defining 0 at the end gets the first element, not the whole array.
                            $filter: {  // Allows us to filter the array based on the condition
                              input: "$diameterStrengthBounds",
                              as: "dsb",
                              // Lens name should be in identifiers of diameterStrengthBounds
                              cond: { $in: ["$name", "$$dsb.identifiers"]}
                            }
                          },0]  // Get the first and only element from the filtered array
                        },
                        lensIndex: {  // The other variable we are going to use
                          $arrayElemAt: [{
                            $filter: {
                              input: "$indexes",
                              as: "index",
                              // Match the index name with the current index in indexData
                              cond: { $eq: ["$$index.name", "$$indexDataItem.name"]}
                            }
                          },0]
                        }
                      },
                      in: {  // This is the part of the where the final value is defined and returned for each indexDataItem
                        $filter: {
                          input: "$$matchingDiameters.variants",
                          as: "variant",
                          // Checks if the index field in matchingDiameters.variants matches the current lens index
                          cond: { $eq: ["$$variant.index", "$$lensIndex.index"]}
                        }
                      }
                    }
                  }
                }
              ]
            }
          }
        }
      }
    },
    {
      /*
      Excludes the fields 'diameterStrengthBounds' and 'indexes' from the final result.
      Only the original fields, excluding '_id' and '__v', will be included in the output.
      */
      $project: {
        __v: 0,
        _id: 0,
        diameterStrengthBounds: 0,
        indexes: 0
      }
    }
  ])
}

module.exports = router;
