const mongoose = require('mongoose')

/* ====================================================================
    Schema
==================================================================== */
// I set _id: false on every sub Schema, that is so MongoDB wont create
// it for them when i create or get it for me when I get documents

const StrengthBoundsSchema = mongoose.Schema({
    sphere: {
        type: {
            min: { type: Number, required: true },
            max: { type: Number, required: true }
        },
        required: true,
        _id: false
    },
    cylinder: {
        type: Number,
        required: true
    },
    _id: false
})

const diameterSchema = mongoose.Schema({
    diameter: {
        type: String,
        required: true
    },
    strengthBounds: {
        type: StrengthBoundsSchema,
        required: true
    }
}, { _id: false })

const variantSchema = mongoose.Schema({
    index: {
        type: String,
        required: true
    },
    diameters: {
        type: [diameterSchema],
        required: true,
        default: undefined
    }
}, { _id: false })

const diameterStrengthBoundsSchema = mongoose.Schema({
    type: {
        type: String,
        required: true
    },
    quality: {
        type: String,
        required: true
    },
    identifiers: {
        type: [String],
        required: true,
        default: undefined
    },
    variants: {
        type: [variantSchema],
        required: true,
        default: undefined
    }
})

diameterStrengthBoundsSchema.index({ type: 1, quality: 1 }, {unique: true })

/* ====================================================================
    Model
==================================================================== */

const DiameterStrengthBounds = mongoose.model('DiameterStrengthBounds', diameterStrengthBoundsSchema, 'diameterStrengthBounds')

/* ====================================================================
    Export
==================================================================== */

module.exports = DiameterStrengthBounds