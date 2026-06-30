import type { D1Database } from '@cloudflare/workers-types';
import { countryCode } from './utils';

/** Approximate centroids: ISO alpha-2 → [lat, lng, display name] */
export const COUNTRY_CENTROIDS: Record<string, [number, number, string]> = {
  // North America
  US: [38.0, -97.0, 'United States'],
  CA: [56.0, -96.0, 'Canada'],
  MX: [23.0, -102.0, 'Mexico'],
  GT: [15.5, -90.3, 'Guatemala'],
  BZ: [17.2, -88.5, 'Belize'],
  HN: [15.0, -87.0, 'Honduras'],
  SV: [13.7, -89.0, 'El Salvador'],
  NI: [13.0, -85.0, 'Nicaragua'],
  CR: [10.0, -84.0, 'Costa Rica'],
  PA: [9.0, -80.0, 'Panama'],
  CU: [22.0, -80.0, 'Cuba'],
  JM: [18.1, -77.3, 'Jamaica'],
  HT: [19.0, -73.0, 'Haiti'],
  DO: [19.0, -71.0, 'Dominican Republic'],
  PR: [18.2, -66.5, 'Puerto Rico'],
  TT: [10.4, -61.2, 'Trinidad and Tobago'],
  BB: [13.2, -59.5, 'Barbados'],
  GD: [12.0, -61.7, 'Grenada'],
  LC: [13.9, -60.9, 'Saint Lucia'],
  VC: [13.3, -61.2, 'Saint Vincent and the Grenadines'],
  AG: [17.1, -61.8, 'Antigua and Barbuda'],
  DM: [15.4, -61.4, 'Dominica'],
  KN: [17.3, -62.7, 'Saint Kitts and Nevis'],
  BS: [25.0, -77.4, 'Bahamas'],
  // South America
  CO: [4.0, -72.0, 'Colombia'],
  VE: [8.0, -66.0, 'Venezuela'],
  GY: [5.0, -59.0, 'Guyana'],
  SR: [4.0, -56.0, 'Suriname'],
  BR: [-10.0, -51.0, 'Brazil'],
  EC: [-1.8, -78.2, 'Ecuador'],
  PE: [-9.0, -75.0, 'Peru'],
  BO: [-17.0, -65.0, 'Bolivia'],
  PY: [-23.0, -58.0, 'Paraguay'],
  UY: [-33.0, -56.0, 'Uruguay'],
  AR: [-34.0, -64.0, 'Argentina'],
  CL: [-30.0, -71.0, 'Chile'],
  // Europe
  IS: [65.0, -18.0, 'Iceland'],
  GB: [54.0, -2.0, 'United Kingdom'],
  IE: [53.0, -8.0, 'Ireland'],
  PT: [39.5, -8.0, 'Portugal'],
  ES: [40.0, -4.0, 'Spain'],
  FR: [46.0, 2.0, 'France'],
  BE: [50.5, 4.5, 'Belgium'],
  NL: [52.3, 5.3, 'Netherlands'],
  LU: [49.8, 6.1, 'Luxembourg'],
  CH: [47.0, 8.0, 'Switzerland'],
  DE: [51.0, 10.0, 'Germany'],
  AT: [47.5, 14.0, 'Austria'],
  IT: [43.0, 12.0, 'Italy'],
  MT: [35.9, 14.4, 'Malta'],
  DK: [56.0, 10.0, 'Denmark'],
  SE: [62.0, 15.0, 'Sweden'],
  NO: [65.0, 13.0, 'Norway'],
  FI: [64.0, 26.0, 'Finland'],
  EE: [59.0, 25.0, 'Estonia'],
  LV: [57.0, 25.0, 'Latvia'],
  LT: [56.0, 24.0, 'Lithuania'],
  PL: [52.0, 20.0, 'Poland'],
  CZ: [49.8, 15.5, 'Czech Republic'],
  SK: [48.7, 19.7, 'Slovakia'],
  HU: [47.0, 19.5, 'Hungary'],
  SI: [46.1, 14.8, 'Slovenia'],
  HR: [45.1, 16.4, 'Croatia'],
  BA: [44.2, 17.4, 'Bosnia and Herzegovina'],
  RS: [44.0, 21.0, 'Serbia'],
  ME: [42.7, 19.4, 'Montenegro'],
  AL: [41.2, 20.2, 'Albania'],
  MK: [41.6, 21.7, 'North Macedonia'],
  GR: [39.0, 22.0, 'Greece'],
  BG: [43.0, 25.0, 'Bulgaria'],
  RO: [46.0, 25.0, 'Romania'],
  MD: [47.0, 29.0, 'Moldova'],
  UA: [49.0, 32.0, 'Ukraine'],
  BY: [53.5, 28.0, 'Belarus'],
  RU: [60.0, 100.0, 'Russia'],
  // Middle East / West Asia
  TR: [39.0, 35.0, 'Turkey'],
  CY: [35.0, 33.0, 'Cyprus'],
  SY: [35.0, 38.0, 'Syria'],
  LB: [34.0, 36.0, 'Lebanon'],
  IL: [31.5, 35.0, 'Israel'],
  JO: [31.0, 36.5, 'Jordan'],
  IQ: [33.0, 44.0, 'Iraq'],
  KW: [29.3, 47.7, 'Kuwait'],
  BH: [26.0, 50.5, 'Bahrain'],
  QA: [25.3, 51.2, 'Qatar'],
  AE: [24.0, 54.0, 'United Arab Emirates'],
  SA: [24.0, 45.0, 'Saudi Arabia'],
  YE: [16.0, 48.0, 'Yemen'],
  OM: [22.0, 58.0, 'Oman'],
  // Caucasus
  GE: [42.3, 43.4, 'Georgia'],
  AM: [40.1, 44.9, 'Armenia'],
  AZ: [40.1, 47.6, 'Azerbaijan'],
  // Central Asia
  KZ: [48.0, 68.0, 'Kazakhstan'],
  UZ: [41.4, 63.0, 'Uzbekistan'],
  TM: [40.0, 59.0, 'Turkmenistan'],
  TJ: [38.9, 71.3, 'Tajikistan'],
  KG: [41.2, 74.8, 'Kyrgyzstan'],
  AF: [33.0, 66.0, 'Afghanistan'],
  // South Asia
  PK: [30.0, 70.0, 'Pakistan'],
  IN: [20.0, 77.0, 'India'],
  BD: [24.0, 90.4, 'Bangladesh'],
  NP: [28.4, 84.1, 'Nepal'],
  BT: [27.5, 90.4, 'Bhutan'],
  LK: [7.6, 80.7, 'Sri Lanka'],
  MV: [4.2, 73.2, 'Maldives'],
  // East Asia
  CN: [35.0, 105.0, 'China'],
  MN: [46.8, 103.8, 'Mongolia'],
  JP: [36.2, 138.2, 'Japan'],
  KR: [36.5, 127.8, 'South Korea'],
  KP: [40.3, 127.5, 'North Korea'],
  TW: [23.7, 121.0, 'Taiwan'],
  // Southeast Asia
  MM: [19.0, 96.7, 'Myanmar'],
  TH: [15.0, 101.0, 'Thailand'],
  LA: [18.0, 103.0, 'Laos'],
  VN: [14.1, 108.3, 'Vietnam'],
  KH: [12.0, 104.9, 'Cambodia'],
  MY: [2.5, 112.5, 'Malaysia'],
  SG: [1.35, 103.8, 'Singapore'],
  ID: [-5.0, 120.0, 'Indonesia'],
  PH: [13.0, 122.0, 'Philippines'],
  TL: [-8.9, 125.7, 'Timor-Leste'],
  BN: [4.5, 114.7, 'Brunei'],
  // Oceania
  AU: [-27.0, 133.0, 'Australia'],
  NZ: [-41.0, 174.0, 'New Zealand'],
  PG: [-6.0, 147.0, 'Papua New Guinea'],
  FJ: [-18.0, 178.0, 'Fiji'],
  SB: [-8.1, 159.0, 'Solomon Islands'],
  VU: [-16.0, 167.0, 'Vanuatu'],
  WS: [-13.6, -172.4, 'Samoa'],
  TO: [-20.0, -175.2, 'Tonga'],
  // Africa
  MA: [32.0, -5.0, 'Morocco'],
  DZ: [28.0, 2.6, 'Algeria'],
  TN: [34.0, 9.0, 'Tunisia'],
  LY: [27.0, 17.0, 'Libya'],
  EG: [26.5, 29.8, 'Egypt'],
  MR: [20.2, -10.3, 'Mauritania'],
  ML: [17.6, -4.0, 'Mali'],
  NE: [16.1, 8.1, 'Niger'],
  TD: [15.5, 18.7, 'Chad'],
  SD: [15.6, 32.5, 'Sudan'],
  SS: [6.5, 31.3, 'South Sudan'],
  ET: [9.1, 40.5, 'Ethiopia'],
  ER: [15.2, 39.8, 'Eritrea'],
  DJ: [11.8, 42.6, 'Djibouti'],
  SO: [5.2, 46.2, 'Somalia'],
  KE: [0.0, 38.0, 'Kenya'],
  UG: [1.4, 32.0, 'Uganda'],
  RW: [-2.0, 30.0, 'Rwanda'],
  BI: [-3.4, 30.0, 'Burundi'],
  TZ: [-6.4, 35.0, 'Tanzania'],
  MZ: [-18.7, 35.5, 'Mozambique'],
  ZM: [-13.5, 28.5, 'Zambia'],
  MW: [-13.2, 34.3, 'Malawi'],
  ZW: [-20.0, 30.0, 'Zimbabwe'],
  BW: [-22.3, 24.7, 'Botswana'],
  NA: [-22.0, 17.1, 'Namibia'],
  ZA: [-29.0, 25.0, 'South Africa'],
  LS: [-29.6, 28.2, 'Lesotho'],
  SZ: [-26.5, 31.5, 'Eswatini'],
  MG: [-20.0, 47.0, 'Madagascar'],
  AO: [-11.2, 17.9, 'Angola'],
  CD: [-4.0, 22.0, 'DR Congo'],
  CG: [-1.0, 15.0, 'Republic of Congo'],
  GA: [-1.0, 11.8, 'Gabon'],
  GQ: [1.7, 10.3, 'Equatorial Guinea'],
  CF: [7.0, 20.9, 'Central African Republic'],
  CM: [5.7, 12.4, 'Cameroon'],
  NG: [10.0, 8.7, 'Nigeria'],
  BJ: [9.3, 2.3, 'Benin'],
  TG: [8.0, 1.2, 'Togo'],
  GH: [8.0, -2.0, 'Ghana'],
  CI: [7.5, -5.5, 'Côte d\'Ivoire'],
  BF: [12.4, -1.6, 'Burkina Faso'],
  SN: [14.5, -14.5, 'Senegal'],
  GM: [13.4, -15.3, 'Gambia'],
  GW: [12.0, -15.2, 'Guinea-Bissau'],
  GN: [11.0, -11.0, 'Guinea'],
  SL: [8.5, -11.8, 'Sierra Leone'],
  LR: [6.4, -9.4, 'Liberia'],
  KM: [-11.9, 43.4, 'Comoros'],
  SC: [-4.7, 55.5, 'Seychelles'],
  MU: [-20.3, 57.5, 'Mauritius'],
  CV: [16.0, -24.0, 'Cape Verde'],
};

/**
 * Re-computes country_counts for a user from their current library.
 * Only counts rated, non-hidden albums. Stores raw DB country values as keys.
 */
export async function recomputeCountryCounts(db: D1Database, userId: number): Promise<void> {
  const { results } = await db.prepare(`
    SELECT a.country, COUNT(*) as cnt
    FROM user_albums ua
    JOIN albums a ON a.id = ua.album_id
    WHERE ua.user_id = ?
      AND ua.rating IS NOT NULL
      AND ua.is_hidden = 0
      AND a.country IS NOT NULL
      AND a.country != ''
    GROUP BY a.country
  `).bind(userId).all<{ country: string; cnt: number }>();

  const json = results.length > 0 ? JSON.stringify(
    Object.fromEntries(results.map(r => [r.country, r.cnt]))
  ) : null;

  await db.prepare('UPDATE users SET country_counts = ? WHERE id = ?')
    .bind(json, userId).run();
}

/** Given a raw DB country value, return the centroid or null. */
export function getCentroid(rawCountry: string): [number, number, string] | null {
  const iso = countryCode(rawCountry);
  if (!iso) return null;
  return COUNTRY_CENTROIDS[iso] ?? null;
}
