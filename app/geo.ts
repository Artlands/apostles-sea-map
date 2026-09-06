// The political and physical furniture of the map, hand-authored.
//
// The Roman provinces are an educational approximation of the situation around
// AD 50, when Paul was travelling: generous blobs rather than surveyed borders.
// They can afford to be generous because the renderer only tints dry cells, so
// wherever a ring runs out over water the sea simply trims it.
//
// Elevations come from app/dem.ts, which scripts/build-dem.mjs generates.

export type StatusKey = 'italia' | 'senatorial' | 'imperial' | 'client';

export const regions: { id: string; name: string; status: StatusKey; ring: [number, number][] }[] = [
  { id: 'ITALIA', name: '意大利', status: 'italia', ring: [
    [11.5, 42.5], [13.6, 42.5], [14.2, 41.9], [15.6, 41.9], [16.9, 41.3], [18.5, 40.2],
    [18.0, 39.8], [17.2, 40.4], [16.5, 39.8], [17.2, 38.9], [16.0, 37.8], [15.5, 38.3],
    [15.9, 39.6], [14.9, 40.1], [13.9, 40.6], [12.9, 41.3], [11.5, 42.1],
  ] },
  { id: 'SICILIA', name: '西西里', status: 'senatorial', ring: [
    [15.7, 38.3], [15.3, 37.2], [15.1, 36.6], [14.4, 36.6], [12.3, 37.6], [13.0, 38.3], [15.0, 38.4],
  ] },
  { id: 'MACEDONIA', name: '马其顿', status: 'senatorial', ring: [
    [20.0, 41.9], [21.5, 42.2], [22.9, 41.4], [24.1, 41.6], [24.7, 41.3], [24.6, 40.8],
    [23.9, 40.6], [23.1, 40.3], [22.7, 40.0], [23.1, 39.2], [22.6, 38.9], [21.8, 38.9],
    [20.9, 39.3], [20.0, 39.7], [19.4, 40.5],
  ] },
  { id: 'ACHAIA', name: '亚该亚', status: 'senatorial', ring: [
    [22.6, 38.9], [23.1, 39.2], [24.3, 38.5], [24.1, 37.6], [23.2, 37.3], [22.4, 36.3],
    [21.9, 36.8], [21.2, 37.6], [21.1, 38.4], [21.8, 38.9],
  ] },
  { id: 'THRACIA', name: '色雷斯', status: 'client', ring: [
    [24.7, 41.3], [26.0, 41.6], [27.6, 42.0], [28.6, 42.5], [24.1, 42.5], [24.1, 41.6],
  ] },
  { id: 'ASIA', name: '亚细亚', status: 'senatorial', ring: [
    [25.9, 40.7], [27.6, 40.4], [28.9, 40.1], [30.0, 39.6], [30.8, 38.6], [30.2, 37.4],
    [28.9, 36.9], [27.8, 36.6], [26.5, 37.5], [26.0, 38.4], [25.8, 39.6],
  ] },
  { id: 'BITHYNIA ET PONTVS', name: '庇推尼与本都', status: 'senatorial', ring: [
    [28.9, 40.1], [30.5, 41.3], [33.0, 42.1], [35.5, 41.8], [37.5, 41.3], [37.5, 40.5],
    [35.0, 40.4], [33.5, 40.4], [32.0, 40.0], [30.6, 39.9], [30.0, 39.6],
  ] },
  { id: 'GALATIA', name: '加拉太', status: 'imperial', ring: [
    [30.0, 39.6], [30.6, 39.9], [32.0, 40.0], [33.5, 40.4], [34.5, 39.5], [34.4, 38.3],
    [33.4, 37.3], [32.2, 37.1], [31.2, 37.5], [30.8, 38.6],
  ] },
  { id: 'CAPPADOCIA', name: '加帕多家', status: 'imperial', ring: [
    [34.5, 39.5], [36.0, 40.2], [37.5, 40.0], [37.5, 37.5], [36.7, 37.7], [35.7, 37.6], [34.4, 38.3],
  ] },
  { id: 'LYCIA ET PAMPHYLIA', name: '吕家与旁非利亚', status: 'imperial', ring: [
    [27.8, 36.6], [28.9, 36.9], [30.2, 37.4], [31.2, 37.5], [32.2, 37.1], [32.6, 36.2],
    [31.0, 36.1], [29.5, 36.0], [28.3, 36.1],
  ] },
  { id: 'CILICIA', name: '基利家', status: 'imperial', ring: [
    [32.6, 36.2], [33.4, 37.3], [34.4, 38.3], [35.7, 37.6], [36.7, 37.7], [36.5, 36.7],
    [35.5, 36.5], [34.5, 36.2], [33.5, 36.0],
  ] },
  { id: 'CYPRVS', name: '居比路', status: 'senatorial', ring: [
    [32.2, 35.2], [33.6, 35.5], [34.7, 35.7], [34.4, 35.3], [33.9, 35.1], [33.7, 34.9],
    [33.0, 34.5], [32.3, 34.6],
  ] },
  { id: 'SYRIA', name: '叙利亚', status: 'imperial', ring: [
    [36.5, 36.7], [37.5, 36.9], [37.5, 32.6], [36.6, 32.5], [35.9, 33.1], [35.4, 33.3],
    [35.1, 33.9], [35.4, 34.6], [35.8, 35.5], [36.0, 36.2],
  ] },
  { id: 'IVDAEA', name: '犹太', status: 'imperial', ring: [
    [34.9, 33.1], [35.6, 33.0], [35.7, 32.4], [35.6, 31.4], [35.4, 30.9], [34.9, 31.2],
    [34.3, 31.6], [34.6, 32.5],
  ] },
  { id: 'ARABIA NABATAEA', name: '拿巴天', status: 'client', ring: [
    [35.4, 30.9], [35.6, 31.4], [35.7, 32.4], [36.6, 32.5], [37.5, 32.6], [37.5, 30.0],
    [34.9, 30.0], [35.1, 30.5],
  ] },
  { id: 'AEGYPTVS', name: '埃及', status: 'imperial', ring: [
    [24.4, 31.7], [29.0, 31.6], [32.0, 31.3], [34.2, 31.3], [34.0, 29.8], [24.4, 29.8],
  ] },
  { id: 'CRETA', name: '革哩底', status: 'senatorial', ring: [
    [23.4, 35.7], [25.0, 35.5], [26.4, 35.4], [26.1, 34.9], [24.8, 34.8], [23.5, 35.1],
  ] },
  { id: 'CYRENAICA', name: '古利奈', status: 'senatorial', ring: [
    [19.8, 33.2], [21.9, 33.0], [23.3, 32.9], [23.4, 31.8], [21.5, 30.4], [19.5, 30.4], [19.2, 32.0],
  ] },
];

