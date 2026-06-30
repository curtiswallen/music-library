#!/usr/bin/env node
/**
 * Generates src/generated/world-map-paths.ts from Natural Earth 110m country data.
 *
 * Usage:
 *   node scripts/generate-world-map.mjs
 */

import { feature } from 'topojson-client';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const root  = join(__dir, '..');

// TopoJSON IDs are zero-padded strings ("004", "032", etc.)
// parseInt normalises them to match these keys.
const NUMERIC_TO_ALPHA2 = {
  4:'AF', 8:'AL', 12:'DZ', 20:'AD', 24:'AO', 28:'AG', 31:'AZ', 32:'AR',
  36:'AU', 40:'AT', 44:'BS', 48:'BH', 50:'BD', 51:'AM', 52:'BB', 56:'BE',
  64:'BT', 68:'BO', 70:'BA', 72:'BW', 76:'BR', 84:'BZ', 90:'SB', 96:'BN',
  100:'BG', 104:'MM', 108:'BI', 112:'BY', 116:'KH', 120:'CM', 124:'CA',
  132:'CV', 140:'CF', 144:'LK', 148:'TD', 152:'CL', 156:'CN', 158:'TW',
  170:'CO', 174:'KM', 178:'CG', 180:'CD', 188:'CR', 191:'HR', 192:'CU',
  196:'CY', 203:'CZ', 204:'BJ', 208:'DK', 214:'DO', 218:'EC', 222:'SV',
  226:'GQ', 231:'ET', 232:'ER', 233:'EE', 242:'FJ', 246:'FI', 250:'FR',
  262:'DJ', 266:'GA', 268:'GE', 270:'GM', 276:'DE', 288:'GH', 300:'GR',
  304:'GL', 308:'GD', 320:'GT', 324:'GN', 328:'GY', 332:'HT', 340:'HN',
  348:'HU', 352:'IS', 356:'IN', 360:'ID', 364:'IR', 368:'IQ', 372:'IE',
  376:'IL', 380:'IT', 384:'CI', 388:'JM', 392:'JP', 398:'KZ', 400:'JO',
  404:'KE', 408:'KP', 410:'KR', 414:'KW', 417:'KG', 418:'LA', 422:'LB',
  426:'LS', 428:'LV', 430:'LR', 434:'LY', 440:'LT', 442:'LU', 450:'MG',
  454:'MW', 458:'MY', 462:'MV', 466:'ML', 470:'MT', 478:'MR', 484:'MX',
  496:'MN', 498:'MD', 499:'ME', 504:'MA', 508:'MZ', 512:'OM', 516:'NA',
  524:'NP', 528:'NL', 554:'NZ', 558:'NI', 562:'NE', 566:'NG', 578:'NO',
  586:'PK', 591:'PA', 598:'PG', 600:'PY', 604:'PE', 608:'PH', 616:'PL',
  620:'PT', 624:'GW', 626:'TL', 634:'QA', 642:'RO', 643:'RU', 646:'RW',
  682:'SA', 686:'SN', 688:'RS', 694:'SL', 703:'SK', 704:'VN', 705:'SI',
  706:'SO', 710:'ZA', 716:'ZW', 724:'ES', 728:'SS', 729:'SD', 732:'EH', 740:'SR',
  748:'SZ', 752:'SE', 756:'CH', 760:'SY', 762:'TJ', 764:'TH', 768:'TG',
  780:'TT', 784:'AE', 788:'TN', 792:'TR', 795:'TM', 800:'UG', 804:'UA',
  807:'MK', 818:'EG', 826:'GB', 834:'TZ', 840:'US', 854:'BF', 858:'UY',
  860:'UZ', 862:'VE', 887:'YE', 894:'ZM',
};

