const screen = document.querySelector('#screen');
const pageNode = document.querySelector('#page');
const indicator = document.querySelector('#page-indicator');
const clockNode = document.querySelector('#clock');

const WIDTH = 40;
const HEIGHT = 24;
const HOME = 100;
const MIN_PAGE = 100;
const MAX_PAGE = 899;

let currentPage = HOME;
let inputBuffer = '';
let requestToken = 0;

const pad = (text = '', width = WIDTH) => String(text).slice(0, width).padEnd(width, ' ');
const center = (text = '', width = WIDTH) => {
  const value = String(text).slice(0, width);
  const left = Math.max(0, Math.floor((width - value.length) / 2));
  return ' '.repeat(left) + value + ' '.repeat(width - left - value.length);
};
const rule = (char = '━') => char.repeat(WIDTH);
const blank = () => ' '.repeat(WIDTH);

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  return () => {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dailyRandom(pageNumber, salt = '') {
  const now = new Date();
  const dateKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  return mulberry32(hashString(`${dateKey}:${pageNumber}:${salt}`));
}

function choice(random, values) {
  return values[Math.floor(random() * values.length)];
}

function pageExists(pageNumber) {
  if (STATIC_PAGES.has(pageNumber)) return true;
  if ([200, 201, 300, 301, 400, 500, 600, 700, 777, 800, 873, 899].includes(pageNumber)) return true;
  const random = dailyRandom(pageNumber, 'existence');
  return random() > 0.78;
}

function normalise(lines) {
  const clipped = lines.slice(0, HEIGHT).map(line => pad(line));
  while (clipped.length < HEIGHT) clipped.push(blank());
  return clipped.join('\n');
}

const STATIC_PAGES = new Map([
  [100, () => normalise([
    'KA TEXT 100            INDEX',
    rule('═'),
    '',
    center('WELCOME TO KA TEXT'),
    center('THE QUIET PART OF THE SIGNAL'),
    '',
    '  NEWS & INFORMATION .......... 200',
    '  WEATHER ..................... 300',
    '  TELEVISION .................. 400',
    '  CLASSIFIEDS ................. 500',
    '  GAMES & PUZZLES ............. 600',
    '  ENGINEERING / COMPUTERS ..... 700',
    '  NIGHT SERVICE ............... 800',
    '',
    '  Type any three-digit page number.',
    '  Some pages are not listed.',
    '',
    rule('─'),
    '  Today: pages may appear or vanish.',
    '  This service remembers discoveries.',
    '',
    '  PAGE 101  About this service',
    '  PAGE 199  Pages you discovered',
    '',
  ])],
  [101, () => normalise([
    'KA TEXT 101            ABOUT',
    rule('═'),
    '',
    'This is a wholly static Teletext world.',
    '',
    'There is no server-side database and no',
    'live generator. Daily pages are produced',
    'in your browser from deterministic seeds.',
    '',
    'A page can therefore be identical for all',
    'visitors today, yet different tomorrow.',
    '',
    'Nothing here requires an account.',
    'Discoveries remain only in local storage.',
    '',
    'The service is inspired by afternoons spent',
    'searching numbered pages before the web.',
    '',
    rule('─'),
    '100 INDEX                   199 DISCOVERED',
  ])],
  [199, discoveredPage],
  [200, newsPage],
  [201, oddNewsPage],
  [300, weatherPage],
  [301, continentalWeatherPage],
  [400, televisionPage],
  [500, classifiedsPage],
  [600, gamesPage],
  [700, computerPage],
  [777, anomalyPage],
  [800, nightPage],
  [873, signalPage],
  [899, servicePage],
]);

function discoveredPage() {
  const discovered = JSON.parse(localStorage.getItem('ka-text-discovered') || '[]');
  const sorted = [...new Set(discovered)].sort((a, b) => a - b);
  const lines = [
    'KA TEXT 199       DISCOVERED PAGES',
    rule('═'),
    '',
  ];
  if (!sorted.length) {
    lines.push('No unlisted pages discovered yet.');
    lines.push('');
    lines.push('Try numbers that are not in the index.');
  } else {
    lines.push(`You have found ${sorted.length} unlisted page${sorted.length === 1 ? '' : 's'}.`);
    lines.push('');
    for (let row = 0; row < 12; row += 1) {
      const chunk = sorted.slice(row * 5, row * 5 + 5);
      if (!chunk.length) break;
      lines.push(chunk.map(number => String(number).padStart(3, '0')).join('    '));
    }
  }
  lines.push('', rule('─'), '100 INDEX');
  return normalise(lines);
}

function newsPage() {
  const random = dailyRandom(200, 'news');
  const places = ['Rome', 'Madrid', 'Luxembourg', 'Turin', 'Granada', 'Valencia'];
  const objects = ['public clock', 'weather balloon', 'telephone box', 'tram bell', 'library card'];
  return normalise([
    'KA TEXT 200             NEWS',
    rule('═'),
    '',
    `${choice(random, places).toUpperCase()}: AFTERNOON HEAT CONTINUES`,
    'Officials advise shade, water and patience.',
    '',
    'LOCAL ARCHIVE FINDS UNLABELLED TAPE',
    `Recording may concern a missing ${choice(random, objects)}.`,
    '',
    'NIGHT TRAIN ARRIVES THREE MINUTES EARLY',
    'Passengers report no lasting consequences.',
    '',
    'SMALL VICTORIES',
    'A balcony plant produced one new leaf.',
    'A lost screw was found under a cabinet.',
    '',
    rule('─'),
    '201 ODD NEWS              100 INDEX',
  ]);
}

function oddNewsPage() {
  const random = dailyRandom(201, 'odd');
  const hours = 2 + Math.floor(random() * 8);
  return normalise([
    'KA TEXT 201         ODD NEWS',
    rule('═'),
    '',
    'UNUSED CHANNEL HUMS FOR SEVERAL MINUTES',
    `Engineers logged the sound at 0${hours}:17.`,
    '',
    'PIGEON REFUSES TO LEAVE BUS TERMINUS',
    'Witnesses describe its position as official.',
    '',
    'TELETEXT PAGE REPORTED BEFORE BROADCAST',
    'The page number was omitted from the report.',
    '',
    'NO FURTHER INFORMATION IS AVAILABLE.',
    '',
    rule('─'),
    '200 NEWS                  100 INDEX',
  ]);
}

function weatherPage() {
  const random = dailyRandom(300, 'weather');
  const cities = ['LUXEMBOURG', 'ROME', 'MADRID', 'FREILA', 'LONDON', 'MAASTRICHT'];
  const lines = ['KA TEXT 300          WEATHER', rule('═'), '', 'CITY             NOW    LATER', ''];
  for (const city of cities) {
    const temperature = 15 + Math.floor(random() * 22);
    const later = temperature - 3 + Math.floor(random() * 7);
    lines.push(`${city.padEnd(16)}${String(temperature).padStart(2)}C    ${String(later).padStart(2)}C`);
  }
  lines.push('', 'OUTLOOK', 'Warm pixels, isolated static after dusk.', '', rule('─'), '301 EUROPE                100 INDEX');
  return normalise(lines);
}

function continentalWeatherPage() {
  return normalise([
    'KA TEXT 301      EUROPEAN OUTLOOK',
    rule('═'),
    '',
    'NORTH      Cloud moving east overnight.',
    'WEST       Dry, except where it is not.',
    'CENTRAL    Clear intervals between signals.',
    'SOUTH      Very warm. Shutters recommended.',
    '',
    'SEA STATE  Moderately blue.',
    '',
    'Long-range forecast confidence: decorative.',
    '',
    rule('─'),
    '300 WEATHER               100 INDEX',
  ]);
}

function televisionPage() {
  const random = dailyRandom(400, 'tv');
  const films = ['THE LAST SATELLITE', 'SUMMER AT PLATFORM 4', 'A ROOM WITH NO NUMBER', 'THE BLUE CARTRIDGE'];
  return normalise([
    'KA TEXT 400       TELEVISION TONIGHT',
    rule('═'),
    '',
    '20:00  NEWS WITHOUT URGENCY',
    '20:25  WEATHER MAP AND SYNTH MUSIC',
    `20:35  FILM: ${choice(random, films)}`,
    '22:12  CLOSEDOWN ANNOUNCEMENT',
    '22:15  TEST CARD / MUSIC',
    '',
    'CHANNEL 2',
    '20:10  REPEAT OF SOMETHING FAMILIAR',
    '21:00  PHONE-IN: IS THE SIGNAL BETTER?',
    '',
    rule('─'),
    '100 INDEX',
  ]);
}

function classifiedsPage() {
  const random = dailyRandom(500, 'ads');
  const prices = [25, 40, 75, 120, 399];
  return normalise([
    'KA TEXT 500          CLASSIFIEDS',
    rule('═'),
    '',
    'FOR SALE: 14-INCH COLOUR TELEVISION',
    `Remote missing. Picture honest. ${choice(random, prices)} EUR`,
    '',
    'WANTED: INSTRUCTION BOOK FOR OLD MODEM',
    'Will exchange two blank cassettes.',
    '',
    'COMPUTER REPAIRS WHILE YOU WAIT',
    'Waiting time depends on computer.',
    '',
    'FOUND: SMALL BRASS KEY NEAR PAGE 642',
    'Describe the lock to claim.',
    '',
    rule('─'),
    '100 INDEX',
  ]);
}

function gamesPage() {
  const random = dailyRandom(600, 'game');
  const a = 10 + Math.floor(random() * 80);
  const b = 10 + Math.floor(random() * 80);
  return normalise([
    'KA TEXT 600        GAMES & PUZZLES',
    rule('═'),
    '',
    'TODAY\'S THREE-NUMBER TRAIL',
    '',
    `Start with ${a}. Add ${b}. Reverse the result.`,
    'The first three digits are a page number.',
    '',
    'Some trails lead nowhere.',
    'That does not mean they were wrong.',
    '',
    'QUICK QUIZ',
    'Which came first: the page or its number?',
    '',
    rule('─'),
    '100 INDEX',
  ]);
}

function computerPage() {
  return normalise([
    'KA TEXT 700     COMPUTERS / ENGINEERING',
    rule('═'),
    '',
    'HOME MICRO TIP',
    'Save twice before trusting a thirty-year-old',
    'battery, and verify the second copy.',
    '',
    'SOFTWARE',
    'A new browser claims to index everything.',
    'This service has declined to participate.',
    '',
    'SIGNAL DIAGNOSTICS',
    'Carrier stable. Pages mostly accounted for.',
    'Unassigned memory: 17 percent.',
    '',
    rule('─'),
    '777 DIAGNOSTIC?           100 INDEX',
  ]);
}

function anomalyPage() {
  const random = dailyRandom(777, 'anomaly');
  const messages = [
    'THE SIGNAL REMEMBERS THE LAST NUMBER.',
    'THIS PAGE WAS NOT IN YESTERDAY\'S INDEX.',
    'SOMEONE LEFT THE SERVICE RUNNING.',
    'DO NOT ADJUST THE SET.',
  ];
  return normalise([
    'KA TEXT 777       UNASSIGNED SERVICE',
    rule('═'),
    '', '',
    center(choice(random, messages)),
    '',
    center('NEXT CHECK: 873'),
    '', '',
    center('...'),
    '',
    rule('─'),
    '100 INDEX',
  ]);
}

function nightPage() {
  const hour = new Date().getHours();
  return normalise([
    'KA TEXT 800        NIGHT SERVICE',
    rule('═'),
    '',
    hour >= 22 || hour < 6 ? center('YOU ARE HERE AT THE RIGHT TIME') : center('RETURN AFTER CLOSEDOWN'),
    '',
    'Low-volume pages continue after midnight.',
    'Not every transmission appears in the index.',
    '',
    'If the room is quiet, page 873 may answer.',
    '',
    rule('─'),
    '100 INDEX',
  ]);
}

function signalPage() {
  const random = dailyRandom(873, 'signal');
  const rare = random() > 0.72;
  return normalise([
    'KA TEXT 873            SIGNAL',
    rule('═'),
    '', '', '',
    center(rare ? 'WELCOME BACK, KA.' : 'NO SIGNAL'),
    '',
    center(rare ? 'THE RECEIVER IS STILL WARM.' : 'PLEASE WAIT'),
    '', '', '',
    rare ? center('642') : blank(),
    '',
    rule('─'),
    '100 INDEX',
  ]);
}

function servicePage() {
  return normalise([
    'KA TEXT 899       SERVICE INFORMATION',
    rule('═'),
    '',
    'SERVICE: KA TEXT',
    'DELIVERY: STATIC HTML / CSS / JAVASCRIPT',
    'STORAGE: LOCAL BROWSER ONLY',
    'GENERATION: DAILY DETERMINISTIC SEEDS',
    '',
    'NO COOKIES. NO ACCOUNT. NO TRACKING CODE.',
    '',
    'If this page is visible, the service is up.',
    '',
    rule('─'),
    '100 INDEX',
  ]);
}

function generatedPage(pageNumber) {
  const random = dailyRandom(pageNumber, 'content');
  const headings = ['ARCHIVE', 'LOCAL SERVICE', 'ENGINEERING', 'COMMUNITY', 'LATE BULLETIN', 'UNFILED'];
  const fragments = [
    'A message was received without a timestamp.',
    'The office will reopen when the fan stops.',
    'One line of the original record is missing.',
    'Please retain this number for future use.',
    'The item described is no longer manufactured.',
    'No operator is currently assigned.',
    'A duplicate page was observed in another town.',
    'This notice expires at an unspecified time.',
  ];
  return normalise([
    `KA TEXT ${pageNumber} ${choice(random, headings).padStart(24)}`,
    rule('═'),
    '',
    choice(random, fragments),
    '',
    choice(random, fragments),
    '',
    choice(random, fragments),
    '',
    random() > 0.62 ? `REFERENCE: ${100 + Math.floor(random() * 800)}` : '',
    '',
    rule('─'),
    '100 INDEX',
  ]);
}

function missingPage(pageNumber) {
  return normalise([
    `KA TEXT ${pageNumber}          SEARCHING`,
    rule('═'),
    '', '', '', '', '',
    center('PAGE NOT RECEIVED'),
    '',
    center('PLEASE TRY ANOTHER NUMBER'),
    '', '', '', '',
    rule('─'),
    '100 INDEX',
  ]);
}

function remember(pageNumber) {
  if (STATIC_PAGES.has(pageNumber)) return;
  const previous = JSON.parse(localStorage.getItem('ka-text-discovered') || '[]');
  if (!previous.includes(pageNumber)) {
    previous.push(pageNumber);
    localStorage.setItem('ka-text-discovered', JSON.stringify(previous));
  }
}

function render(pageNumber) {
  currentPage = pageNumber;
  indicator.textContent = `P${pageNumber}`;
  const factory = STATIC_PAGES.get(pageNumber);
  if (factory) {
    pageNode.textContent = factory();
    return;
  }
  if (pageExists(pageNumber)) {
    remember(pageNumber);
    pageNode.textContent = generatedPage(pageNumber);
  } else {
    pageNode.textContent = missingPage(pageNumber);
  }
}

async function requestPage(pageNumber) {
  if (pageNumber < MIN_PAGE || pageNumber > MAX_PAGE) return;
  const token = ++requestToken;
  indicator.textContent = `P${String(pageNumber).padStart(3, '0')}`;
  pageNode.textContent = normalise([
    `KA TEXT ${pageNumber}          SEARCHING`,
    rule('═'), '', '', '', '', '', '', center('SEARCHING...')
  ]);
  const random = dailyRandom(pageNumber, 'delay');
  await new Promise(resolve => setTimeout(resolve, 260 + Math.floor(random() * 700)));
  if (token === requestToken) render(pageNumber);
}

function commitBuffer() {
  if (inputBuffer.length !== 3) return;
  const pageNumber = Number(inputBuffer);
  inputBuffer = '';
  requestPage(pageNumber);
}

function handleKey(event) {
  if (/^[0-9]$/.test(event.key)) {
    inputBuffer = (inputBuffer + event.key).slice(-3);
    indicator.textContent = `P${inputBuffer.padEnd(3, '–')}`;
    if (inputBuffer.length === 3) setTimeout(commitBuffer, 120);
    event.preventDefault();
    return;
  }

  switch (event.key) {
    case 'Enter': commitBuffer(); break;
    case 'ArrowLeft': requestPage(Math.max(MIN_PAGE, currentPage - 1)); break;
    case 'ArrowRight': requestPage(Math.min(MAX_PAGE, currentPage + 1)); break;
    case 'h': case 'H': requestPage(HOME); break;
    case 'c': case 'C':
      screen.classList.toggle('crt');
      localStorage.setItem('ka-text-crt', screen.classList.contains('crt') ? '1' : '0');
      break;
    case 'Escape':
      inputBuffer = '';
      indicator.textContent = `P${currentPage}`;
      break;
    default: return;
  }
  event.preventDefault();
}

function updateClock() {
  clockNode.textContent = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(new Date());
}

window.addEventListener('keydown', handleKey);
screen.addEventListener('pointerdown', () => screen.focus());
screen.classList.toggle('crt', localStorage.getItem('ka-text-crt') !== '0');
setInterval(updateClock, 1000);
updateClock();
render(HOME);
screen.focus();
