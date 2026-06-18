export const WORD_DICTIONARY: Record<string, Record<string, string[]>> = {
  stadt: {
    a: ['Amsterdam', 'Aachen', 'Augsburg', 'Aschaffenburg', 'Athen', 'Ankara', 'Algier'],
    b: ['Berlin', 'Bremen', 'Bonn', 'Bielefeld', 'Bern', 'Brüssel', 'Budapest', 'Boston'],
    c: ['Chemnitz', 'Cottbus', 'Cuxhaven', 'Chicago', 'Cairo', 'Calgary', 'Cannes'],
    d: ['Dresden', 'Dortmund', 'Düsseldorf', 'Duisburg', 'Dublin', 'Dallas', 'Dakar'],
    e: ['Erfurt', 'Essen', 'Erlangen', 'Edinburgh', 'Eindhoven', 'Eupen'],
    f: ['Frankfurt', 'Freiburg', 'Flensburg', 'Fürth', 'Florenz', 'Funchal'],
    g: ['Gera', 'Gießen', 'Göttingen', 'Genf', 'Genua', 'Glasgow', 'Göteborg'],
    h: ['Hamburg', 'Hannover', 'Heidelberg', 'Heilbronn', 'Helsinki', 'Houston', 'Havanna'],
    i: ['Ingolstadt', 'Innsbruck', 'Ibiza', 'Istanbul', 'Indianapolis', 'Incheon'],
    j: ['Jena', 'Jülich', 'Jever', 'Jakarta', 'Jerusalem', 'Johannesburg'],
    k: ['Köln', 'Kassel', 'Kiel', 'Karlsruhe', 'Kopenhagen', 'Kiew', 'Kalkutta'],
    l: ['Leipzig', 'Lübeck', 'Ludwigshafen', 'Linz', 'London', 'Lissabon', 'Lima'],
    m: ['München', 'Mainz', 'Münster', 'Mannheim', 'Madrid', 'Mailand', 'Manila'],
    n: ['Nürnberg', 'Neuss', 'Nizza', 'New York', 'Neapel', 'Nairobi', 'Neu-Delhi'],
    o: ['Offenbach', 'Osnabrück', 'Oldenburg', 'Oslo', 'Ottawa', 'Omaha', 'Orléans'],
    p: ['Potsdam', 'Paderborn', 'Pforzheim', 'Paris', 'Prag', 'Peking', 'Porto'],
    q: ['Quedlinburg', 'Quito', 'Quimper', 'Quebec', 'Qingdao', 'Quorn'],
    r: ['Rostock', 'Regensburg', 'Remscheid', 'Rom', 'Rotterdam', 'Riga', 'Riad'],
    s: ['Stuttgart', 'Schwerin', 'Solingen', 'Salzburg', 'Stockholm', 'Sydney', 'Seoul'],
    t: ['Trier', 'Tübingen', 'Tokio', 'Toronto', 'Turin', 'Tunis', 'Tiflis'],
    u: ['Ulm', 'Unna', 'Utrecht', 'Ulaanbaatar', 'Ufa', 'Uppsala'],
    v: ['Villingen', 'Venedig', 'Vancouver', 'Valencia', 'Vilnius', 'Valletta'],
    w: ['Wiesbaden', 'Wuppertal', 'Würzburg', 'Wien', 'Warschau', 'Washington', 'Wuhan'],
    x: ['Xanten', 'Xian', 'Xalapa', 'Xiamen', 'Xinyang', 'Xinzhou'],
    y: ['York', 'Yokohama', 'Yaoundé', 'Yerevan', 'Ystad', 'Yamoussoukro'],
    z: ['Zwickau', 'Zürich', 'Zagreb', 'Zug', 'Zandvoort', 'Zaragoza']
  },
  land: {
    a: ['Deutschland', 'Österreich', 'Schweiz', 'Italien', 'Frankreich', 'Spanien', 'Schweden'], // Fallback classic list
    b: ['Belgien', 'Brasilien', 'Bulgarien', 'Bolivien', 'Bahamas', 'Bangladesch'],
    c: ['China', 'Chile', 'Costa Rica', 'Curaçao', 'Chad'],
    d: ['Deutschland', 'Dänemark', 'Dominikanische Republik', 'Dschibuti', 'Dominica'],
    e: ['Estland', 'Ecuador', 'Elfenbeinküste', 'Eritrea', 'El Salvador'],
    f: ['Finnland', 'Frankreich', 'Fidschi', 'Philippinen'],
    g: ['Griechenland', 'Georgien', 'Ghana', 'Guatemala', 'Grenada', 'Gabun'],
    h: ['Haiti', 'Honduras', 'Kroatien'], // Fallback h
    i: ['Italien', 'Indien', 'Indonesien', 'Irland', 'Iran', 'Irak', 'Island'],
    j: ['Japan', 'Jamaika', 'Jemen', 'Jordanien'],
    k: ['Kanada', 'Kenia', 'Kroatien', 'Kolumbien', 'Kasachstan', 'Kuba', 'Kamerun'],
    l: ['Luxemburg', 'Lettland', 'Litauen', 'Libyen', 'Libanon', 'Laos', 'Liberia'],
    m: ['Mexiko', 'Marokko', 'Monaco', 'Madagaskar', 'Malaysia', 'Malta', 'Mazedonien'],
    n: ['Niederlande', 'Norwegen', 'Neuseeland', 'Nigeria', 'Nicaragua', 'Nepal', 'Niger'],
    o: ['Oman', 'Österreich', 'Osttimor'],
    p: ['Polen', 'Portugal', 'Peru', 'Pakistan', 'Panama', 'Paraguay', 'Palästina'],
    q: ['Katar', 'Quebec', 'Ecuador'], // Fallback q
    r: ['Rumänien', 'Russland', 'Ruanda', 'Republik Kongo'],
    s: ['Schweden', 'Spanien', 'Schweiz', 'Südafrika', 'Singapur', 'Senegal', 'Syrien'],
    t: ['Türkei', 'Thailand', 'Tschechien', 'Tunesien', 'Tansania', 'Togo', 'Tonga'],
    u: ['Ungarn', 'Ukraine', 'Uruguay', 'Uganda', 'Usbekistan', 'USA'],
    v: ['Venezuela', 'Vietnam', 'Vatikanstadt', 'Vanuatu', 'Vereinigte Arabische Emirate'],
    w: ['Weißrussland', 'Wales', 'Westsahara'],
    x: ['Mexiko', 'Luxemburg'], // Fallback x
    y: ['Zypern', 'Jemen'], // Fallback y
    z: ['Zypern', 'Zentralafrikanische Republik', 'Simbabwe', 'Sambia']
  },
  fluss: {
    a: ['Amazonas', 'Aare', 'Aller', 'Alster', 'Arno', 'Amper'],
    b: ['Brenz', 'Bega', 'Brahmaputra', 'Blue Nile', 'Bode'],
    c: ['Colorado', 'Congo', 'Chambal', 'Charente', 'Cosa'],
    d: ['Donau', 'Dnjepr', 'Drau', 'Diemel', 'Dinkel', 'Duero'],
    e: ['Elbe', 'Ems', 'Etsch', 'Euphrat', 'Eger', 'Erft'],
    f: ['Fulda', 'Fraser', 'Fils', 'Forth', 'Fuhse'],
    g: ['Ganges', 'Garonne', 'Glan', 'Gera', 'Gila'],
    h: ['Havel', 'Hudson', 'Hunte', 'Hooghly', 'Humber'],
    i: ['Inn', 'Isar', 'Ilz', 'Indus', 'Irawadi', 'Iller'],
    j: ['Jordan', 'Jumna', 'Juruá', 'Jagst', 'Jadader'],
    k: ['Kongo', 'Kama', 'Kinzig', 'Kyll', 'Kander', 'Kura'],
    l: ['Lahn', 'Loire', 'Lech', 'Lippe', 'Lena', 'Limmat'],
    m: ['Main', 'Mosel', 'Mississippi', 'Mekong', 'Maas', 'Mulde', 'Murr'],
    n: ['Nil', 'Neckar', 'Niers', 'Nahe', 'Niger', 'Nister'],
    o: ['Oder', 'Oranje', 'Oker', 'Oahu', 'Ohio', 'Oise'],
    p: ['Po', 'Pechora', 'Paraná', 'Pegnitz', 'Pene', 'Pfrimm'],
    q: ['Queich', 'Quanza', 'Quinault'],
    r: ['Rhein', 'Ruhr', 'Rhone', 'Regen', 'Rems', 'Rio Grande'],
    s: ['Spree', 'Saale', 'Sieg', 'Salzach', 'Seine', 'Stör', 'Saratow'],
    t: ['Themse', 'Tajo', 'Tiber', 'Tigris', 'Tauber', 'Teltowkanal'],
    u: ['Ural', 'Ucayali', 'Uecker', 'Unstrut', 'Ulla'],
    v: ['Volga', 'Vils', 'Vistula', 'Vardar', 'Vechte'],
    w: ['Weser', 'Wupper', 'Weichsel', 'Werra', 'Wutach', 'Wolga'],
    x: ['Xingu', 'Xiang River'],
    y: ['Yangtse', 'Yukon', 'Yonne', 'Yser'],
    z: ['Zusam', 'Ziller', 'Zambesi', 'Zaya', 'Zschopau']
  },
  vorname: {
    a: ['Anna', 'Alexander', 'Andreas', 'Amelie', 'Anton', 'Alina', 'Albert'],
    b: ['Ben', 'Benjamin', 'Barbara', 'Bastian', 'Bettina', 'Bianca', 'Bruno'],
    c: ['Christian', 'Charlotte', 'Clara', 'Chris', 'Claudia', 'Clemens', 'Carl'],
    d: ['Daniel', 'David', 'Diana', 'Dominik', 'Dennis', 'Doris', 'Dagmar'],
    e: ['Emil', 'Emma', 'Emily', 'Elias', 'Eva', 'Elena', 'Erik', 'Elisabeth'],
    f: ['Felix', 'Florian', 'Franziska', 'Fabian', 'Fiona', 'Friedrich', 'Frank'],
    g: ['Georg', 'Greta', 'Gabriel', 'Gisela', 'Gerhard', 'Gaby', 'Gregor'],
    h: ['Hannah', 'Hannes', 'Helena', 'Henry', 'Holger', 'Heike', 'Horst'],
    i: ['Isabell', 'Ida', 'Ingo', 'Irene', 'Ilona', 'Ian', 'Iris', 'Ivan'],
    j: ['Jonas', 'Julia', 'Jakob', 'Johanna', 'Julian', 'Jessica', 'Jan', 'Jürgen'],
    k: ['Katharina', 'Karl', 'Kristina', 'Klaus', 'Kevin', 'Klara', 'Konrad'],
    l: ['Lukas', 'Lena', 'Leon', 'Laura', 'Luis', 'Lisa', 'Lara', 'Lothar'],
    m: ['Marie', 'Maximilian', 'Mia', 'Moritz', 'Monika', 'Markus', 'Melanie'],
    n: ['Noah', 'Nina', 'Nico', 'Nadine', 'Niklas', 'Nele', 'Norbert', 'Nicola'],
    o: ['Oscar', 'Olivia', 'Oliver', 'Olga', 'Otto', 'Olaf', 'Oswald'],
    p: ['Paul', 'Paula', 'Peter', 'Patricia', 'Philipp', 'Petra', 'Patrick'],
    q: ['Quentin', 'Quirin', 'Querida', 'Quincy'],
    r: ['Romy', 'Robert', 'Rebecca', 'Richard', 'Rita', 'Ralf', 'René', 'Rosa'],
    s: ['Sophia', 'Sebastian', 'Sarah', 'Simon', 'Sandra', 'Stefan', 'Sabine'],
    t: ['Tobias', 'Theresa', 'Thomas', 'Tim', 'Tanja', 'Timo', 'Theo', 'Torsten'],
    u: ['Ulrich', 'Ute', 'Uwe', 'Ursula', 'Ulrike', 'Urban', 'Ulla'],
    v: ['Valentin', 'Vanessa', 'Victor', 'Verena', 'Vincent', 'Valerie', 'Vera'],
    w: ['Walter', 'Wendy', 'Wolfgang', 'Wilhelm', 'Werner', 'Wiebke', 'Willi'],
    x: ['Xaver', 'Xenia', 'Xantippe', 'Xylona'],
    y: ['Yannik', 'Yvonne', 'Yusuf', 'Yasmin', 'Yuri', 'Yvette'],
    z: ['Zacharias', 'Zoe', 'Zita', 'Zeno', 'Zarah']
  },
  tier: {
    a: ['Affe', 'Adler', 'Ameise', 'Alpaka', 'Aal', 'Antilope', 'Anemonenkrabbe'],
    b: ['Bär', 'Biber', 'Biene', 'Büffel', 'Buntspecht', 'Bussard', 'Blauwal'],
    c: ['Chamäleon', 'Chinchilla', 'Clownfisch', 'Coyote', 'Cheetah'],
    d: ['Dachs', 'Delfin', 'Dromedar', 'Drossel', 'Dingo', 'Damhirsch'],
    e: ['Esel', 'Elefant', 'Eule', 'Eidechse', 'Elch', 'Eisbär', 'Ente', 'Eichhörnchen'],
    f: ['Fuchs', 'Fledermaus', 'Frosch', 'Falke', 'Fasan', 'Flamingo', 'Forelle'],
    g: ['Giraffe', 'Gepard', 'Gorilla', 'Gans', 'Gürteltier', 'Gnu', 'Goldfisch'],
    h: ['Hund', 'Hase', 'Hamster', 'Hirsch', 'Huhn', 'Hai', 'Hyäne', 'Hummel'],
    i: ['Igel', 'Impala', 'Ibis', 'Iltis', 'Insekt'],
    j: ['Jaguar', 'Jak', 'Jack-Russell', 'Jojo-Spinne'], // Fallback j
    k: ['Katze', 'Känguru', 'Koala', 'Krokodil', 'Kamel', 'Krabbe', 'Krähe', 'Kuckuck'],
    l: ['Löwe', 'Leopard', 'Lama', 'Lachs', 'Libelle', 'Luchs', 'Lemur'],
    m: ['Maus', 'Maulwurf', 'Murmeltier', 'Möwe', 'Mücke', 'Mungo', 'Marienkäfer'],
    n: ['Nashorn', 'Nilpferd', 'Nerz', 'Nachtigall', 'Nacktschnecke'],
    o: ['Opossum', 'Otter', 'Oktopus', 'Ozelot', 'Ochse'],
    p: ['Panda', 'Pinguin', 'Pferd', 'Papagei', 'Pelikan', 'Panther', 'Pfau'],
    q: ['Qualle', 'Quokka', 'Quoll', 'Querzahnmolch'],
    r: ['Reh', 'Ratte', 'Rabe', 'Rentier', 'Raupe', 'Robbe', 'Rind', 'Rotkehlchen'],
    s: ['Schaf', 'Schlange', 'Schmetterling', 'Schwein', 'Schildkröte', 'Seepferdchen'],
    t: ['Tiger', 'Taube', 'Tintenfisch', 'Tukan', 'Truthahn', 'Tarantel'],
    u: ['Uhu', 'Unke', 'Urwildpferd', 'Urial-Schaf'],
    v: ['Vogel', 'Viper', 'Vogelspinne', 'Vampirfledermaus'],
    w: ['Wolf', 'Wal', 'Waschbär', 'Wiesel', 'Wurm', 'Wachtel', 'Wombat'],
    x: ['Xerus', 'Xenopus-Frosch'],
    y: ['Yak', 'Yorkshire-Terrier'],
    z: ['Zebra', 'Ziege', 'Zander', 'Zecke', 'Zaunkönig']
  },
  beruf: {
    a: ['Arzt', 'Anwalt', 'Apotheker', 'Architekt', 'Altenpfleger', 'Archivar'],
    b: ['Bäcker', 'Bauarbeiter', 'Busfahrer', 'Biologe', 'Bibliothekar', 'Buchhalter'],
    c: ['Chemiker', 'Chirurg', 'Coach', 'Clown', 'Chauffeur', 'Choreograf'],
    d: ['Dachdecker', 'Dolmetscher', 'Designer', 'Drucker', 'Drechsler', 'Detektiv'],
    e: ['Elektriker', 'Erzieher', 'Ergotherapeut', 'Entwickler', 'Einzelhändler'],
    f: ['Friseur', 'Fleischer', 'Florist', 'Feuerwehrmann', 'Fotograf', 'Förster'],
    g: ['Gärtner', 'Geologe', 'Grafiker', 'Goldschmied', 'Gastwirt', 'Glaser'],
    h: ['Handwerker', 'Hebamme', 'Hotelfachmann', 'Historiker', 'Heilpraktiker'],
    i: ['Informatiker', 'Ingenieur', 'Imker', 'Industriekaufmann', 'Illustrator'],
    j: ['Journalist', 'Jurist', 'Jäger', 'Jongleur', 'Juwelier'],
    k: ['Koch', 'Kellner', 'Kaufmann', 'Krankenschwester', 'Konditor', 'Künstler'],
    l: ['Lehrer', 'Logopäde', 'Lackierer', 'Landwirt', 'Lektor', 'Lokführer'],
    m: ['Maurer', 'Maler', 'Musiker', 'Mechaniker', 'Meteorologe', 'Mediziner'],
    n: ['Notar', 'Neurologe', 'Netzwerkadministrator', 'Naturkosmetiker'],
    o: ['Optiker', 'Orthopäde', 'Ozeanograf', 'Opernsänger', 'Organist'],
    p: ['Polizist', 'Pilot', 'Physiker', 'Psychologe', 'Pfarrer', 'Programmierer'],
    q: ['Qualitätsmanager', 'Quantenphysiker', 'Quereinsteiger'],
    r: ['Richter', 'Redakteur', 'Reiseverkehrskaufmann', 'Raumausstatter'],
    s: ['Schreiner', 'Schlosser', 'Schauspieler', 'Schriftsteller', 'Schornsteinfeger'],
    t: ['Tischler', 'Tierarzt', 'Taxifahrer', 'Therapeut', 'Tänzer', 'Techniker'],
    u: ['Uhrmacher', 'Unternehmensberater', 'Urologe', 'Umweltgutachter'],
    v: ['Verkäufer', 'Veterinär', 'Vermessungstechniker', 'Verwaltungsfachangestellter'],
    w: ['Webdesigner', 'Wirtschaftsprüfer', 'Wissenschaftler', 'Werbetexter'],
    x: ['Xylograf', 'Xylophonlehrer'],
    y: ['Yogalehrer', 'Yachtkapitän'],
    z: ['Zahnarzt', 'Zimmermann', 'Zoodirektor', 'Zollbeamter', 'Zeichner']
  },
  'essen/trinken': {
    a: ['Apfel', 'Ananas', 'Aprikose', 'Auflauf', 'Apfelsaft', 'Avocado', 'Amarettini'],
    b: ['Brot', 'Banane', 'Birne', 'Bier', 'Butter', 'Baguette', 'Brezel', 'Bratwurst'],
    c: ['Curry', 'Croissant', 'Cola', 'Chili', 'Champagner', 'Chips', 'Couscous'],
    d: ['Döner', 'Dattel', 'Dinkelbrot', 'Dillsoße', 'Donut', 'Dampfnudel'],
    e: ['Erdbeere', 'Ei', 'Eis', 'Eintopf', 'Espresso', 'Erbsensuppe', 'Ente kross'],
    f: ['Fisch', 'Fleisch', 'Fanta', 'Feige', 'Fladenbrot', 'Frikadelle', 'Fritten'],
    g: ['Gurke', 'Grapefruit', 'Gulasch', 'Gemüsesuppe', 'Gorgonzola', 'Gin', 'Gans'],
    h: ['Honig', 'Himbeere', 'Hähnchen', 'Hering', 'Haferflocken', 'Hotdog', 'Hugo'],
    i: ['Ingwer', 'Ingwertee', 'Indisches Curry', 'Italienische Pizza', 'Instantnudeln'],
    j: ['Joghurt', 'Johannisbeere', 'Jägermeister', 'Jambalaya', 'Jägerschnitzel'],
    k: ['Käse', 'Kartoffel', 'Kuchen', 'Kaffee', 'Kirsche', 'Kakao', 'Keks', 'Ketchup'],
    l: ['Lasagne', 'Lachs', 'Limonade', 'Litschi', 'Linsen', 'Lebkuchen', 'Lollipop'],
    m: ['Milch', 'Melone', 'Muffin', 'Marmelade', 'Müsli', 'Mandarine', 'Mango', 'Mineralwasser'],
    n: ['Nudel', 'Nuss', 'Nougat', 'Nektarine', 'Nelke', 'Nussecke'],
    o: ['Orange', 'Olive', 'Omelett', 'Orangensaft', 'Obstkuchen', 'Ochsenschwanzsuppe'],
    p: ['Pizza', 'Pommes', 'Pfirsich', 'Pflaume', 'Pilze', 'Pasta', 'Pudding', 'Pils'],
    q: ['Quark', 'Quiche', 'Quinoa', 'Quittensaft', 'Quellwasser'],
    r: ['Reis', 'Rindfleisch', 'Radieschen', 'Rotwein', 'Rhabarber', 'Rührei', 'Ravioli'],
    s: ['Salat', 'Suppe', 'Spaghetti', 'Schokolade', 'Schnitzel', 'Sekt', 'Senf', 'Sprite'],
    t: ['Tomate', 'Tee', 'Toast', 'Traube', 'Torte', 'Thunfisch', 'Tequila', 'Tofu'],
    u: ['Udon-Nudeln', 'Ukelei-Fisch', 'Ungarisches Gulasch', 'Urfrucht-Saft'],
    v: ['Vanilleeis', 'Vollkornbrot', 'Vegetarische Lasagne', 'Veltins', 'Vinaigrette'],
    w: ['Wasser', 'Wein', 'Weintraube', 'Waffel', 'Wurst', 'Walnuss', 'Whisky'],
    x: ['Xanthangummi-Gelee', 'Xilit-Kaugummi'],
    y: ['Yams-Wurzel', 'Yakitori-Spieß', 'Yoghurt-Drink'],
    z: ['Zitrone', 'Zwetschge', 'Zwiebel', 'Zander', 'Zimtstern', 'Zuckerwatte']
  }
};

// Map alternate category spellings to standard categories
const CATEGORY_MAP: Record<string, string> = {
  'stadt': 'stadt',
  'land': 'land',
  'fluss': 'fluss',
  'vorname': 'vorname',
  'name': 'vorname',
  'tier': 'tier',
  'beruf': 'beruf',
  'essen/trinken': 'essen/trinken',
  'essen': 'essen/trinken',
  'trinken': 'essen/trinken'
};

/**
 * Retrieves a random word for a given category and starting letter.
 * Supports German letters (case-insensitive).
 */
export function getRandomWord(category: string, letter: string): string | null {
  const normCat = CATEGORY_MAP[category.trim().toLowerCase()];
  const normLetter = letter.trim().toLowerCase();
  
  if (!normCat || !normLetter) return null;

  const catData = WORD_DICTIONARY[normCat];
  if (!catData) return null;

  const words = catData[normLetter];
  if (!words || words.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * words.length);
  return words[randomIndex];
}
