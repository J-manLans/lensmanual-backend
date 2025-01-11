## Clean javaScript approach

````js
router.get('/', async (req, res) => {
  try {
    const lenses = await Lens.find()
    const indexes = await Index.find()
    const diameterStrengthBounds = await DiameterStrengthBounds.find()

    const enrichedLenses = await Promise.all(lenses.map(async (lens) => {
      // Get the matching diameters object for the current lens
      const matchingDiameters = diameterStrengthBounds.find(dbs => dbs.identifiers.includes(lens.name))?.variants;

      // Iterate over the lens's indexData
      lens.indexData.forEach(indexData => {
        // Get the matching index from the indexes collection
        // based on the index name in the current lens's indexData
        const lensIndex =  indexes.find(index => index.name === indexData.name).index
        // Get the corresponding diameters based on the index
        const indexDiameters = matchingDiameters.find(indexDiameter => indexDiameter.index === lensIndex).diameters
        // Set the diameters in the corresponding indexData object
        indexData.diameterStrengthBounds = indexDiameters;
      });
      // Return the enriched lens object
      return lens;
    }));

    res.send(enrichedLenses); // Send enriched lenses as the response

  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'An error occurred while fetching the lenses' });
  }
});
````

## JS and aggregate mix

````js
router.get('/', async (req, res) => {
  try {
    const lenses = await Lens.aggregate([
      {
        /*
        Performs a left outer join to the 'lenses' collection.
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
      { $project: {
          _id: 0
        }
      }
    ]);

    const enrichedLenses = lenses.map(lens => {
      // Get the matching diameters object for the current lens
      const matchingDiameters = lens.diameterStrengthBounds.find(dsb => dsb.identifiers.includes(lens.name))?.variants;

      // Iterate over the lens's indexData
      lens.indexData.forEach(indexData => {
        // Get the matching index from the indexes array
        // based on the index name in the current lens's indexData
        const lensIndex =  lens.indexes.find(index => index.name === indexData.name)?.index
        // Get the corresponding diameters based on the index
        const indexDiameters = matchingDiameters.find(variant => variant.index === lensIndex)?.diameters || [];
        // Set the diameters in the corresponding indexData object
        indexData.diameterStrengthBounds = indexDiameters;
      });

      // Clean up the lens document
      delete lens.indexes;
      delete lens.diameterStrengthBounds;

      return lens;
    });

    res.send(enrichedLenses); // Send enriched lenses as the response
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'An error occurred while fetching the lenses' });
  }
});
````

## Aggregate only

````js
const express = require('express');
const router = express.Router();
const { Lens, DiameterStrengthBounds, Index } = require('../../app/model/models.js');

router.get('/', async (req, res) => {
  try {
    const lenses = await Lens.aggregate([
      {
        /*
        Performs a left outer join to the 'lenses' collection.
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
      { $project: {
          _id: 0,
          diameterStrengthBounds: 0,
          indexes: 0
        }
      }
    ]);

    res.send(lenses); // Send enriched lenses as the response
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: 'An error occurred while fetching the lenses' });
  }
});

module.exports = router;
````