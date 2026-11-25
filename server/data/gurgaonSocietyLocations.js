// Verified pin for each Gurgaon society in our test data (lat, lng), checked on 2026-11-25 against flat-finder's
// Gurgaon data (Magicbricks + OpenStreetMap, real-estate/flat-finder). A flat-finder point is used only when it lies within
// 2.5 km of the median of all flat-finder societies in the same sector; otherwise the sector median is used.
// Societies not listed here fall back to the sector centre in gurgaonListings.js / gurgaonMandateDeals.js.
export const SOCIETY_LOCATIONS = {
	"3C Greenopolis": [28.414771, 76.945716], // ff "Orris 3c Greenopolis"
	"Adani Deen Dayal Plots": [28.476311, 76.97161], // sector median
	"Adani Samsara": [28.402361, 77.095793], // ff "Adani Samsara"
	"Anant Raj The Estate Floors": [28.39799, 77.09921], // ff "Anant Raj Estate"
	"Apex Our Homes": [28.44661, 76.983832], // ff "The Trisara Apex Our Homes"
	"Ardee City": [28.441926, 77.07843], // ff "Ardee City"
	"ATS Tourmaline": [28.512584, 77.024817], // ff "ATS Tourmaline"
	"ATS Triumph": [28.478317, 76.986418], // ff "ATS Triumph"
	"Birla Avik": [28.392013, 77.089813], // ff "Birla Navya Avik Phase 1"
	"BPTP Amstoria": [28.474966, 76.976697], // ff "BPTP Amstoria"
	"BPTP Astaire Garden": [28.397495, 77.022815], // ff "Countrywide The Oval At Astaire Garden"
	"BPTP Spacio": [28.446052, 76.977286], // ff "BPTP Spacio"
	"BPTP Terra": [28.456365, 76.97299], // ff "BPTP Terra"
	"Central Park Flower Valley": [28.28253, 77.067993], // ff "Central Park Flower Valley"
	"CHD Avenue 71": [28.406954, 77.024929], // ff "CHD Avenue 71"
	"Dhoot Times Residency": [28.400469, 77.0902], // ff "Dhoot Time Residency"
	"DLF Beverly Park 2": [28.478351, 77.077452], // ff "DLF Beverly Park"
	"DLF Garden City": [28.4045, 76.907981], // ff "DLF Garden City Floors"
	"DLF Park Place": [28.440434, 77.110975], // ff "DLF Park Place"
	"DLF Phase 3, U Block": [28.493311, 77.109087], // ff "DLF Society Phase 3 Block V9"
	"DLF Privana South": [28.381312, 76.98972], // ff "DLF Privana South"
	"DLF Windsor Court": [28.463738, 77.085824], // ff "DLF Windsor Court"
	"Elan The Presidential": [28.502132, 77.004064], // ff "Elan The Presidential"
	"Emaar Emerald Hill": [28.397784, 77.069061], // ff "Emaar Emerald Hills"
	"Emaar Urban Ascent": [28.521894, 77.021499], // ff "Emaar Urban Ascent"
	"Eros Rosewood Villas": [28.411186, 77.049708], // ff "Rosewood City"
	"Experion The Heartsong": [28.51393, 76.988788], // ff "Experion Heartsong"
	"GLS Arawali Homes": [28.263687, 77.083026], // ff "Arawali Homes 2"
	"Godrej Alira": [28.442508, 77.043727], // ff "Godrej Alira"
	"Godrej Meridian": [28.506506, 76.990254], // ff "Godrej Meridien"
	"Godrej Oasis": [28.430651, 76.949909], // ff "Godrej Oasis"
	"HBH Galaxy Apartments": [28.455459, 77.094668], // ff "Galaxy Apartment"
	"Heritage Max": [28.470144, 76.97073], // ff "Conscient Heritage Max"
	"Ireo Savana": [28.283759, 77.065345], // ff "Ireo Savannah"
	"Ireo The Corridors": [28.38299, 77.067932], // ff "Ireo The Corridors"
	"Ireo Uptown": [28.395682, 77.059798], // ff "IREO Uptown"
	"Jalvayu Towers": [28.430839, 77.09668], // ff "Jalvayu Tower"
	"Joy Central": [28.393094, 77.089813], // sector median
	"Krisumi Waterfall Suites": [28.414963, 76.977995], // ff "Krisumi Waterfall Suites II"
	"Landmark Avenue": [28.457354, 77.087086], // ff "Landmark Avenue"
	"M2K Aura": [28.425892, 77.055636], // ff "M2K Aura"
	"M3M Capital": [28.52577, 77.027321], // ff "M3M Capital"
	"M3M Golf Estate": [28.405113, 77.065538], // ff "M3M Golf Estate"
	"M3M Merlin": [28.389436, 77.059445], // ff "M3M Merlin"
	"M3M Solitude": [28.418805, 76.945281], // sector median
	"Malibu Towne": [28.425044, 77.051066], // ff "Kohli One Malibu Town Plots"
	"Mapsko Mount Ville": [28.362343, 76.978698], // ff "Mapsko Mount Ville"
	"Nirvana Country 2": [28.407236, 77.029506], // ff "Unitech Alder Grove Nirvana Country II"
	"Nirvana Country Deerwood": [28.417829, 77.063019], // ff "Unitech Nirvana Country Deerwood Chase"
	"Orris Woodview Residences": [28.418805, 76.94674], // ff "Orris Woodview Residencies"
	"Pareena Coban": [28.462499, 76.951715], // ff "PAREENA COBAN RESIDENCES"
	"Pareena Mi Casa": [28.385396, 77.04922], // ff "Pareena Micasa"
	"Park View Apartment": [28.430161, 77.093599], // ff "Park View Apartment"
	"Parsvnath Exotica": [28.440675, 77.096631], // ff "Parsvnath Exotica Phase 4"
	"Pratham Meghdoot Apartments": [28.44322, 77.000806], // ff "Meghdoot Apartment"
	"Princeton Floors": [28.432423, 77.066631], // ff "Princeton Floors"
	"Pyramid Urban Homes": [28.385817, 77.022201], // ff "Pyramid Urban Homes"
	"Ramprastha City": [28.44844, 76.969683], // ff "Ramprastha City"
	"Sahara Grace Condominium": [28.477773, 77.086201], // ff "Sahara Grace"
	"Sanskriti Apartments": [28.453035, 77.080939], // sector median
	"Satya The Hermitage": [28.495617, 76.988419], // ff "Satya The Hermitage"
	"Shakti Apartments": [28.456882, 77.039489], // ff "Shakti Cooperative Society"
	"Signature Global Andour Heights": [28.41061, 77.021542], // ff "Signature Andour Heights"
	"Signature Global City": [28.443029, 76.972875], // ff "Signature Global City 37D"
	"Signature Global Sidhrawali": [28.219, 76.642], // estimate, not verified
	"Signature The Serenas": [28.290381, 77.066053], // sector median
	"Smartworld One DXP": [28.529139, 77.024417], // ff "Smartworld One DXP"
	"Smartworld Orchard": [28.408521, 77.101145], // ff "Smartworld Orchard"
	"Smartworld The Edition": [28.404312, 77.052687], // ff "Smartworld The Edition"
	"Sobha City Gurgaon": [28.515115, 76.995749], // ff "Sobha City"
	"South City 1, Block K": [28.449348, 77.05965], // ff "South City 1"
	"SS Almeria": [28.409648, 76.961607], // ff "SS Almeria"
	"Sudham Apartment": [28.470812, 77.046066], // sector median
	"Suncity Platinum Towers": [28.475727, 77.073262], // ff "Suncity Platinum Towers"
	"The Peach Jasmine CGHS": [28.450544, 77.049603], // ff "Peach Jasmine"
	"Tulip White": [28.396337, 77.036476], // ff "Tulip White"
	"Uppal Southend": [28.408176, 77.046606], // ff "Uppal Southend"
	"Whiteland The Aspen & Blissville": [28.3945, 76.992961], // ff "Whiteland Blissville"
}

// Homes that are not in a society: centre of their sector (median of flat-finder societies there)
export const AREA_LOCATIONS = {
	"DLF Phase 1": [28.465045, 77.100712],
	"Palam Vihar": [28.511181, 77.033607],
	"Sector 28": [28.47197, 77.083895],
	"Sector 43": [28.453035, 77.080939],
	"Sector 45": [28.444658, 77.065801],
	"Sector 51": [28.428605, 77.065101],
}

// Names are compared the way the 3D map groups them, so "Mapsko Mountville" finds "Mapsko Mount Ville"
const key = (name) => String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
const BY_KEY = new Map(Object.entries(SOCIETY_LOCATIONS).map(([name, at]) => [key(name), at]))

// [lat, lng] for a listing: its society's verified pin, else its area's, else the given sector centre
export const locate = (society, locality, fallback) =>
	(society && BY_KEY.get(key(society))) || (!society && AREA_LOCATIONS[locality]) || fallback
