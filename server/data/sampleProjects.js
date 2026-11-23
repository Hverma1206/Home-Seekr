const PROJECT_IMAGES = [
  'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
]

const CITY_CATALOG = [
  {
    city: 'Gurugram',
    state: 'Haryana',
    localities: [
      { name: 'Sector 57', lat: 28.4211, lng: 77.0722 },
      { name: 'Golf Course Road', lat: 28.4546, lng: 77.0968 },
    ],
  },
  {
    city: 'Noida',
    state: 'Uttar Pradesh',
    localities: [
      { name: 'Sector 62', lat: 28.6289, lng: 77.373 },
      { name: 'Sector 150', lat: 28.4549, lng: 77.4817 },
    ],
  },
  {
    city: 'Mumbai',
    state: 'Maharashtra',
    localities: [
      { name: 'Bandra West', lat: 19.0596, lng: 72.8295 },
      { name: 'Powai', lat: 19.1197, lng: 72.9056 },
    ],
  },
  {
    city: 'Bengaluru',
    state: 'Karnataka',
    localities: [
      { name: 'Whitefield', lat: 12.9698, lng: 77.7499 },
      { name: 'Indiranagar', lat: 12.9719, lng: 77.6412 },
    ],
  },
  {
    city: 'Hyderabad',
    state: 'Telangana',
    localities: [
      { name: 'Hitech City', lat: 17.4474, lng: 78.3762 },
      { name: 'Gachibowli', lat: 17.4401, lng: 78.3489 },
    ],
  },
  {
    city: 'Pune',
    state: 'Maharashtra',
    localities: [
      { name: 'Hinjewadi', lat: 18.5967, lng: 73.7066 },
      { name: 'Baner', lat: 18.559, lng: 73.7895 },
    ],
  },
]

const PROJECT_NAMES = ['Vista', 'Skyline', 'Emerald', 'Trinity', 'Aura', 'Crest', 'Orchid']
const PROJECT_SUFFIXES = ['Residences', 'Heights', 'District', 'Avenue', 'Villas', 'Central']
const DEVELOPER_NAMES = ['NextGen Builders', 'Nova Infra', 'Urban Axis', 'Sapphire Developers']
const AMENITIES = ['Clubhouse', 'Gym', 'Swimming Pool', 'Kids Play Area', 'CCTV', 'Power Backup', 'Retail Arcade']
const HIGHLIGHTS = ['Metro connectivity', 'Near IT hub', 'Green boulevard', 'Sky lounge']

const randomFrom = (list) => list[Math.floor(Math.random() * list.length)]
const randomBetween = (min, max) => Math.round(Math.random() * (max - min) + min)

const buildConfigurations = (basePrice, minArea, maxArea) => {
  const configs = ['2 BHK', '3 BHK', '4 BHK']
  return configs.map((type, index) => {
    const areaMin = minArea + index * 120
    const areaMax = Math.min(maxArea, areaMin + 220)
    const priceMin = Math.round(areaMin * basePrice)
    const priceMax = Math.round(areaMax * basePrice * 1.1)
    return {
      type,
      minArea: areaMin,
      maxArea: areaMax,
      priceMin,
      priceMax,
      unitCount: randomBetween(40, 140),
    }
  })
}

const buildProject = (cityInfo, locality, builderId) => {
  const basePrice = randomBetween(6500, 18000)
  const minArea = randomBetween(900, 1400)
  const maxArea = minArea + randomBetween(300, 900)
  const minPrice = Math.round(minArea * basePrice)
  const maxPrice = Math.round(maxArea * basePrice * 1.15)
  const image = randomFrom(PROJECT_IMAGES)
  const projectType = Math.random() > 0.2 ? 'residential' : 'mixed_use'
  const propertyType = projectType === 'residential'
    ? ['apartment', 'villa']
    : ['apartment', 'shop']

  return {
    name: `${randomFrom(PROJECT_NAMES)} ${locality.name} ${randomFrom(PROJECT_SUFFIXES)}`,
    builder: builderId,
    developerName: randomFrom(DEVELOPER_NAMES),
    city: cityInfo.city,
    state: cityInfo.state,
    locality: locality.name,
    address: `${locality.name}, ${cityInfo.city}`,
    projectType,
    propertyType,
    status: randomFrom(['pre_launch', 'ongoing', 'completed']),
    totalUnits: randomBetween(200, 900),
    availableUnits: randomBetween(80, 300),
    priceRange: { min: minPrice, max: maxPrice },
    pricePerSqft: { min: basePrice, max: Math.round(basePrice * 1.25) },
    avgPrice: Math.round((minPrice + maxPrice) / 2),
    configurations: buildConfigurations(basePrice, minArea, maxArea),
    amenities: AMENITIES.slice(0, randomBetween(4, 6)),
    highlights: HIGHLIGHTS.slice(0, randomBetween(2, 4)),
    images: [image, randomFrom(PROJECT_IMAGES)],
    thumbnail: image,
    possessionDate: new Date(Date.now() + randomBetween(180, 900) * 24 * 60 * 60 * 1000),
    geo: {
      type: 'Point',
      coordinates: [locality.lng, locality.lat],
    },
    isActive: true,
    isFeatured: Math.random() > 0.6,
  }
}

export const buildSampleProjects = (builderId = null) => {
  const projects = []

  CITY_CATALOG.forEach((cityInfo) => {
    cityInfo.localities.forEach((locality) => {
      projects.push(buildProject(cityInfo, locality, builderId))
    })
  })

  return projects
}
