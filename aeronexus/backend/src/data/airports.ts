// Airport master seed. Coordinates and codes are public reference data; terminals listed only where we are confident.
type Seed = [iata: string, icao: string, name: string, city: string, country: string, tz: string, lat: number, lon: number, terminals?: string[]]

const IN = 'Asia/Kolkata'

export const AIRPORTS: Seed[] = [
  ['DEL', 'VIDP', 'Indira Gandhi International', 'New Delhi', 'India', IN, 28.5562, 77.1, ['T1', 'T2', 'T3']],
  ['BOM', 'VABB', 'Chhatrapati Shivaji Maharaj International', 'Mumbai', 'India', IN, 19.0896, 72.8656, ['T1', 'T2']],
  ['BLR', 'VOBL', 'Kempegowda International', 'Bengaluru', 'India', IN, 13.1986, 77.7066, ['T1', 'T2']],
  ['CCU', 'VECC', 'Netaji Subhas Chandra Bose International', 'Kolkata', 'India', IN, 22.6547, 88.4467],
  ['MAA', 'VOMM', 'Chennai International', 'Chennai', 'India', IN, 12.9941, 80.1709],
  ['HYD', 'VOHS', 'Rajiv Gandhi International', 'Hyderabad', 'India', IN, 17.2403, 78.4294],
  ['COK', 'VOCI', 'Cochin International', 'Kochi', 'India', IN, 10.152, 76.4019],
  ['AMD', 'VAAH', 'Sardar Vallabhbhai Patel International', 'Ahmedabad', 'India', IN, 23.0772, 72.6347],
  ['PNQ', 'VAPO', 'Pune Airport', 'Pune', 'India', IN, 18.5821, 73.9197],
  ['GOI', 'VOGO', 'Dabolim Airport', 'Goa', 'India', IN, 15.3808, 73.8314],
  ['JAI', 'VIJP', 'Jaipur International', 'Jaipur', 'India', IN, 26.8242, 75.8122],
  ['LKO', 'VILK', 'Chaudhary Charan Singh International', 'Lucknow', 'India', IN, 26.7606, 80.8893],
  ['GAU', 'VEGT', 'Lokpriya Gopinath Bordoloi International', 'Guwahati', 'India', IN, 26.1061, 91.5859],
  ['TRV', 'VOTV', 'Thiruvananthapuram International', 'Thiruvananthapuram', 'India', IN, 8.4821, 76.9201],
  ['IXC', 'VICG', 'Chandigarh International', 'Chandigarh', 'India', IN, 30.6735, 76.7885],
  ['PAT', 'VEPT', 'Jay Prakash Narayan International', 'Patna', 'India', IN, 25.5913, 85.088],
  ['BBI', 'VEBS', 'Biju Patnaik International', 'Bhubaneswar', 'India', IN, 20.2444, 85.8178],
  ['SXR', 'VISR', 'Srinagar International', 'Srinagar', 'India', IN, 33.9871, 74.7742],
  ['IXB', 'VEBD', 'Bagdogra Airport', 'Siliguri', 'India', IN, 26.6812, 88.3286],
  ['DXB', 'OMDB', 'Dubai International', 'Dubai', 'United Arab Emirates', 'Asia/Dubai', 25.2532, 55.3657],
  ['DOH', 'OTHH', 'Hamad International', 'Doha', 'Qatar', 'Asia/Qatar', 25.2731, 51.6081],
  ['SIN', 'WSSS', 'Singapore Changi', 'Singapore', 'Singapore', 'Asia/Singapore', 1.3644, 103.9915],
  ['BKK', 'VTBS', 'Suvarnabhumi', 'Bangkok', 'Thailand', 'Asia/Bangkok', 13.69, 100.7501],
  ['KTM', 'VNKT', 'Tribhuvan International', 'Kathmandu', 'Nepal', 'Asia/Kathmandu', 27.6966, 85.3591],
  ['CMB', 'VCBI', 'Bandaranaike International', 'Colombo', 'Sri Lanka', 'Asia/Colombo', 7.1808, 79.8841],
  ['DAC', 'VGHS', 'Hazrat Shahjalal International', 'Dhaka', 'Bangladesh', 'Asia/Dhaka', 23.8433, 90.3978],
  ['LHR', 'EGLL', 'Heathrow', 'London', 'United Kingdom', 'Europe/London', 51.47, -0.4543],
  ['FRA', 'EDDF', 'Frankfurt', 'Frankfurt', 'Germany', 'Europe/Berlin', 50.0379, 8.5622],
  ['JFK', 'KJFK', 'John F. Kennedy International', 'New York', 'United States', 'America/New_York', 40.6413, -73.7781],
]

export const airportDocs = AIRPORTS.map(([iata, icao, name, city, country, timezone, lat, lon, terminals = []]) => ({
  iata, icao, name, city, country, timezone, terminals, location: { type: 'Point', coordinates: [lon, lat] },
}))

export const airportByIata = new Map(airportDocs.map((a) => [a.iata, a]))
export const coordsOf = (iata: string) => {
  const a = airportByIata.get(iata)
  return a ? { lat: a.location.coordinates[1], lon: a.location.coordinates[0] } : null
}
