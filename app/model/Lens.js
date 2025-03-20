const mongoose = require('mongoose')

/* ====================================================================
    Schema
==================================================================== */

const indexDataSchema = mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    diameterStrengthBounds: {
        type: Array,
        required: true,
        default: undefined
    }
}, { _id: false })

const lensSchema = mongoose.Schema({
    type: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    quality: {
        type: Number,
        required: true,
        max: 7
    },
    manufacturingType: {
        type: String,
        required: true,
        validate: {
            validator: function(value) {
                return value === "RX" || value === "STOCK"
            },
            message: "manufacturingType can either be (RX) or (STOCK)"
        }
    },
    treatment: {
        type: [String],
        required: true,
        default: undefined
    },
    staticCorrectionDetails: {
        prism: { type: Number, required: true },
        addition: {
            min: { type: Number },
            max: { type: Number }
        }
    },
    indexData: {
        type: [indexDataSchema],
        required: true,
        default: undefined
    }
})

// Creates a composite unique index on the 'name' and 'quality' fields
// Ensures that no two documents can have the same combination of 'name' and 'quality'
lensSchema.index({ name: 1, quality: 1 }, {unique: true })

/* ====================================================================
    Model
==================================================================== */

const Lens = mongoose.model('Lens', lensSchema, 'lenses')

/* ====================================================================
    Export
==================================================================== */

module.exports = Lens