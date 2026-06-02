import mongoose from 'mongoose'

const propertySchema = new mongoose.Schema(
  {
    // Posted by (User reference)
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Poster is required'],
    },
    brokerAssociated: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    projectAssociated: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
    },

    // Property Classification
    lookingTo: { type: String, enum: ['buy', 'rent', 'pg', 'commercial'], required: true },
    propertyCategory: { type: String, trim: true, default: '' },
    selectedType: { type: String, required: [true, 'Property type is required'], trim: true },
    role: { type: String, trim: true, default: '' },

    // Location Details
    city: { type: String, required: [true, 'City is required'], trim: true },
    state: { type: String, required: [true, 'State is required'], trim: true },
    locality: { type: String, required: [true, 'Locality is required'], trim: true },
    landmark: { type: String, trim: true, default: '' },
    pincode: { type: String, required: [true, 'Pincode is required'], trim: true },
    address: { type: String, default: '' },
    areaName: { type: String, default: '' },

    // Geolocation
    geo: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: { type: [Number], default: undefined },
    },

    // Price Information
    price: { type: String, required: [true, 'Price is required'], trim: true },
    priceNumeric: { type: Number, default: null },
    pricePerSqYard: { type: String, trim: true, default: '' },
    pricePerSqFt: { type: Number, default: null },
    priceInWords: { type: String, trim: true, default: '' },
    allInclusive: { type: Boolean, default: false },
    taxExcluded: { type: Boolean, default: false },
    priceNegotiable: { type: Boolean, default: false },
    maintenanceCharges: Number,
    maintenanceChargesFrequency: { type: String, default: 'monthly' },
    security: Number,
    registrationCharges: Number,
    otherCharges: String,

    // Area & Dimensions
    plotArea: { type: String, required: [true, 'Plot area is required'], trim: true },
    plotAreaUnit: { type: String, trim: true, default: 'sq.yards' },
    plotAreaNumeric: { type: Number, default: null },
    areaSqFt: { type: Number, default: null },
    carpetArea: { type: String, trim: true, default: '' },
    builtupArea: { type: String, trim: true, default: '' },
    superBuiltupArea: { type: String, trim: true, default: '' },
    plotLength: { type: String, trim: true, default: '' },
    plotBreadth: { type: String, trim: true, default: '' },

    // Plot Details (for plot/land properties)
    floorsAllowed: { type: String, trim: true, default: '' },
    hasBoundaryWall: { type: String, trim: true, default: '' },
    openSides: { type: String, trim: true, default: '' },
    anyConstructionDone: { type: String, trim: true, default: '' },

    // Possession & Availability
    possessionBy: { type: String, trim: true, default: '' },
    possessionDate: Date,
    availabilityStatus: { type: String, trim: true, default: '' },
    readyForOccupancy: Boolean,

    // Apartment/House Details
    bedrooms: { type: String, trim: true, default: '' },
    bathrooms: { type: String, trim: true, default: '' },
    balconies: { type: String, trim: true, default: '' },
    floor: { type: String, trim: true, default: '' },
    totalFloors: { type: String, trim: true, default: '' },
    bhk: { type: String, trim: true, default: '' },
    bhkNumeric: { type: Number, default: null },

    // Building Details
    ownership: { type: String, trim: true, default: '' },
    propertyAge: { type: String, trim: true, default: '' },
    approvedBy: { type: [String], default: [] },
    rera: String,
    reraNumber: String,
    societyName: String,

    // Features & Amenities
    amenities: { type: [String], default: [] },
    customAmenities: { type: [String], default: [] },
    overlooking: { type: [String], default: [] },
    otherFeatures: { type: [String], default: [] },
    propertyFacing: { type: String, trim: true, default: '' },
    facingRoadWidth: { type: String, trim: true, default: '' },
    facingRoadUnit: { type: String, trim: true, default: 'Feet' },
    locationAdvantages: { type: [String], default: [] },

    // Description & Details
    title: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    dealer: { type: String, trim: true, default: '' },
    postedByType: {
      type: String,
      enum: ['owner', 'broker', 'builder', 'agent'],
      default: 'owner',
    },

    // Media
    image: { type: String, trim: true, default: '' },
    images: { type: [String], default: [] },
    videos: { type: [String], default: [] },
    floorPlan: { type: [String], default: [] },
    brochure: String,
    virtualTourUrl: String,

    // Property Status & Verification
    status: {
      type: String,
      enum: ['active', 'sold', 'rented', 'inactive', 'pending_verification'],
      default: 'active',
    },
    isVerified: { type: Boolean, default: false },
    verificationNotes: String,
    isFeatured: { type: Boolean, default: false },
    isHighlight: { type: Boolean, default: false },
    isPromoted: { type: Boolean, default: false },

    // Furnishing & Accessibility
    furnishingType: {
      type: String,
      enum: ['unfurnished', 'semi-furnished', 'fully-furnished'],
      default: 'unfurnished',
    },
    parking: {
      covered: Number,
      open: Number,
    },
    accessibility: [String],

    // Legal Details
    ownership: String,
    titleClear: Boolean,
    documentVerified: Boolean,
    documentType: String,

    // Views & Engagement
    views: { type: Number, default: 0 },
    enquiries: { type: Number, default: 0 },
    contactsMade: { type: Number, default: 0 },
    savedCount: { type: Number, default: 0 },

    // Ratings & Reviews
    averageRating: { type: Number, min: 0, max: 5, default: 0 },
    reviewCount: { type: Number, default: 0 },

    // Tags for search
    tags: { type: [String], default: [] },
    keywords: [String],
    type: { type: String, trim: true, default: '' },
    area: { type: String, trim: true, default: '' },
    locationLabel: { type: String, trim: true, default: '' },

    // Historical Data
    lastBoostedAt: Date,
    boostCount: { type: Number, default: 0 },
    renewedAt: { type: Date, default: Date.now },

    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
)

propertySchema.index({ geo: '2dsphere' })
propertySchema.index({ city: 1, locality: 1 })
propertySchema.index({ postedBy: 1, status: 1 })
propertySchema.index({ lookingTo: 1, bhkNumeric: 1, priceNumeric: 1 })
propertySchema.index({ city: 1, lookingTo: 1, status: 1 })
propertySchema.index({ locality: 1, lookingTo: 1 })
propertySchema.index({ isFeatured: 1, isPromoted: 1, createdAt: -1 })
propertySchema.index({ amenities: 1 })
propertySchema.index({ status: 1, renewedAt: -1 })
propertySchema.index({ views: -1 })
propertySchema.index({ savedCount: -1 })

const Property = mongoose.model('Property', propertySchema)

export default Property
