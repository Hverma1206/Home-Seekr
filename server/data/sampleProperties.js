const DEALERS = [
  'Prime Estates',
  'Urban Nest',
  'BlueStone Realty',
  'Vista Homes',
  'Skyline Advisors',
  'Elite Realty Partners',
  'Sapphire Spaces',
  'CitySquare Realty',
]

const IMAGE_LIBRARY = {
  apartment: [
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600607687931-cebf0746e426?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80',
  ],
  villa: [
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600607686527-6fb886090705?auto=format&fit=crop&w=1200&q=80',
  ],
  builderFloor: [
    'https://images.unsplash.com/photo-1600607687931-cebf0746e426?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80',
  ],
  commercial: [
    'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1479839672679-a46483c0e7c8?auto=format&fit=crop&w=1200&q=80',
  ],
  plot: [
    'https://images.unsplash.com/photo-1501183638710-841dd1904471?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80',
  ],
}

const CITY_CATALOG = [
  {
    city: 'Gurugram',
    state: 'Haryana',
    center: { lat: 28.4595, lng: 77.0266 },
    localities: [
      { name: 'Sector 57', lat: 28.4211, lng: 77.0722, pincode: '122011', tags: ['Golf Course Extension', 'Metro Link'] },
      { name: 'Golf Course Road', lat: 28.4546, lng: 77.0968, pincode: '122002', tags: ['Premium Corridor', 'Luxury'] },
      { name: 'Sohna Road', lat: 28.3916, lng: 77.0547, pincode: '122018', tags: ['IT Hub', 'Family Friendly'] },
      { name: 'Sector 37D', lat: 28.4449, lng: 76.9847, pincode: '122004', tags: ['Upcoming Zone', 'Gated Communities'] },
    ],
  },
  {
    city: 'Noida',
    state: 'Uttar Pradesh',
    center: { lat: 28.5355, lng: 77.391 },
    localities: [
      { name: 'Sector 62', lat: 28.6289, lng: 77.373, pincode: '201309', tags: ['Business District', 'Metro'] },
      { name: 'Sector 137', lat: 28.5033, lng: 77.4126, pincode: '201305', tags: ['Expressway', 'Tech Parks'] },
      { name: 'Sector 75', lat: 28.5657, lng: 77.3788, pincode: '201304', tags: ['Central Noida', 'Lifestyle'] },
      { name: 'Sector 150', lat: 28.4549, lng: 77.4817, pincode: '201310', tags: ['Low Density', 'Green Zone'] },
    ],
  },
  {
    city: 'Mumbai',
    state: 'Maharashtra',
    center: { lat: 19.076, lng: 72.8777 },
    localities: [
      { name: 'Bandra West', lat: 19.0596, lng: 72.8295, pincode: '400050', tags: ['Sea View', 'Cafes'] },
      { name: 'Powai', lat: 19.1197, lng: 72.9056, pincode: '400076', tags: ['Lake View', 'IT Corridor'] },
      { name: 'Lower Parel', lat: 18.9977, lng: 72.8291, pincode: '400013', tags: ['Luxury Towers', 'CBD'] },
      { name: 'Andheri East', lat: 19.1136, lng: 72.8697, pincode: '400069', tags: ['Airport Access', 'Business'] },
    ],
  },
  {
    city: 'Bengaluru',
    state: 'Karnataka',
    center: { lat: 12.9716, lng: 77.5946 },
    localities: [
      { name: 'Whitefield', lat: 12.9698, lng: 77.7499, pincode: '560066', tags: ['IT Parks', 'Metro Phase 2'] },
      { name: 'Indiranagar', lat: 12.9719, lng: 77.6412, pincode: '560038', tags: ['Lifestyle', 'Nightlife'] },
      { name: 'Sarjapur Road', lat: 12.901, lng: 77.6762, pincode: '560035', tags: ['Tech Corridor', 'Family'] },
      { name: 'Hebbal', lat: 13.035, lng: 77.597, pincode: '560024', tags: ['Airport Drive', 'Lakefront'] },
    ],
  },
  {
    city: 'Hyderabad',
    state: 'Telangana',
    center: { lat: 17.385, lng: 78.4867 },
    localities: [
      { name: 'Hitech City', lat: 17.4474, lng: 78.3762, pincode: '500081', tags: ['IT Hub', 'Metro'] },
      { name: 'Gachibowli', lat: 17.4401, lng: 78.3489, pincode: '500032', tags: ['Financial District', 'Sports'] },
      { name: 'Kondapur', lat: 17.4645, lng: 78.3631, pincode: '500084', tags: ['Family Friendly', 'Parks'] },
      { name: 'Madhapur', lat: 17.4483, lng: 78.3915, pincode: '500081', tags: ['Tech Core', 'Dining'] },
    ],
  },
  {
    city: 'Pune',
    state: 'Maharashtra',
    center: { lat: 18.5204, lng: 73.8567 },
    localities: [
      { name: 'Hinjewadi', lat: 18.5967, lng: 73.7066, pincode: '411057', tags: ['Tech Park', 'New Projects'] },
      { name: 'Kharadi', lat: 18.5519, lng: 73.934, pincode: '411014', tags: ['IT Hub', 'Lifestyle'] },
      { name: 'Baner', lat: 18.559, lng: 73.7895, pincode: '411045', tags: ['Premium', 'Connectivity'] },
      { name: 'Wakad', lat: 18.5995, lng: 73.7645, pincode: '411057', tags: ['Family Friendly', 'Metro Link'] },
    ],
  },
]

