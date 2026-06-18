const BAD_WORDS = [
  // Nazi terminology & hate speech
  'nazi', 'hitler', 'sieg heil', 'heil hitler', 'hakenkreuz', 'swastika', 'gaskammer', 'holocaust', 'nsdap', 'vergasen', 'juden', 'neger', 'nigger',
  // German insults & vulgarities
  'analritter', 'arsch', 'arschficker', 'arschlecker', 'arschkriecher', 'arschloch', 'bastard', 'bimbo', 'bratze', 'bumsen', 'depp', 'dödel', 'drecksack', 'dreckssau', 'dreckstück', 'flittchen', 'fotze', 'fotzenlecker', 'fratze', 'hackfresse', 'hure', 'hurensohn', 'hurentochter', 'idiot', 'ische', 'kackbratze', 'kacke', 'kacken', 'kackvogel', 'kackwurst', 'kampflesbe', 'kanake', 'kimme', 'luder', 'lümmel', 'miststueck', 'miststück', 'morchel', 'morgenlatte', 'möse', 'mufti', 'muschi', 'nackt', 'nutte', 'onanieren', 'penis', 'pimmel', 'pisser', 'pissnelke', 'popel', 'pussy', 'sackgesicht', 'sau', 'schlampe', 'scheisse', 'scheiße', 'scheisskopf', 'schwachkopf', 'spacko', 'spast', 'spasti', 'titten', 'tunte', 'vollidiot', 'vollpfosten', 'vorspiel', 'wichser', 'wixxer', 'wichsgesicht',
  // English common profanities
  'fuck', 'fucking', 'shit', 'bitch', 'asshole', 'cunt', 'motherfucker', 'faggot', 'whore', 'bastard', 'crap', 'dick', 'cock', 'blowjob'
];

function compileWordToRegex(word: string): RegExp {
  const charPatterns = Array.from(word.toLowerCase()).map((char) => {
    switch (char) {
      case 'a': return '[aA4@äÄ]';
      case 'b': return '[bB8]';
      case 'c': return '[cC]';
      case 'd': return '[dD]';
      case 'e': return '[eE3]';
      case 'f': return '[fF]';
      case 'g': return '[gG69]';
      case 'h': return '[hH]';
      case 'i': return '[iI1!|]';
      case 'j': return '[jJ]';
      case 'k': return '[kK]';
      case 'l': return '[lL1|]';
      case 'm': return '[mM]';
      case 'n': return '[nN]';
      case 'o': return '[oO0öÖ]';
      case 'p': return '[pP]';
      case 'q': return '[qQ]';
      case 'r': return '[rR]';
      case 's': return '[sS5\\$]';
      case 't': return '[tT7]';
      case 'u': return '[uUüÜvV]';
      case 'v': return '[vVuU]';
      case 'w': return '[wW]';
      case 'x': return '[xX]';
      case 'y': return '[yY]';
      case 'z': return '[zZ2]';
      case 'ä': return '[äÄaA4@]';
      case 'ö': return '[öÖoO0]';
      case 'ü': return '[üÜuUvV]';
      case 'ß': return '(ß|[sS][sS]|5{2}|\\${2})';
      case ' ': return '\\s+';
      default:
        // Escape special regex characters
        return char.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    }
  });

  // Join the character patterns with an optional separator (spaces, dashes, dots, underscores, etc.)
  const pattern = charPatterns.join('[-_.*~\\s]*');
  return new RegExp(pattern, 'gi');
}

const COMPILED_BAD_WORDS = BAD_WORDS.map(compileWordToRegex);

/**
 * Censers any inappropriate words, replacing them with asterisks (*).
 * Performs case-insensitive matching supporting leetspeak and common obfuscations.
 */
export function censorText(text: string): string {
  if (!text) return '';
  let censored = text;
  
  COMPILED_BAD_WORDS.forEach((regex) => {
    try {
      censored = censored.replace(regex, (match) => '*'.repeat(match.length));
    } catch (e) {
      // Fallback if regex fails
    }
  });
  
  return censored;
}

/**
 * Checks if a given text contains any bad words.
 */
export function containsBadWords(text: string): boolean {
  if (!text) return false;
  return COMPILED_BAD_WORDS.some((regex) => {
    regex.lastIndex = 0;
    return regex.test(text);
  });
}


