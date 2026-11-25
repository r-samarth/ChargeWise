export interface KarnatakaPlace {
  name: string;
  district: string;
  lat: number;
  lon: number;
}

// Verified Nominatim coordinates for Karnataka hubs
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
  { name: "Tumakuru", district: "Tumakuru", lat: 13.419251, lon: 76.881 },
  { name: "Udupi", district: "Udupi", lat: 13.526978, lon: 74.873188 },
  { name: "Shivamogga", district: "Shivamogga", lat: 13.932609, lon: 75.574978 },
  { name: "Hubballi", district: "Dharwad", lat: 15.351838, lon: 75.137985 },
  { name: "Belagavi", district: "Belagavi", lat: 16.158785, lon: 74.888862 },
];
