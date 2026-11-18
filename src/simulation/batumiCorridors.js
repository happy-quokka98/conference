export const BATUMI_CORRIDORS = [
  {
    id: 'tamar-mepe',
    name: 'თამარ მეფის გამზირი (მახინჯაური → ბათუმი)',
    description: '4.5 კმ შემოსასვლელი მაგისტრალი (E-70), 600 უჯრა',
    roadLength: 600, // 4.5 km
    vMax: 4, // 108 km/h max cell speed (urban highway)
    defaultDensity: 0.28,
    pHuman: 0.30,
    pAv: 0.02,
  },
  {
    id: 'chavchavadze-bagrationi',
    name: 'ჭავჭავაძე – ბაგრატიონის ცენტრალური ღერძი',
    description: '3.0 კმ ცენტრალური ურბანული არტერია, 400 უჯრა',
    roadLength: 400, // 3.0 km
    vMax: 3, // 81 km/h max cell speed
    defaultDensity: 0.32,
    pHuman: 0.32,
    pAv: 0.02,
  },
  {
    id: 'khimshiashvili-rustaveli',
    name: 'შ. ხიმშიაშვილი – რუსთაველის სანაპირო',
    description: '6.0 კმ სანაპირო მაგისტრალი (ტურისტული პიკი), 800 უჯრა',
    roadLength: 800, // 6.0 km
    vMax: 3, // 81 km/h max cell speed
    defaultDensity: 0.28,
    pHuman: 0.30,
    pAv: 0.02,
  },
  {
    id: 'batumi-ring',
    name: 'ბათუმის სრული ქსელური კონტური (ქალაქის მასშტაბი)',
    description: '7.5 კმ გაერთიანებული ურბანული მონაკვეთი, 1000 უჯრა',
    roadLength: 1000, // 7.5 km
    vMax: 4,
    defaultDensity: 0.26,
    pHuman: 0.30,
    pAv: 0.02,
  },
];