// Equirectangular projection: 1° = 1 SVG unit, viewBox "0 0 360 180"
// Handles antimeridian crossing by keeping the path continuous (may extend
// slightly beyond x=360 or below x=0, which SVG clips harmlessly).
function ringToPath(ring) {
  const pts = [];
  let prevLng = ring[0][0];
  for (let i = 0; i < ring.length; i++) {
    let [lng, lat] = ring[i];
    if (i > 0) {
      // Adjust for antimeridian crossing so the path stays continuous
      while (lng - prevLng >  180) lng -= 360;
      while (prevLng - lng >  180) lng += 360;
    }
    prevLng = lng;
    const x = Math.round((lng + 180) * 10) / 10;
    const y = Math.round((90  - lat) * 10) / 10;
    pts.push(i === 0 ? `M${x},${y}` : `L${x},${y}`);
  }
  return pts.join('') + 'Z';
}

// For countries whose MultiPolygon includes overseas territories on other continents,
// supply a bounding box [minLng, minLat, maxLng, maxLat] — polygons whose centroid
// falls INSIDE get assigned to the main country; those OUTSIDE go to TERRITORY_EXTRACTIONS.
const MAIN_BBOX = {
  FR: [-10, 41, 15, 52],   // Metropolitan France + Corsica only
};

// Polygons excluded from a country by MAIN_BBOX are re-assigned to this ISO code.
const TERRITORY_EXTRACTIONS = {
  FR: 'GF',   // French Guiana lives inside France's MultiPolygon in 110m data
};

function polyCentroid(poly) {
  const ring = poly[0];
  const lngs = ring.map(c => c[0]);
  const lats  = ring.map(c => c[1]);
  return [(Math.min(...lngs) + Math.max(...lngs)) / 2,
          (Math.min(...lats) + Math.max(...lats)) / 2];
}

function insideBbox(poly, bbox) {
  const [cLng, cLat] = polyCentroid(poly);
  return cLng >= bbox[0] && cLat >= bbox[1] && cLng <= bbox[2] && cLat <= bbox[3];
}

function geomToPath(geom, alpha2) {
  if (!geom) return '';
  const bbox = MAIN_BBOX[alpha2];
  function keep(poly) { return !bbox || insideBbox(poly, bbox); }
  if (geom.type === 'Polygon') {
    return keep(geom.coordinates) ? geom.coordinates.map(ringToPath).join('') : '';
  }
  if (geom.type === 'MultiPolygon') {
    return geom.coordinates.filter(keep).flatMap(poly => poly.map(ringToPath)).join('');
  }
  return '';
}

function geomToExcludedPath(geom, alpha2) {
  if (!geom) return '';
  const bbox = MAIN_BBOX[alpha2];
  if (!bbox) return '';
  function excluded(poly) { return !insideBbox(poly, bbox); }
  if (geom.type === 'MultiPolygon') {
    return geom.coordinates.filter(excluded).flatMap(poly => poly.map(ringToPath)).join('');
  }
  return '';
}

const topoPath  = join(root, 'node_modules', 'world-atlas', 'countries-110m.json');
const topo      = JSON.parse(readFileSync(topoPath, 'utf8'));
const countries = feature(topo, topo.objects.countries);

const paths = {};
for (const f of countries.features) {
  const numericId = parseInt(f.id, 10);   // "004" → 4
  const alpha2    = NUMERIC_TO_ALPHA2[numericId];
  if (!alpha2) continue;
  const d = geomToPath(f.geometry, alpha2);
  if (d) paths[alpha2] = d;
  // Re-assign excluded polygons to their overseas territory ISO code
  const extractTo = TERRITORY_EXTRACTIONS[alpha2];
  if (extractTo) {
    const excluded = geomToExcludedPath(f.geometry, alpha2);
    if (excluded) paths[extractTo] = excluded;
  }
}

const sorted  = Object.keys(paths).sort();
const entries = sorted.map(k => `  ${JSON.stringify(k)}: ${JSON.stringify(paths[k])},`).join('\n');

const output = `\
// Auto-generated by scripts/generate-world-map.mjs — do not edit manually.
// Source: Natural Earth 110m, equirectangular projection (viewBox "0 0 360 180").
export const COUNTRY_PATHS: Record<string, string> = {\n${entries}\n};\n`;

const outDir  = join(root, 'src', 'generated');
const outFile = join(outDir, 'world-map-paths.ts');
mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, output, 'utf8');
console.log(`Generated ${sorted.length} country paths → src/generated/world-map-paths.ts`);
