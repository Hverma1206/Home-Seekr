import mongoose from 'mongoose'

const propertySchema = new mongoose.Schema(
  {
    lookingTo: { type: String, trim: true, default: '' },
    propertyCategory: { type: String, trim: true, default: '' },
    selectedType: { type: String, required: [true, 'Property type is required'], trim: true },
    role: { type: String, trim: true, default: '' },

    city: { type: String, required: [true, 'City is required'], trim: true },
    locality: { type: String, required: [true, 'Locality is required'], trim: true },
    landmark: { type: String, trim: true, default: '' },
    pincode: { type: String, required: [true, 'Pincode is required'], trim: true },

    price: { type: String, required: [true, 'Price is required'], trim: true },
    pricePerSqYard: { type: String, trim: true, default: '' },
    priceInWords: { type: String, trim: true, default: '' },
    allInclusive: { type: Boolean, default: false },
    taxExcluded: { type: Boolean, default: false },
    priceNegotiable: { type: Boolean, default: false },

    plotArea: { type: String, required: [true, 'Plot area is required'], trim: true },
    plotAreaUnit: { type: String, trim: true, default: 'sq.yards' },
    carpetArea: { type: String, trim: true, default: '' },
    builtupArea: { type: String, trim: true, default: '' },
    superBuiltupArea: { type: String, trim: true, default: '' },
    plotLength: { type: String, trim: true, default: '' },
    plotBreadth: { type: String, trim: true, default: '' },

    floorsAllowed: { type: String, trim: true, default: '' },
    hasBoundaryWall: { type: String, trim: true, default: '' },
    openSides: { type: String, trim: true, default: '' },
    anyConstructionDone: { type: String, trim: true, default: '' },
    possessionBy: { type: String, trim: true, default: '' },

    bedrooms: { type: String, trim: true, default: '' },
    bathrooms: { type: String, trim: true, default: '' },
    balconies: { type: String, trim: true, default: '' },
    floor: { type: String, trim: true, default: '' },
    totalFloors: { type: String, trim: true, default: '' },
    availabilityStatus: { type: String, trim: true, default: '' },
    ownership: { type: String, trim: true, default: '' },
    approvedBy: { type: [String], default: [] },
    propertyAge: { type: String, trim: true, default: '' },

    amenities: { type: [String], default: [] },
    customAmenities: { type: [String], default: [] },
    overlooking: { type: [String], default: [] },
    otherFeatures: { type: [String], default: [] },
    propertyFacing: { type: String, trim: true, default: '' },
    facingRoadWidth: { type: String, trim: true, default: '' },
    facingRoadUnit: { type: String, trim: true, default: 'Feet' },
    locationAdvantages: { type: [String], default: [] },
  },
  {
    timestamps: true,
  }
)

const Property = mongoose.model('Property', propertySchema)

export default Property
