# EstateHub - 99acres Clone (Client)

Location-aware property discovery UI built with React + Vite.

## Status (June 2, 2026)

Completed:
- Location-based dashboard now fetches from /api/properties?city=<userCity> (no mock data)
- SearchBar and Listings filters wired to API (price, BHK, amenities, property type)
- PropertyDetailsPage fetches from /api/properties/details/:id
- Contact Owner creates a lead via /api/leads (login required)
- Locality insights are shown on property details when available

In progress:
- Wishlist UI (save/unsave) and Wishlist page
- Similar properties and reviews on property details

Not started:
- Maps integration (Mapbox/Google Maps)
- Chat system (buyer/owner/broker/builder)
- Property alerts (email/SMS/push)
- Admin dashboard
- Recommendation engine
- Rental agreement module

## Run the app

Backend (separate terminal):
1. cd /Users/himanshuverma/d-drive/EstateHub/server
2. npm start

Frontend:
1. cd /Users/himanshuverma/d-drive/EstateHub/client
2. npm run dev

Vite will print the local URL (usually http://localhost:5173 or 5174).

## What was implemented (recent)

1. Location-based dashboard
	- Uses browser geolocation to infer city and queries /api/properties with city param.
2. Advanced search
	- SearchBar sends city/locality + property type.
	- Listings sidebar applies minPrice, maxPrice, BHK, and amenities filters.
3. Property details
	- Loads details from /api/properties/details/:id
	- Displays locality insights when available.
4. Leads
	- Contact Owner creates a lead via /api/leads (protected route).

## Next steps (recommended order)

1. Validate the dashboard
	- Open the home page and confirm properties load for detected city.
2. Verify search filters
	- Apply min/max price, BHK, and amenities; confirm results update.
3. Verify property details
	- Open a property; confirm details load and locality insights render.
4. Wishlist feature
	- Add save/unsave actions and a saved properties page.
5. Property detail enhancements
	- Add similar properties and reviews sections.

## Notes

- Contact Owner requires login (JWT) because /api/leads is protected.
- Sample data is seeded on server start; results should appear immediately.
