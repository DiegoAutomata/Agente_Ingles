export interface VerbInfo {
  base: string
  phonetic: string
  past: string
  participle: string
  es: string
}

export interface VerbDrill {
  verbBase: string
  question: string
  options: string[]
  correct: number
  explanation: string
}

export const VERBS: VerbInfo[] = [
  { base: 'be',   phonetic: 'bi',   past: 'was / were', participle: 'been',    es: 'ser / estar' },
  { base: 'have', phonetic: 'jav',  past: 'had',        participle: 'had',     es: 'tener / haber' },
  { base: 'do',   phonetic: 'du',   past: 'did',        participle: 'done',    es: 'hacer' },
  { base: 'go',   phonetic: 'go',   past: 'went',       participle: 'gone',    es: 'ir' },
  { base: 'get',  phonetic: 'get',  past: 'got',        participle: 'gotten',  es: 'obtener / llegar' },
  { base: 'make', phonetic: 'meik', past: 'made',       participle: 'made',    es: 'hacer / fabricar' },
  { base: 'come', phonetic: 'kam',  past: 'came',       participle: 'come',    es: 'venir' },
  { base: 'take', phonetic: 'teik', past: 'took',       participle: 'taken',   es: 'tomar / llevar' },
  { base: 'give', phonetic: 'giv',  past: 'gave',       participle: 'given',   es: 'dar' },
  { base: 'say',  phonetic: 'sei',  past: 'said',       participle: 'said',    es: 'decir' },
  { base: 'see',  phonetic: 'si',   past: 'saw',        participle: 'seen',    es: 'ver' },
  { base: 'keep', phonetic: 'kiip', past: 'kept',       participle: 'kept',    es: 'mantener / guardar' },
  { base: 'put',  phonetic: 'put',  past: 'put',        participle: 'put',     es: 'poner' },
  { base: 'send', phonetic: 'send', past: 'sent',       participle: 'sent',    es: 'enviar' },
  { base: 'let',  phonetic: 'let',  past: 'let',        participle: 'let',     es: 'dejar / permitir' },
  { base: 'seem', phonetic: 'siim', past: 'seemed',     participle: 'seemed',  es: 'parecer' },
]

