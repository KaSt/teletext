const screen = document.querySelector('#screen');
const pageNode = document.querySelector('#page');
const indicator = document.querySelector('#page-indicator');
const clockNode = document.querySelector('#clock');
const serviceNode = document.querySelector('#service');

const WIDTH = 40;
const HEIGHT = 24;
const HOME = 100;
const MIN_PAGE = 100;
const MAX_PAGE = 899;

let currentPage = HOME;
let inputBuffer = '';
let requestToken = 0;
let audioContext;
let humNode;

const colours = {
  W: '#ffffff', R: '#ff0000', G: '#00ff00', Y: '#ffff00',
  B: '#0000ff', M: '#ff00ff', C: '#00ffff', K: '#000000'
};

const esc = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;');

const pad = (text = '', width = WIDTH) => String(text).slice(0, width).padEnd(width, ' ');
const center = (text = '', width = WIDTH) => {
  const value = String(text).slice(0, width);
  const left = Math.max(0, Math.floor((width - value.length) / 2));
  return ' '.repeat(left) + value + ' '.repeat(width - left - value.length);
};
const row = (text = '', fg = 'W', bg = '') => ({ text: pad(text), fg, bg });
const blank = () => row('');

function wrap(text, width = WIDTH) {
  const words = String(text).trim().split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    if (!line) line = word;
    else if (`${line} ${word}`.length <= width) line += ` ${word}`;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

function textRows(text, fg = 'W', bg = '') {
  return wrap(text).map(line => row(line, fg, bg));
}

function normalise(lines) {
  const result = lines.slice(0, HEIGHT);
  while (result.length < HEIGHT) result.push(blank());
  return result;
}

function renderLines(lines) {
  pageNode.innerHTML = normalise(lines).map(item => {
    const fg = colours[item.fg] || colours.W;
    const bg = item.bg ? (colours[item.bg] || item.bg) : 'transparent';
    return `<span style="color:${fg};background:${bg}">${esc(item.text)}</span>`;
  }).join('');
}

function heading(page, title, fg = 'Y', bg = '') {
  return [
    row(`KAI TELEVIDEO ${String(page).padStart(3, '0')} ${title}`, fg, bg),
    row('----------------------------------------', fg)
  ];
}

function footer(left = '100 INDICE', right = '') {
  const gap = Math.max(1, WIDTH - left.length - right.length);
  return [
    row('----------------------------------------', 'B'),
    row(`${left}${' '.repeat(gap)}${right}`, 'C')
  ];
}

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

function dailyRandom(page, salt = '') {
  const d = new Date();
  const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  return mulberry32(hashString(`${key}:${page}:${salt}`));
}

const choice = (r, list) => list[Math.floor(r() * list.length)];
const number = (r, min, max) => min + Math.floor(r() * (max - min + 1));

const pages = new Map();

pages.set(100, () => normalise([
  row(' KAI TELEVIDEO - INDICE GENERALE ', 'Y', 'B'),
  row(' SERVIZIO NAZIONALE DI INFORMAZIONE ', 'W'),
  row('----------------------------------------', 'Y'),
  row("101  ULTIM'ORA", 'Y'),
  row('102  24 ORE', 'W'),
  row('103  PRIMA PAGINA', 'W'),
  row('110  PRIMO PIANO', 'W'),
  row('120  POLITICA', 'W'),
  row('130  ECONOMIA', 'W'),
  row("140  DALL'ITALIA", 'W'),
  row('150  DAL MONDO', 'W'),
  row('160  CULTURA E SPETTACOLO', 'W'),
  row('200  SPORT', 'G'),
  row('300  BORSA E FINANZA', 'G'),
  row("400  PUBBLICA UTILITA'", 'C'),
  row('500  PROGRAMMI TV E RADIO', 'C'),
  row('600  GIOCHI E TEMPO LIBERO', 'M'),
  row('700  SERVIZI SPECIALI', 'M'),
  row('800  ALMANACCO E RUBRICHE', 'Y'),
  blank(),
  row(' DIGITARE IL NUMERO DELLA PAGINA ', 'W', 'B'),
  row(' AGGIORNAMENTO CONTINUO ', 'G')
]));

const newsSections = {
  101: ["ULTIM'ORA", [
    'VERTICE CONCLUSO, ATTESO COMUNICATO',
    'TRAFFICO INTENSO SULLE AUTOSTRADE',
    'CALDO, RESTA ALTA LA TEMPERATURA',
    'TRENI, RITARDI CONTENUTI IN SERATA'
  ]],
  102: ['24 ORE', [
    'GOVERNO: RIUNIONE TERMINATA IN SERATA',
    'ESTERI: PROSEGUONO I COLLOQUI',
    'ECONOMIA: MERCATI IN LIEVE RIPRESA',
    'SPORT: ATTESA PER LE GARE DI DOMANI'
  ]],
  103: ['PRIMA PAGINA', [
    'ESTATE, GIORNATA DI GRANDE CALDO',
    'TRASPORTI: PIANO PER IL FINE SETTIMANA',
    'TELEVISIONE: QUESTA SERA FILM COMMEDIA',
    'ARCHIVI: RITROVATA UNA VECCHIA BOBINA'
  ]],
  110: ['PRIMO PIANO', ['IL PUNTO DELLA GIORNATA', 'ATTESO UN CHIARIMENTO NELLE PROSSIME ORE', 'IL DIBATTITO PROSEGUE IN PARLAMENTO']],
  120: ['POLITICA', ['CAMERA: RIPRENDONO I LAVORI', 'MAGGIORANZA, NUOVO INCONTRO', 'OPPOSIZIONI CHIEDONO UN DIBATTITO']],
  130: ['ECONOMIA', ['INDUSTRIA: PRODUZIONE IN RECUPERO', 'LAVORO: INCONTRO TRA LE PARTI', 'PREZZI: ANDAMENTO STABILE']],
  140: ["DALL'ITALIA", ['ROMA: CALDO E TRAFFICO NEL POMERIGGIO', 'MILANO: RIAPERTA LA LINEA FERROVIARIA', 'NAPOLI: PREVISTI NUOVI COLLEGAMENTI']],
  150: ['DAL MONDO', ['EUROPA: VERTICE DEI MINISTRI', 'USA: ATTESO DISCORSO IN SERATA', 'MEDITERRANEO: MARE CALMO E VENTI DEBOLI']],
  160: ['CULTURA E SPETTACOLO', ['CINEMA: TORNA LA COMMEDIA ITALIANA', 'MUSICA: CONCERTO IN PIAZZA', 'TEATRO: NUOVA STAGIONE IN PREPARAZIONE']]
};

for (const [page, [title, headlines]] of Object.entries(newsSections)) {
  pages.set(Number(page), () => {
    const r = dailyRandom(Number(page), 'news');
    const lines = [...heading(Number(page), title, page == 101 ? 'Y' : 'W')];
    if (Number(page) === 101) lines.push(row(" ULTIM'ORA ", 'W', 'R'));
    for (let i = 0; i < 3; i += 1) {
      lines.push(blank(), row(choice(r, headlines), 'Y'));
      lines.push(...textRows(choice(r, [
        'Ulteriori particolari nelle prossime edizioni.',
        'Fonti informate confermano la notizia.',
        'La situazione viene seguita con attenzione.',
        'Aggiornamento previsto entro la serata.'
      ]), 'W'));
    }
    lines.push(...footer('100 INDICE', Number(page) < 160 ? `${Number(page) + 1}` : '200 SPORT'));
    return normalise(lines);
  });
}

pages.set(200, () => normalise([
  ...heading(200, 'SPORT', 'G'),
  row('201  CALCIO - NOTIZIE', 'W'),
  row('202  SERIE A', 'W'),
  row('203  SERIE B', 'W'),
  row('210  COPPE EUROPEE', 'W'),
  row('220  AUTOMOBILISMO', 'W'),
  row('230  MOTOCICLISMO', 'W'),
  row('240  TENNIS', 'W'),
  row('250  BASKET', 'W'),
  row('260  CICLISMO', 'W'),
  blank(),
  row('RISULTATI E CLASSIFICHE', 'Y'),
  row('AGGIORNAMENTO DOPO LE GARE', 'C'),
  ...footer('100 INDICE', '201 CALCIO')
]));

for (const p of [201, 202, 203, 210, 220, 230, 240, 250, 260]) {
  pages.set(p, () => {
    const r = dailyRandom(p, 'sport');
    const sports = {
      201:'CALCIO',202:'SERIE A',203:'SERIE B',210:'COPPE',220:'FORMULA UNO',230:'MOTOCICLISMO',240:'TENNIS',250:'BASKET',260:'CICLISMO'
    };
    const lines = [...heading(p, sports[p], 'G')];
    for (let i = 0; i < 4; i += 1) {
      lines.push(row(choice(r, [
        'ALLENAMENTO A PORTE CHIUSE', 'IL TECNICO CONFERMA LA FORMAZIONE',
        'PARTENZA PREVISTA DOMANI MATTINA', 'PUBBLICO NUMEROSO SUGLI SPALTI',
        'ULTIME PROVE PRIMA DELLA GARA'
      ]), i === 0 ? 'Y' : 'W'));
      lines.push(...textRows(choice(r, [
        'La squadra ha concluso la preparazione senza problemi.',
        'Il risultato resta incerto fino alle ultime battute.',
        'Gli organizzatori confermano il regolare svolgimento.',
        'Prevista una giornata favorevole per gli atleti.'
      ]), 'W'));
      lines.push(blank());
    }
    lines.push(...footer('200 SPORT', '100 INDICE'));
    return normalise(lines);
  });
}

pages.set(300, () => normalise([
  ...heading(300, 'BORSA E FINANZA', 'G'),
  row('301  CAMBI', 'W'),
  row('302  BORSA ITALIANA', 'W'),
  row('303  BORSE ESTERE', 'W'),
  row('304  TITOLI DI STATO', 'W'),
  row('305  OBBLIGAZIONI', 'W'),
  row('310  MERCATO MONETARIO', 'W'),
  row('320  MATERIE PRIME', 'W'),
  blank(),
  row('DATI INDICATIVI', 'Y'),
  row('ULTIMO AGGIORNAMENTO DISPONIBILE', 'C'),
  ...footer('100 INDICE', '301 CAMBI')
]));

pages.set(301, async () => {
  const lines = [...heading(301, 'CAMBI', 'G'), row('VALUTA              PER 1 EURO', 'W', 'B')];
  try {
    const response = await fetch('https://api.frankfurter.app/latest?from=EUR&to=USD,GBP,CHF,JPY', { signal: AbortSignal.timeout(2500) });
    const data = await response.json();
    const labels = { USD:'DOLLARO USA', GBP:'STERLINA', CHF:'FRANCO SVIZZERO', JPY:'YEN GIAPPONE' };
    for (const code of ['USD','GBP','CHF','JPY']) lines.push(row(`${labels[code].padEnd(22)}${Number(data.rates[code]).toFixed(code==='JPY'?2:4).padStart(10)}`, 'W'));
    lines.push(blank(), row(`RIFERIMENTO ${data.date}`, 'C'));
  } catch {
    const r = dailyRandom(301, 'fallback');
    for (const [name, base] of [['DOLLARO USA',1.08],['STERLINA',.85],['FRANCO SVIZZERO',.94],['YEN GIAPPONE',158]]) {
      lines.push(row(`${name.padEnd(22)}${(base + (r()-.5)*.03*base).toFixed(base>10?2:4).padStart(10)}`, 'W'));
    }
  }
  lines.push(blank(), row('DATI NON DESTINATI A OPERAZIONI', 'Y'), ...footer('300 BORSA', '100 INDICE'));
  return normalise(lines);
});

for (const p of [302,303,304,305,310,320]) {
  pages.set(p, () => {
    const r = dailyRandom(p, 'finance');
    const titles = {302:'BORSA ITALIANA',303:'BORSE ESTERE',304:'TITOLI DI STATO',305:'OBBLIGAZIONI',310:'MERCATO MONETARIO',320:'MATERIE PRIME'};
    const lines = [...heading(p, titles[p], 'G'), row('VOCE                 VALORE   VAR.', 'W', 'B')];
    const names = ['INDICE GENERALE','INDUSTRIALI','BANCARI','ASSICURATIVI','BOT 12 MESI','CCT','ORO','PETROLIO'];
    for (let i=0;i<7;i++) {
      const v = number(r, 72, 9987) / (i<4?10:100);
      const ch = (r()-.5)*3;
      lines.push(row(`${choice(r,names).padEnd(20)}${v.toFixed(2).padStart(9)}${ch.toFixed(2).padStart(7)}`, ch>=0?'G':'R'));
    }
    lines.push(blank(), row('CHIUSURA INDICATIVA', 'C'), ...footer('300 BORSA','100 INDICE'));
    return normalise(lines);
  });
}

pages.set(400, () => normalise([
  ...heading(400, "PUBBLICA UTILITA'", 'C'),
  row('401  NUMERI UTILI', 'W'),
  row("410  VIABILITA' E TRAFFICO", 'W'),
  row('420  TRENI E TRASPORTI', 'W'),
  row('430  FARMACIE E SANITA\'', 'W'),
  row('440  SCUOLA E UNIVERSITA\'', 'W'),
  row('450  PREVISIONI DEL TEMPO', 'W'),
  row('460  MARI E VENTI', 'W'),
  row('470  CALENDARIO', 'W'),
  blank(),
  row('SERVIZI DI PUBBLICO INTERESSE', 'Y'),
  ...footer('100 INDICE', '450 METEO')
]));

pages.set(401, () => normalise([
  ...heading(401, 'NUMERI UTILI', 'C'),
  row('CARABINIERI              112', 'W'),
  row('POLIZIA                  113', 'W'),
  row('VIGILI DEL FUOCO         115', 'W'),
  row('EMERGENZA SANITARIA      118', 'W'),
  row('SOCCORSO STRADALE        116', 'W'),
  blank(),
  row('NUMERI RIPORTATI PER RICOSTRUZIONE', 'Y'),
  row('STORICA DEL SERVIZIO.', 'Y'),
  ...footer('400 UTILITA\'', '100 INDICE')
]));

for (const [p,title] of [[410,'TRAFFICO'],[420,'TRENI'],[430,'SANITA\''],[440,'SCUOLA'],[460,'MARI E VENTI'],[470,'CALENDARIO']]) {
  pages.set(p, () => {
    const r = dailyRandom(p, 'service');
    const lines = [...heading(p,title,'C')];
    const material = {
      410:['A1: traffico regolare','A4: rallentamenti presso i caselli','Grande raccordo: circolazione intensa'],
      420:['Roma-Milano: servizio regolare','Diretto 912: ritardo 15 minuti','Coincidenze garantite nelle stazioni principali'],
      430:['Guardia medica attiva nelle ore notturne','Farmacie di turno presso i capoluoghi','Per urgenze rivolgersi ai servizi locali'],
      440:['Esami: pubblicati i calendari','Iscrizioni aperte fino a fine mese','Segreterie chiuse nel pomeriggio'],
      460:['Tirreno poco mosso','Adriatico mosso al largo','Venti deboli dai quadranti occidentali'],
      470:['Oggi il sole sorge alle 06.12','Tramonto previsto alle 20.31','Durata del giorno 14 ore e 19 minuti']
    }[p];
    for (const item of material) { lines.push(row(item.toUpperCase(), 'Y')); lines.push(...textRows(choice(r,['Situazione senza particolari difficolta\'.','Prossimo aggiornamento nelle ore serali.','Si consiglia di verificare prima della partenza.']),'W')); lines.push(blank()); }
    lines.push(...footer('400 UTILITA\'','100 INDICE'));
    return normalise(lines);
  });
}

pages.set(450, async () => {
  const lines = [...heading(450, 'PREVISIONI DEL TEMPO', 'C')];
  try {
    const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=41.9028&longitude=12.4964&current=temperature_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=Europe%2FRome&forecast_days=2', { signal: AbortSignal.timeout(2500) });
    const d = await response.json();
    lines.push(row('ROMA E ITALIA CENTRALE', 'W', 'B'));
    lines.push(row(`TEMPERATURA        ${Math.round(d.current.temperature_2m)} GRADI`, 'Y'));
    lines.push(row(`VENTO             ${Math.round(d.current.wind_speed_10m)} KM/H`, 'W'));
    lines.push(row(`MASSIMA            ${Math.round(d.daily.temperature_2m_max[0])}`, 'W'));
    lines.push(row(`MINIMA             ${Math.round(d.daily.temperature_2m_min[0])}`, 'W'));
    lines.push(blank(), ...textRows('NORD: sereno con addensamenti sui rilievi.', 'C'), ...textRows('CENTRO: caldo e ventilazione debole.', 'C'), ...textRows('SUD: cielo limpido, mari poco mossi.', 'C'));
  } catch {
    lines.push(...textRows('NORD: cielo sereno salvo temporanei addensamenti sui rilievi.', 'C'), blank(), ...textRows('CENTRO: caldo, venti deboli e locali velature.', 'C'), blank(), ...textRows('SUD: condizioni stabili e mari poco mossi.', 'C'));
  }
  lines.push(blank(), row('PREVISIONE PER LE PROSSIME 24 ORE','Y'), ...footer('400 UTILITA\'','100 INDICE'));
  return normalise(lines);
});

pages.set(500, () => normalise([
  ...heading(500, 'PROGRAMMI TV E RADIO', 'C'),
  row('501  KAIUNO', 'W'),
  row('502  KAIDUE', 'W'),
  row('503  KAITRE', 'W'),
  row('510  FILM DELLA SERA', 'W'),
  row('520  PROGRAMMI DI DOMANI', 'W'),
  row('530  RADIO', 'W'),
  row('540  FILM DELLA NOTTE', 'W'),
  blank(),
  row('ORARI SOGGETTI A VARIAZIONE', 'Y'),
  ...footer('100 INDICE', '501 KAIUNO')
]));

const schedules = {
  501:['KAIUNO',['18.00 TELEGIORNALE','18.25 GIOCO A PREMI','19.40 ALMANACCO DEL GIORNO DOPO','20.00 TELEGIORNALE','20.35 PREVISIONI DEL TEMPO','20.40 FILM: VACANZE A OSTIA','22.25 SPECIALE SERA']],
  502:['KAIDUE',['18.05 CARTONI ANIMATI','18.45 TELEFILM AMERICANO','19.35 TG2','20.15 QUIZ DEL GIOVEDI\'','21.00 SERATA SPORT','22.45 APPUNTAMENTO AL CINEMA']],
  503:['KAITRE',['18.30 GEO E NATURA','19.00 TELEGIORNALE REGIONALE','19.30 DOCUMENTARIO','20.30 CHI L\'HA VISTO?','22.15 FUORI ORARIO','00.10 NOTTE CULTURA']]
};
for (const [p,[name,items]] of Object.entries(schedules)) pages.set(Number(p), () => normalise([...heading(Number(p),name,'C'),row('ORA    PROGRAMMA','W','B'),...items.map(x=>row(x,'W')),blank(),row('PROGRAMMAZIONE INDICATIVA','Y'),...footer('500 PROGRAMMI','100 INDICE')]));

pages.set(510, () => {
  const r = dailyRandom(510,'film');
  const films = [
    ['VACANZE A OSTIA','con Jerry Cala\', Marina Suma','Italia 1991 - commedia'],
    ['IL TASSISTA DI FREGOLA','con Diego Abatantuono','Italia 1989 - commedia'],
    ['PROFESSORE IN COSTUME','con Massimo Boldi','Italia 1992 - commedia'],
    ['LIDO TERMINI','con Christian De Sica','Italia 1990 - commedia']
  ];
  const f = choice(r,films);
  return normalise([...heading(510,'FILM DELLA SERA','C'),row('21.00', 'Y'),blank(),row(center(f[0]),'Y'),blank(),...textRows(f[1],'W'),...textRows(f[2],'C'),blank(),...textRows('Equivoci, villeggianti e un albergo sul mare. Una commedia leggera per la prima serata.','W'),blank(),row('DURATA 100 MINUTI','G'),...footer('500 PROGRAMMI','100 INDICE')]);
});

for (const [p,title] of [[520,'PROGRAMMI DI DOMANI'],[530,'RADIO'],[540,'FILM DELLA NOTTE']]) pages.set(p,()=>normalise([...heading(p,title,'C'),...textRows('Programmazione in preparazione. Gli orari saranno confermati nella prossima edizione.','W'),blank(),row('22.30  MUSICA E PAROLE','Y'),row('23.15  NOTIZIARIO','W'),row('23.30  PROGRAMMA DI SERVIZIO','W'),...footer('500 PROGRAMMI','100 INDICE')]));

pages.set(600, () => normalise([
  ...heading(600, 'GIOCHI E TEMPO LIBERO', 'M'),
  row('610  LOTTO', 'W'),
  row('620  OROSCOPO', 'W'),
  row('640  ENIGMISTICA', 'W'),
  row('650  PICCOLA PUBBLICITA\'', 'W'),
  row('660  CUCINA', 'W'),
  row('670  CONSIGLI PER LA CASA', 'W'),
  blank(),
  row('RUBRICHE AGGIORNATE OGNI GIORNO', 'Y'),
  ...footer('100 INDICE', '620 OROSCOPO')
]));

pages.set(610, () => {
  const r = dailyRandom(610,'lotto');
  const wheels = ['BARI','CAGLIARI','FIRENZE','GENOVA','MILANO','NAPOLI','PALERMO','ROMA','TORINO','VENEZIA'];
  const lines=[...heading(610,'LOTTO','M'),row('RUOTA          NUMERI ESTRATTI','W','B')];
  for(const wheel of wheels.slice(0,8)) { const nums=new Set(); while(nums.size<5) nums.add(number(r,1,90)); lines.push(row(`${wheel.padEnd(12)}${[...nums].sort((a,b)=>a-b).map(n=>String(n).padStart(2,'0')).join(' ')}`,'W')); }
  lines.push(blank(),row('ESTRAZIONE SIMULATA','Y'),...footer('600 GIOCHI','100 INDICE'));
  return normalise(lines);
});

const signs = ['ARIETE','TORO','GEMELLI','CANCRO','LEONE','VERGINE','BILANCIA','SCORPIONE','SAGITTARIO','CAPRICORNO','ACQUARIO','PESCI'];
const signTone = {
  ARIETE:['iniziativa','coraggio','decisione'], TORO:['stabilita\'','concretezza','pazienza'], GEMELLI:['curiosita\'','dialogo','movimento'], CANCRO:['sensibilita\'','famiglia','intuizione'], LEONE:['energia','orgoglio','presenza'], VERGINE:['precisione','ordine','prudenza'], BILANCIA:['equilibrio','intesa','armonia'], SCORPIONE:['determinazione','profondita\'','riservatezza'], SAGITTARIO:['ottimismo','viaggio','slancio'], CAPRICORNO:['costanza','responsabilita\'','risultati'], ACQUARIO:['originalita\'','amicizie','novita\''], PESCI:['immaginazione','dolcezza','ispirazione']
};
pages.set(620,()=>normalise([...heading(620,'OROSCOPO','M'),...signs.map((s,i)=>row(`${621+i}  ${s}`,'W')),...footer('600 GIOCHI','100 INDICE')]));
for(let i=0;i<signs.length;i++) {
  const p=621+i, sign=signs[i];
  pages.set(p,()=>{
    const r=dailyRandom(p,'horoscope');
    const tone=choice(r,signTone[sign]);
    const intro=choice(r,[
      `La tua ${tone} trova finalmente spazio.`,
      `Una giornata favorevole alla ${tone}.`,
      `La ${tone} ti aiuta a chiarire una situazione.`
    ]);
    const second=choice(r,[
      'Un progetto lasciato in sospeso riprende vita.',
      'Una telefonata porta una notizia rassicurante.',
      'Buona intesa con una persona conosciuta da tempo.',
      'Una piccola scelta pratica migliora la giornata.'
    ]);
    const advice=choice(r,[
      'CONSIGLIO: non disperdere le energie.',
      'CONSIGLIO: ascolta prima di decidere.',
      'CONSIGLIO: proteggi il tempo per te.',
      'CONSIGLIO: concludi cio\' che hai iniziato.'
    ]);
    return normalise([...heading(p,sign,'M'),row(` ${sign} `,'K','M'),blank(),...textRows(intro,'Y'),blank(),...textRows(second,'W'),...textRows(advice,'C'),blank(),row(`AMORE       ${number(r,6,9)}/10`,'W'),row(`LAVORO      ${number(r,6,9)}/10`,'W'),row(`FORTUNA     ${number(r,6,9)}/10`,'W'),blank(),row(`NUMERO      ${number(r,1,90)}`,'G'),...footer('620 OROSCOPO','600 GIOCHI')]);
  });
}

pages.set(640,()=>normalise([...heading(640,'ENIGMISTICA','M'),row('INDOVINELLO DEL GIORNO','Y'),blank(),...textRows('Ha pagine ma non e\' un libro. Ha numeri ma non fa calcoli. Che cosa e\'?','W'),blank(),row('SOLUZIONE A PAGINA 641','C'),...footer('600 GIOCHI','100 INDICE')]));
pages.set(641,()=>normalise([...heading(641,'SOLUZIONE','M'),blank(),row(center('IL TELEVIDEO'),'Y'),blank(),...footer('640 ENIGMISTICA','600 GIOCHI')]));
pages.set(650,()=>normalise([...heading(650,'PICCOLA PUBBLICITA\'','M'),...textRows('VENDO TELEVISORE COLORI 21 POLLICI CON TELEVIDEO. TELECOMANDO INCLUSO.','W'),blank(),...textRows('CERCO MANUALE COMMODORE 64. OFFRO CASSETTE E JOYSTICK.','W'),blank(),...textRows('RIPARAZIONI RADIO E TELEVISORI. PREVENTIVO GRATUITO.','W'),...footer('600 GIOCHI','100 INDICE')]));
pages.set(660,()=>normalise([...heading(660,'CUCINA','M'),row('PASTA FREDDA ESTIVA','Y'),...textRows('Cuocere la pasta, raffreddarla e unire pomodoro, olive, basilico e mozzarella.','W'),blank(),row('TEMPO: 25 MINUTI','C'),...footer('600 GIOCHI','100 INDICE')]));
pages.set(670,()=>normalise([...heading(670,'CONSIGLI PER LA CASA','M'),...textRows('Nelle ore piu\' calde tenere chiuse persiane e tende. Aprire le finestre nelle ore serali.','W'),blank(),...textRows('Per il televisore lasciare spazio libero dietro il mobile.','C'),...footer('600 GIOCHI','100 INDICE')]));

pages.set(700,()=>normalise([...heading(700,'SERVIZI SPECIALI','M'),row('701  COMPUTER','W'),row('710  VIDEOGIOCHI','W'),row('720  MERCATINO','W'),row('730  BBS E MODEM','W'),row('740  RADIOAMATORI','W'),row('750  POSTA DEI LETTORI','W'),row('777  SOTTOTITOLI','Y'),blank(),row('ALCUNE PAGINE NON SONO IN INDICE','C'),...footer('100 INDICE','777 SERVIZIO')]));
const special = {
  701:['COMPUTER',['Nuovi programmi per home computer','Memorie e dischetti in offerta','Salvare sempre una seconda copia']],
  710:['VIDEOGIOCHI',['Avventure per console portatili','I migliori giochi da sala','Sfida al punteggio della settimana']],
  720:['MERCATINO',['Vendo Game Boy con Tetris','Cerco cartucce usate','Scambio riviste informatiche']],
  730:['BBS E MODEM',['Collegamento serale dalle 22','Velocita\' 2400 baud','Lasciare un messaggio al gestore']],
  740:['RADIOAMATORI',['Bollettino delle frequenze','Ascolti in onde corte','Prove tecniche nel fine settimana']],
  750:['POSTA DEI LETTORI',['Scrivete alla redazione KAI','Le lettere possono essere abbreviate','Non si restituiscono i manoscritti']]
};
for(const [p,[title,items]] of Object.entries(special)) pages.set(Number(p),()=>normalise([...heading(Number(p),title,'M'),...items.flatMap((x,i)=>[row(x.toUpperCase(),i===0?'Y':'W'),...textRows('Servizio a cura della redazione. Ulteriori informazioni nelle prossime pagine.','W'),blank()]),...footer('700 SERVIZI','100 INDICE')]));

pages.set(777,()=>normalise([...heading(777,'SOTTOTITOLI','Y'),row('PROGRAMMI SOTTOTITOLATI','W','B'),row('501  KAIUNO ORE 20.40','W'),row('502  KAIDUE ORE 21.00','W'),row('503  KAITRE ORE 20.30','W'),blank(),...textRows('Per attivare i sottotitoli selezionare la pagina indicata dal programma.','C'),blank(),row('SERVIZIO SPERIMENTALE','Y'),...footer('700 SERVIZI','100 INDICE')]));

pages.set(800,()=>normalise([...heading(800,'ALMANACCO E RUBRICHE','Y'),row('801  IL GIORNO','W'),row('810  OGGI NELLA STORIA','W'),row('820  CINEMA','W'),row('830  APPUNTAMENTI','W'),row('840  NATURA','W'),row('850  VIAGGI','W'),row('860  SCIENZA','W'),row('873  SEGNALE','C'),...footer('100 INDICE','801 IL GIORNO')]));
for(const [p,title,text] of [
  [801,'IL GIORNO','Alba, tramonto e ricorrenze del giorno.'],[810,'OGGI NELLA STORIA','Un avvenimento del passato ricordato dalla redazione.'],[820,'CINEMA','Film in programmazione nelle principali citta\'.'],[830,'APPUNTAMENTI','Mostre, concerti e manifestazioni.'],[840,'NATURA','Curiosita\' su animali e ambiente.'],[850,'VIAGGI','Itinerari italiani per il fine settimana.'],[860,'SCIENZA','Notizie dal mondo della ricerca.']
]) pages.set(p,()=>normalise([...heading(p,title,'Y'),...textRows(text,'W'),blank(),...textRows('La rubrica viene aggiornata quotidianamente.','C'),blank(),row('PROSSIMA EDIZIONE DOMANI','G'),...footer('800 ALMANACCO','100 INDICE')]));

pages.set(873,()=>{
  const rare=dailyRandom(873,'signal')()>.72;
  return normalise([...heading(873,'SEGNALE','C'),blank(),blank(),blank(),row(center(rare?'BENTORNATO, KA.':'NESSUN SEGNALE'),rare?'Y':'W'),blank(),row(center(rare?'IL RICEVITORE E\' ANCORA CALDO':'ATTENDERE PREGO'),'C'),blank(),blank(),row(center(rare?'642':''),'G'),...footer('100 INDICE')]);
});

pages.set(899,()=>normalise([...heading(899,'INFORMAZIONI','C'),row('SERVIZIO KAI TELEVIDEO','Y'),blank(),row('TRASMISSIONE CONTINUA','W'),row('AGGIORNAMENTO AUTOMATICO','W'),row('COPERTURA NAZIONALE','W'),blank(),...textRows('Per informazioni rivolgersi alla propria emittente.','C'),blank(),row('FINE DELLA PAGINA','G'),...footer('100 INDICE')]));

function generatedPage(page) {
  const r=dailyRandom(page,'generated');
  const sections=[
    ['NOTIZIARIO','La redazione segue gli sviluppi della giornata.'],
    ['SERVIZIO REGIONALE','Notizie e comunicazioni dal territorio.'],
    ['BOLLETTINO','Informazioni aggiornate nelle prossime ore.'],
    ['ARCHIVIO','Documento trasmesso in forma ridotta.'],
    ['RUBRICA','Consigli e curiosita\' per i lettori.']
  ];
  const [title,intro]=choice(r,sections);
  return normalise([...heading(page,title,choice(r,['W','C','G','Y'])),...textRows(intro,'W'),blank(),...textRows(choice(r,[
    'La situazione non presenta particolari difficolta\'.',
    'Un aggiornamento e\' previsto nella prossima edizione.',
    'Il servizio resta disponibile durante la giornata.',
    'La comunicazione e\' stata ricevuta dalla redazione.'
  ]),'Y'),blank(),...textRows(choice(r,[
    'Per ulteriori informazioni consultare la pagina indice.',
    'I dati vengono verificati prima della trasmissione.',
    'Si invita il pubblico a seguire i successivi bollettini.'
  ]),'C'),blank(),row(`RIFERIMENTO ${100+number(r,0,799)}`,'G'),...footer('100 INDICE')]);
}

function pageExists(page) {
  if (pages.has(page)) return true;
  const bands = [[104,199],[204,299],[306,399],[402,499],[504,599],[601,699],[702,799],[802,899]];
  if (bands.some(([a,b])=>page>=a&&page<=b)) return dailyRandom(page,'exists')()>.28;
  return false;
}

function missingPage(page) {
  return normalise([...heading(page,'RICERCA PAGINA','W'),blank(),blank(),blank(),row(center('PAGINA NON TRASMESSA'),'Y'),blank(),row(center('ATTENDERE O DIGITARE UN ALTRO NUMERO'),'C'),...footer('100 INDICE')]);
}

async function resolvePage(page) {
  const factory=pages.get(page);
  if (factory) return await factory();
  return pageExists(page) ? generatedPage(page) : missingPage(page);
}

async function render(page) {
  currentPage=page;
  indicator.textContent=`P${String(page).padStart(3,'0')}`;
  renderLines(await resolvePage(page));
}

async function requestPage(page) {
  if (page<MIN_PAGE||page>MAX_PAGE) return;
  const token=++requestToken;
  indicator.textContent=`P${String(page).padStart(3,'0')}`;
  renderLines(normalise([...heading(page,'RICERCA PAGINA','W'),blank(),blank(),blank(),row(center('ATTENDERE'),'Y')]));
  const r=dailyRandom(page,'delay');
  await new Promise(resolve=>setTimeout(resolve,180+Math.floor(r()*520)));
  if(token===requestToken) await render(page);
}

function commitBuffer() {
  if(inputBuffer.length!==3) return;
  const page=Number(inputBuffer);
  inputBuffer='';
  requestPage(page);
}

function clickSound() {
  try {
    audioContext ||= new AudioContext();
    const o=audioContext.createOscillator();
    const g=audioContext.createGain();
    o.frequency.value=110;
    g.gain.setValueAtTime(.025,audioContext.currentTime);
    g.gain.exponentialRampToValueAtTime(.0001,audioContext.currentTime+.025);
    o.connect(g).connect(audioContext.destination);
    o.start(); o.stop(audioContext.currentTime+.03);
  } catch {}
}

function toggleHum() {
  try {
    audioContext ||= new AudioContext();
    if(humNode) { humNode.stop(); humNode=null; return; }
    const o=audioContext.createOscillator();
    const g=audioContext.createGain();
    o.type='sine'; o.frequency.value=50; g.gain.value=.012;
    o.connect(g).connect(audioContext.destination); o.start(); humNode=o;
  } catch {}
}

function handleKey(event) {
  if(/^[0-9]$/.test(event.key)) {
    inputBuffer=(inputBuffer+event.key).slice(-3);
    indicator.textContent=`P${inputBuffer.padEnd(3,'-')}`;
    clickSound();
    if(inputBuffer.length===3) setTimeout(commitBuffer,100);
    event.preventDefault(); return;
  }
  switch(event.key) {
    case 'Enter': commitBuffer(); break;
    case 'ArrowLeft': requestPage(Math.max(MIN_PAGE,currentPage-1)); break;
    case 'ArrowRight': requestPage(Math.min(MAX_PAGE,currentPage+1)); break;
    case 'h': case 'H': requestPage(HOME); break;
    case 'c': case 'C': screen.classList.toggle('crt'); break;
    case 'm': case 'M': toggleHum(); break;
    case 'Escape': inputBuffer=''; indicator.textContent=`P${currentPage}`; break;
    default: return;
  }
  event.preventDefault();
}

document.addEventListener('keydown',handleKey);
screen.addEventListener('click',()=>screen.focus());
serviceNode.textContent='KAI TEXT';

function tick() {
  const now=new Date();
  clockNode.textContent=now.toLocaleTimeString('it-IT',{hour12:false});
}
setInterval(tick,1000); tick();
screen.classList.add('crt');
render(HOME);
screen.focus();