const PROPERTY_TEMPLATES = [
  {
    key: 'apartment',
    type: 'Apartment',
    selectedType: 'Flat / Apartment',
    propertyCategory: 'residential',
    bhkOptions: ['2 BHK', '3 BHK', '4 BHK'],
    areaRange: [900, 2600],
    pricePerSqFtRange: [9000, 19000],
    tags: ['Verified', 'Ready to move'],
    imageKey: 'apartment',
  },
  {
    key: 'builderFloor',
    type: 'Builder Floor',
    selectedType: 'Independent / Builder Floor',
    propertyCategory: 'residential',
    bhkOptions: ['2 BHK', '3 BHK', '4 BHK'],
    areaRange: [1100, 2800],
    pricePerSqFtRange: [8500, 17000],
    tags: ['Prime Location', 'Owner Listed'],
    imageKey: 'builderFloor',
  },
  {
    key: 'villa',
    type: 'Villa',
    selectedType: 'Independent House / Villa',
    propertyCategory: 'residential',
    bhkOptions: ['3 BHK', '4 BHK', '5 BHK'],
    areaRange: [2400, 5200],
    pricePerSqFtRange: [11000, 22000],
    tags: ['Gated Community', 'Luxury'],
    imageKey: 'villa',
  },
  {
    key: 'commercial',
    type: 'Commercial',
    selectedType: 'Office Space',
    propertyCategory: 'commercial',
    bhkOptions: ['Office', 'Shop', 'Showroom'],
    areaRange: [800, 2400],
    pricePerSqFtRange: [12000, 26000],
    tags: ['Grade A', 'High Visibility'],
    imageKey: 'commercial',
  },
  {
    key: 'plot',
    type: 'Plot',
    selectedType: 'Plot / Land',
    propertyCategory: 'residential',
    bhkOptions: ['Plot'],
    areaRange: [1200, 5000],
    pricePerSqFtRange: [7000, 16000],
    tags: ['Clear Title', 'Corner Plot'],
    imageKey: 'plot',
  },
]

const randomFrom = (list) => list[Math.floor(Math.random() * list.length)]

const randomBetween = (min, max) => {
  const value = Math.random() * (max - min) + min
  return Math.round(value)
}

const jitter = (value) => value + (Math.random() - 0.5) * 0.01

const toTitleCase = (text) => text
  .split(' ')
  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
  .join(' ')

const formatNumber = (value) => Number(value).toLocaleString('en-IN')

const formatINR = (value) => {
  const formatShort = (num) => {
    const fixed = num.toFixed(1)
    return fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed
  }

  if (value >= 10000000) {
    return `₹${formatShort(value / 10000000)} Cr`
  }
  if (value >= 100000) {
    return `₹${formatShort(value / 100000)} Lacs`
  }
  return `₹${formatShort(value / 1000)} K`
}