export const DRILLS: VerbDrill[] = [
  {
    verbBase: 'be',
    question: 'Ayer ella ___ muy cansada.',
    options: ['is', 'was', 'been', 'be'],
    correct: 1,
    explanation: 'Past simple de BE: WAS (singular) / WERE (plural). "She WAS very tired yesterday."',
  },
  {
    verbBase: 'be',
    question: 'Nosotros ___ estudiantes en esa época.',
    options: ['was', 'been', 'are', 'were'],
    correct: 3,
    explanation: 'Past simple plural: WERE. "We WERE students back then."',
  },
  {
    verbBase: 'have',
    question: 'Yo ya ___ terminado el trabajo cuando llegaste.',
    options: ['have finish', 'had finished', 'has finished', 'have finishing'],
    correct: 1,
    explanation: 'Past perfect: HAD + past participle. "I HAD FINISHED the work when you arrived."',
  },
  {
    verbBase: 'have',
    question: 'Ella ___ tres hermanos.',
    options: ['have', 'had have', 'has', 'is having'],
    correct: 2,
    explanation: 'Present simple 3ra persona: HAS. "She HAS three brothers."',
  },
  {
    verbBase: 'do',
    question: '¿Qué ___ ella ayer en el trabajo?',
    options: ['does', 'did', 'do', 'done'],
    correct: 1,
    explanation: 'DID = pasado de DO. En preguntas pasadas: DID + sujeto + verbo base. "What DID she DO?"',
  },
  {
    verbBase: 'do',
    question: 'Él ___ ejercicio todos los días.',
    options: ['did', 'do', 'does', 'done'],
    correct: 2,
    explanation: 'Present simple 3ra persona: DOES. "He DOES exercise every day."',
  },
  {
    verbBase: 'go',
    question: 'Nosotros ___ al mercado anoche.',
    options: ['go', 'goes', 'went', 'gone'],
    correct: 2,
    explanation: 'WENT = pasado de GO. "We WENT to the market last night."',
  },
  {
    verbBase: 'go',
    question: 'Ella ___ a la escuela todos los días.',
    options: ['went', 'gone', 'goes', 'going'],
    correct: 2,
    explanation: 'Present simple 3ra persona: GOES. "She GOES to school every day."',
  },
  {
    verbBase: 'get',
    question: 'Ella ___ el trabajo que quería la semana pasada.',
    options: ['gets', 'gotten', 'got', 'get'],
    correct: 2,
    explanation: 'GOT = pasado de GET. "She GOT the job she wanted last week."',
  },
  {
    verbBase: 'get',
    question: 'Normalmente yo ___ a casa a las 6.',
    options: ['got', 'gotten', 'getting', 'get'],
    correct: 3,
    explanation: 'Present simple 1ra persona: GET. "I GET home at 6." GET también significa "llegar".',
  },
  {
    verbBase: 'make',
    question: 'Mi madre ___ una torta increíble ayer.',
    options: ['makes', 'maked', 'made', 'make'],
    correct: 2,
    explanation: 'MADE = pasado de MAKE. "My mother MADE an incredible cake yesterday."',
  },
  {
    verbBase: 'make',
    question: 'Vos ___ un gran trabajo todos los días.',
    options: ['made', 'maked', 'makes', 'make'],
    correct: 3,
    explanation: 'Present simple 2da persona: MAKE. "You MAKE a great job every day."',
  },
  {
    verbBase: 'come',
    question: 'Él ___ a la fiesta muy tarde anoche.',
    options: ['comed', 'comes', 'come', 'came'],
    correct: 3,
    explanation: 'CAME = pasado de COME. "He CAME to the party very late last night."',
  },
  {
    verbBase: 'come',
    question: 'Mi amigo siempre ___ a visitarme los domingos.',
    options: ['came', 'coming', 'come', 'comes'],
    correct: 3,
    explanation: 'Present simple 3ra persona: COMES. "My friend always COMES to visit me on Sundays."',
  },
  {
    verbBase: 'take',
    question: 'Yo ___ el tren esta mañana.',
    options: ['taked', 'took', 'taken', 'take'],
    correct: 1,
    explanation: 'TOOK = pasado de TAKE. "I TOOK the train this morning."',
  },
  {
    verbBase: 'take',
    question: 'Ella siempre ___ fotos en los viajes.',
    options: ['took', 'taken', 'takes', 'taking'],
    correct: 2,
    explanation: 'Present simple 3ra persona: TAKES. "She always TAKES photos on trips."',
  },
  {
    verbBase: 'give',
    question: 'Ella le ___ un regalo a su amiga ayer.',
    options: ['gives', 'gived', 'given', 'gave'],
    correct: 3,
    explanation: 'GAVE = pasado de GIVE. "She GAVE a gift to her friend yesterday."',
  },
  {
    verbBase: 'give',
    question: 'El profesor siempre ___ mucha tarea.',
    options: ['gave', 'given', 'gives', 'give'],
    correct: 2,
    explanation: 'Present simple 3ra persona: GIVES. "The teacher always GIVES a lot of homework."',
  },
  {
    verbBase: 'say',
    question: '¿Qué ___ el profesor en la clase de ayer?',
    options: ['sayed', 'says', 'said', 'say'],
    correct: 2,
    explanation: 'SAID = pasado de SAY. "What DID the teacher SAY in yesterday\'s class?"',
  },
  {
    verbBase: 'say',
    question: 'Él siempre ___ la verdad.',
    options: ['said', 'sayed', 'say', 'says'],
    correct: 3,
    explanation: 'Present simple 3ra persona: SAYS. "He always SAYS the truth."',
  },
  {
    verbBase: 'see',
    question: 'Yo nunca ___ esa película.',
    options: ['saw', 'seen', 'have seen', 'see'],
    correct: 2,
    explanation: 'Present perfect: HAVE + SEEN (participio de SEE). "I have never SEEN that movie."',
  },
  {
    verbBase: 'see',
    question: 'Nosotros ___ a Juan ayer en el parque.',
    options: ['see', 'seen', 'saw', 'sees'],
    correct: 2,
    explanation: 'SAW = pasado de SEE. "We SAW Juan at the park yesterday."',
  },
  {
    verbBase: 'keep',
    question: 'Ella ___ practicando inglés todos los días.',
    options: ['kept', 'keep', 'keeps', 'keeping'],
    correct: 2,
    explanation: 'Present simple 3ra persona: KEEPS. "She KEEPS practicing English every day." (hábito continuo)',
  },
  {
    verbBase: 'keep',
    question: 'Yo ___ todas las cartas que me mandaste.',
    options: ['keep', 'kept', 'keeping', 'keeps'],
    correct: 1,
    explanation: 'KEPT = pasado de KEEP. "I KEPT all the letters you sent me."',
  },
  {
    verbBase: 'put',
    question: '¿Dónde ___ mis llaves anoche?',
    options: ['putted', 'puts', 'puted', 'put'],
    correct: 3,
    explanation: 'PUT es irregular pero igual en todos los tiempos: base/past/participle = PUT. "Where did I PUT my keys?"',
  },
  {
    verbBase: 'put',
    question: 'Ella siempre ___ azúcar en el café.',
    options: ['put', 'puts', 'putted', 'puting'],
    correct: 1,
    explanation: 'Present simple 3ra persona: PUTS. "She always PUTS sugar in her coffee."',
  },
  {
    verbBase: 'send',
    question: 'Yo ya le ___ el email a mi jefe.',
    options: ['sended', 'sent', 'have sent', 'send'],
    correct: 2,
    explanation: 'Present perfect: HAVE SENT (participio de SEND). "I have already SENT the email to my boss."',
  },
  {
    verbBase: 'send',
    question: 'Ella ___ una carta a sus padres la semana pasada.',
    options: ['sended', 'send', 'sends', 'sent'],
    correct: 3,
    explanation: 'SENT = pasado de SEND. "She SENT a letter to her parents last week."',
  },
  {
    verbBase: 'let',
    question: 'Mi mamá no me ___ salir anoche.',
    options: ['letted', 'lets', 'let', 'letting'],
    correct: 2,
    explanation: 'LET es irregular, igual en todos los tiempos: base/past/participle = LET. "My mom didn\'t LET me go out last night."',
  },
  {
    verbBase: 'let',
    question: '¡___ (nosotros) empezar!',
    options: ['Let', 'Lets', 'Letted', 'Letting'],
    correct: 0,
    explanation: 'LET\'S = LET US → propuesta/sugerencia. "LET\'S start!" es una de las frases más usadas en inglés.',
  },
  {
    verbBase: 'seem',
    question: 'Él ___ muy cansado hoy.',
    options: ['seem', 'seemed', 'seeming', 'seems'],
    correct: 3,
    explanation: 'Present simple 3ra persona: SEEMS. "He SEEMS very tired today." (apariencia presente)',
  },
  {
    verbBase: 'seem',
    question: 'El proyecto ___ más difícil de lo que pensábamos.',
    options: ['seems', 'seem', 'seemed', 'seeming'],
    correct: 2,
    explanation: 'SEEMED = pasado de SEEM. "The project SEEMED harder than we thought."',
  },
]
