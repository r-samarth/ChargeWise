export interface KarnatakaPlace {
  name: string;
  district: string;
  lat: number;
  lon: number;
}

// Verified Nominatim / OpenStreetMap coordinates across Karnataka districts & highway hubs
export const KARNATAKA_PLACES: KarnatakaPlace[] = [
  { name: "Mysuru", district: "Mysuru", lat: 12.304146, lon: 76.652952 },
  { name: "Mangaluru", district: "Dakshina Kannada", lat: 12.869825, lon: 74.843013 },
  { name: "Bengaluru", district: "Bengaluru Urban", lat: 12.976794, lon: 77.590082 },
  { name: "Hunsur", district: "Mysuru", lat: 12.303509, lon: 76.29281 },
  { name: "Kushalnagar", district: "Kodagu", lat: 12.458553, lon: 75.961437 },
  { name: "Madikeri", district: "Kodagu", lat: 12.42149, lon: 75.738754 },
  { name: "Sullia", district: "Dakshina Kannada", lat: 12.557664, lon: 75.390758 },
  { name: "Puttur", district: "Dakshina Kannada", lat: 12.763286, lon: 75.201842 },
  { name: "Hassan", district: "Hassan", lat: 13.030185, lon: 76.174497 },
  { name: "Sakleshpur", district: "Hassan", lat: 12.943435, lon: 75.786232 },
  { name: "Channarayapatna", district: "Hassan", lat: 12.892458, lon: 76.393886 },
  { name: "Kunigal", district: "Tumakuru", lat: 13.02602, lon: 77.02227 },
  { name: "Tumakuru", district: "Tumakuru", lat: 13.419251, lon: 76.881 },
  { name: "Sira", district: "Tumakuru", lat: 13.74095, lon: 76.90574 },
  { name: "Chitradurga", district: "Chitradurga", lat: 14.30492, lon: 76.52967 },
  { name: "Davanagere", district: "Davanagere", lat: 14.45674, lon: 75.90727 },
  { name: "Haveri", district: "Haveri", lat: 14.71803, lon: 75.36564 },
  { name: "Hubballi", district: "Dharwad", lat: 15.351838, lon: 75.137985 },
  { name: "Dharwad", district: "Dharwad", lat: 15.37073, lon: 75.13329 },
  { name: "Belagavi", district: "Belagavi", lat: 15.87833, lon: 74.51581 },
  { name: "Udupi", district: "Udupi", lat: 13.35197, lon: 74.78703 },
  { name: "Kundapura", district: "Udupi", lat: 13.61337, lon: 74.72869 },
  { name: "Karwar", district: "Uttara Kannada", lat: 14.81219, lon: 74.13234 },
  { name: "Gokarna", district: "Uttara Kannada", lat: 14.54396, lon: 74.31844 },
  { name: "Shivamogga", district: "Shivamogga", lat: 13.932609, lon: 75.574978 },
  { name: "Chikkamagaluru", district: "Chikkamagaluru", lat: 13.40587, lon: 75.63876 },
  { name: "Mandya", district: "Mandya", lat: 12.63689, lon: 76.72755 },
  { name: "Ramanagara", district: "Ramanagara", lat: 12.72528, lon: 77.28048 },
  { name: "Kolar", district: "Kolar", lat: 13.12175, lon: 78.1255 },
  { name: "Chikkaballapur", district: "Chikkaballapur", lat: 13.09938, lon: 77.38873 },
  { name: "Hosapete (Hampi)", district: "Vijayanagara", lat: 15.26649, lon: 76.38723 },
  { name: "Ballari", district: "Ballari", lat: 15.34832, lon: 76.80549 },
  { name: "Kalaburagi", district: "Kalaburagi", lat: 17.2409, lon: 76.76974 },
  { name: "Vijayapura", district: "Vijayapura", lat: 16.81442, lon: 75.89339 },
  { name: "Bidar", district: "Bidar", lat: 18.02073, lon: 77.24872 },
  { name: "Raichur", district: "Raichur", lat: 16.05472, lon: 76.90036 },
  { name: "Chamarajanagar", district: "Chamarajanagar", lat: 11.95442, lon: 77.10691 },
];