const buildTitle = (locality, type) => {
  const prefixes = ['Skyline', 'Emerald', 'Palm', 'Grand', 'Vista', 'Harmony', 'Orchid', 'Crest']
  const suffixes = ['Residences', 'Enclave', 'Heights', 'Avenue', 'Villas', 'Studios', 'Square']
  return `${randomFrom(prefixes)} ${toTitleCase(type)} ${randomFrom(suffixes)} - ${locality}`
}

const buildAmenities = (category) => {
  const base = ['24/7 Security', 'Power Backup', 'CCTV', 'Parking']
  const residential = ['Clubhouse', 'Gym', 'Swimming Pool', 'Kids Play Area']
  const commercial = ['Business Lounge', 'Visitor Parking', 'High Speed Elevators']
  const extras = category === 'commercial' ? commercial : residential
  return [...base, ...extras].slice(0, 6)
}

const buildPropertyForLocality = (cityInfo, locality, template, defaultPostedById) => {
  const areaSqFt = randomBetween(template.areaRange[0], template.areaRange[1])
  const pricePerSqFt = randomBetween(template.pricePerSqFtRange[0], template.pricePerSqFtRange[1])
  const priceNumeric = areaSqFt * pricePerSqFt
  const image = randomFrom(IMAGE_LIBRARY[template.imageKey])

  return {
    postedBy: defaultPostedById,  // Add required postedBy field
    title: buildTitle(locality.name, template.type),
    description: `${template.type} in ${locality.name}, ${cityInfo.city} with modern amenities and great connectivity.`,
    lookingTo: template.propertyCategory === 'commercial' ? 'rent' : 'buy', // Changed from 'sell' to 'buy'
    propertyCategory: template.propertyCategory,
    selectedType: template.selectedType,
    role: template.propertyCategory === 'commercial' ? 'broker' : 'owner',

    city: cityInfo.city,
    state: cityInfo.state,
    locality: locality.name,
    landmark: locality.tags?.[0] || '',
    pincode: locality.pincode,

    price: formatINR(priceNumeric),
    priceNumeric,
    priceInWords: '',
    allInclusive: Math.random() > 0.5,
    priceNegotiable: Math.random() > 0.6,

    plotArea: String(areaSqFt),
    plotAreaUnit: 'sq.ft',
    carpetArea: String(Math.round(areaSqFt * 0.75)),
    builtupArea: String(Math.round(areaSqFt * 0.9)),
    superBuiltupArea: String(areaSqFt),

    bedrooms: template.bhkOptions[0].includes('BHK') ? randomFrom(template.bhkOptions) : '',
    bathrooms: template.propertyCategory === 'residential' ? String(randomBetween(2, 5)) : '',
    balconies: template.propertyCategory === 'residential' ? String(randomBetween(1, 3)) : '',

    availabilityStatus: Math.random() > 0.6 ? 'Ready to move' : 'Under Construction',
    ownership: Math.random() > 0.5 ? 'Freehold' : 'Leasehold',
    propertyAge: Math.random() > 0.5 ? '0-1 Year' : '2-5 Years',

    amenities: buildAmenities(template.propertyCategory),
    otherFeatures: ['Near Metro', 'Wide Road', 'Gated Society'].slice(0, randomBetween(1, 3)),

    type: template.type,
    bhk: randomFrom(template.bhkOptions),
    area: `${formatNumber(areaSqFt)} sq.ft.`,
    areaSqFt,
    status: 'active', // Set to 'active' for API queries
    tags: [...template.tags, ...(locality.tags || [])].slice(0, 4),
    dealer: randomFrom(DEALERS),
    image,
    images: [image, randomFrom(IMAGE_LIBRARY[template.imageKey])],
    locationLabel: `${locality.name}, ${cityInfo.city}`,
    geo: {
      type: 'Point',
      coordinates: [jitter(locality.lng), jitter(locality.lat)],
    },
  }
}

export const buildSampleProperties = (defaultPostedById = null) => {
  const properties = []

  CITY_CATALOG.forEach((cityInfo) => {
    cityInfo.localities.forEach((locality) => {
      PROPERTY_TEMPLATES.forEach((template) => {
        properties.push(buildPropertyForLocality(cityInfo, locality, template, defaultPostedById))
      })
    })
  })

  return properties
}