export const regionLabels: { name: string; sub: string; lon: number; lat: number }[] = [
  { name: '意大利', sub: 'ITALIA', lon: 13.2, lat: 42.1 },
  { name: '西西里', sub: 'SICILIA', lon: 14.2, lat: 37.5 },
  { name: '马其顿', sub: 'MACEDONIA', lon: 22.0, lat: 41.2 },
  { name: '亚该亚', sub: 'ACHAIA', lon: 22.3, lat: 38.4 },
  { name: '色雷斯', sub: 'THRACIA', lon: 26.2, lat: 41.9 },
  { name: '亚细亚', sub: 'ASIA', lon: 28.4, lat: 38.7 },
  { name: '庇推尼与本都', sub: 'BITHYNIA', lon: 33.0, lat: 41.2 },
  { name: '加拉太', sub: 'GALATIA', lon: 32.7, lat: 38.9 },
  { name: '加帕多家', sub: 'CAPPADOCIA', lon: 36.2, lat: 38.8 },
  { name: '吕家与旁非利亚', sub: 'LYCIA', lon: 30.2, lat: 36.8 },
  { name: '基利家', sub: 'CILICIA', lon: 34.3, lat: 37.2 },
  { name: '居比路', sub: 'CYPRUS', lon: 33.2, lat: 35.0 },
  { name: '叙利亚', sub: 'SYRIA', lon: 36.8, lat: 34.8 },
  { name: '犹太', sub: 'IUDAEA', lon: 35.0, lat: 31.6 },
  { name: '拿巴天', sub: 'ARABIA', lon: 36.6, lat: 31.0 },
  { name: '埃及', sub: 'AEGYPTUS', lon: 30.5, lat: 30.6 },
  { name: '革哩底', sub: 'CRETA', lon: 24.9, lat: 35.2 },
  { name: '古利奈', sub: 'CYRENAICA', lon: 21.6, lat: 31.9 },
];

/** Open water worth naming. Drawn on the sea plane, so no polygon is needed. */
export const seas: { name: string; sub: string; lon: number; lat: number }[] = [
  { name: '大海', sub: 'MARE INTERNVM', lon: 19.6, lat: 34.6 },
  { name: '爱琴海', sub: 'MARE AEGAEVM', lon: 25.1, lat: 38.6 },
  { name: '亚得里亚海', sub: 'MARE HADRIATICVM', lon: 18.2, lat: 41.6 },
  { name: '第勒尼安海', sub: 'MARE TYRRHENVM', lon: 12.4, lat: 39.9 },
  { name: '黑海', sub: 'PONTVS EVXINVS', lon: 33.0, lat: 42.2 },
];

export const peaks: { name: string; sub: string; lon: number; lat: number; elev: number }[] = [
  { name: '埃特纳火山', sub: 'Aetna', lon: 14.995, lat: 37.751, elev: 3357 },
  { name: '维苏威火山', sub: 'Vesuvius', lon: 14.426, lat: 40.821, elev: 1281 },
  { name: '奥林匹斯山', sub: 'Mt Olympus', lon: 22.349, lat: 40.085, elev: 2917 },
  { name: '伊达山', sub: 'Mt Ida', lon: 24.793, lat: 35.228, elev: 2456 },
  { name: '阿吉山', sub: 'Mt Argaeus', lon: 35.451, lat: 38.532, elev: 3864 },
  { name: '陶鲁斯山脉', sub: 'Taurus', lon: 33.6, lat: 37.0, elev: 3500 },
  { name: '黎巴嫩山', sub: 'Mt Lebanon', lon: 36.0, lat: 34.3, elev: 3088 },
  { name: '黑门山', sub: 'Mt Hermon', lon: 35.857, lat: 33.416, elev: 2814 },
];
