export type NivelRisco = 'leve' | 'medio' | 'grave';
export type Tema =
  | 'ansiedade'
  | 'tristeza'
  | 'bullying'
  | 'luto'
  | 'estresse'
  | 'pedir_ajuda';

export interface Opcao {
  texto: string;
  peso: 1 | 2 | 3;
}

export interface Pergunta {
  id: string;
  texto: string;
  opcoes: Opcao[];
}

export const PERGUNTAS_POR_TEMA: Record<Tema, Pergunta[]> = {
  ansiedade: [
    {
      id: 'ans_1',
      texto:
        'Com que frequência você sente aquele aperto no peito, agitação ou pensamentos acelerados?',
      opcoes: [
        { texto: 'Raramente — aparece mais antes de provas ou apresentações importantes.', peso: 1 },
        { texto: 'Várias vezes por semana — está me incomodando com frequência.', peso: 2 },
        { texto: 'Todo dia — sinto uma agitação constante que não consigo controlar.', peso: 3 },
      ],
    },
    {
      id: 'ans_2',
      texto: 'A ansiedade está afetando seu corpo ou sua rotina de alguma dessas formas?',
      opcoes: [
        { texto: 'Não muito — consigo dormir e comer normalmente.', peso: 1 },
        { texto: 'Sim — estou dormindo mal, com dores de cabeça ou sem apetite.', peso: 2 },
        { texto: 'Sim — tenho crises com falta de ar, coração acelerado e sensação de desespero.', peso: 3 },
      ],
    },
    {
      id: 'ans_3',
      texto: 'Como você está se sentindo em relação às aulas e aos colegas por causa disso?',
      opcoes: [
        { texto: 'Consigo assistir às aulas e conversar com os amigos normalmente.', peso: 1 },
        { texto: 'Às vezes quero me isolar e tenho dificuldade de me concentrar.', peso: 2 },
        { texto: 'Já não tenho forças para vir à escola e tenho faltado muito por causa do medo.', peso: 3 },
      ],
    },
  ],
  tristeza: [
    {
      id: 'tri_1',
      texto: 'Há quanto tempo você está sentindo esse desânimo ou tristeza constante?',
      opcoes: [
        { texto: 'Começou há poucos dias — acho que é uma fase passageira.', peso: 1 },
        { texto: 'Já dura algumas semanas e sinto quase todos os dias.', peso: 2 },
        { texto: 'Há muitos meses que me sinto assim e parece que nunca vai passar.', peso: 3 },
      ],
    },
    {
      id: 'tri_2',
      texto:
        'Essa tristeza está afetando sua vontade de estar com as pessoas ou de fazer coisas que você gosta?',
      opcoes: [
        { texto: 'Não muito — continuo com os amigos e meus hobbies.', peso: 1 },
        { texto: 'Sim — estou me afastando um pouco e já não vejo graça nas coisas.', peso: 2 },
        { texto: 'Sim — me isolei completamente, não quero falar com ninguém.', peso: 3 },
      ],
    },
    {
      id: 'tri_3',
      texto: 'Como tem sido lidar com a escola sentindo-se assim?',
      opcoes: [
        { texto: 'Consigo prestar atenção e fazer os trabalhos, mesmo estando triste.', peso: 1 },
        { texto: 'Estou sem energia e com dificuldade de me concentrar e tirar boas notas.', peso: 2 },
        { texto: 'Não tenho mais vontade de vir à escola e tenho faltado muito.', peso: 3 },
      ],
    },
  ],
  bullying: [
    {
      id: 'bul_1',
      texto:
        'Com que frequência acontecem essas piadas ofensivas, exclusões ou ameaças?',
      opcoes: [
        { texto: 'Aconteceu uma ou duas vezes de forma isolada.', peso: 1 },
        { texto: 'Acontece com frequência — quase toda semana — e está me machucando.', peso: 2 },
        { texto: 'É uma perseguição diária — acontece todos os dias em todo lugar.', peso: 3 },
      ],
    },
    {
      id: 'bul_2',
      texto: 'Onde ou de que forma essas situações costumam acontecer?',
      opcoes: [
        { texto: 'São comentários desagradáveis ou exclusão em grupos da escola.', peso: 2 },
        { texto: 'São insultos e ataques constantes nas redes sociais (cyberbullying).', peso: 2 },
        { texto: 'Envolve ameaças diretas à minha segurança ou agressão física.', peso: 3 },
      ],
    },
    {
      id: 'bul_3',
      texto: 'Como você se sente quando está na escola por causa disso?',
      opcoes: [
        { texto: 'Fico chateado(a), mas me sinto seguro(a) na sala de aula.', peso: 1 },
        { texto: 'Estou muito desconfortável e tento evitar certos lugares ou pessoas.', peso: 2 },
        { texto: 'Sinto medo constante e pânico de vir à escola — não me sinto seguro(a) em nenhum lugar.', peso: 3 },
      ],
    },
  ],
  luto: [
    {
      id: 'lut_1',
      texto: 'Há quanto tempo aconteceu essa perda?',
      opcoes: [
        { texto: 'É muito recente — ainda estou tentando processar o choque.', peso: 2 },
        { texto: 'Já passou algum tempo, mas a dor continua igual ou está piorando.', peso: 2 },
        { texto: 'Já faz muito tempo, mas sinto um vazio tão grande que minha vida perdeu o sentido.', peso: 3 },
      ],
    },
    {
      id: 'lut_2',
      texto:
        'Você tem conseguido conversar com alguém de confiança sobre como está se sentindo?',
      opcoes: [
        { texto: 'Sim — tenho pessoas ao meu lado que me apoiam e me ouvem.', peso: 1 },
        { texto: 'Às vezes — mas sinto que não quero sobrecarregar as pessoas com minha dor.', peso: 2 },
        { texto: 'Não — me sinto completamente sozinho(a) e ninguém entende meu sofrimento.', peso: 3 },
      ],
    },
  ],
  estresse: [
    {
      id: 'est_1',
      texto: 'Você tem sentido algum desses sinais ultimamente?',
      opcoes: [
        { texto: 'Fico mais cansado(a) ou irritado(a) do que o normal, mas passa.', peso: 1 },
        { texto: 'Tenho insônia, dores de cabeça frequentes, aperto no estômago ou dores no corpo.', peso: 2 },
        { texto: 'Às vezes sinto que vou explodir — tenho crises de choro, falta de ar ou desespero.', peso: 3 },
      ],
    },
    {
      id: 'est_2',
      texto: 'O que você sente que é o principal motivo para estar assim?',
      opcoes: [
        { texto: 'A pressão das notas, provas, trabalhos ou excesso de matérias da escola.', peso: 1 },
        { texto: 'Uma mistura de pressões da escola com cobranças dos meus pais ou problemas em casa.', peso: 2 },
        { texto: 'Problemas pessoais ou familiares muito graves que não me deixam pensar em mais nada.', peso: 3 },
      ],
    },
  ],
  pedir_ajuda: [
    {
      id: 'ajuda_1',
      texto: 'Para eu saber como te ajudar agora, escolha a opção que melhor descreve seu momento:',
      opcoes: [
        { texto: 'Estou passando por uma situação difícil e gostaria de conversar com a orientação pedagógica.', peso: 2 },
        { texto: 'Eu não estou bem. Sinto que cheguei ao meu limite e preciso de ajuda urgente agora.', peso: 3 },
      ],
    },
  ],
};

export function calcularNivel(pesos: number[]): NivelRisco {
  if (pesos.includes(3)) return 'grave';
  if (pesos.includes(2)) return 'medio';
  return 'leve';
}

export const LABELS_TEMA: Record<Tema, string> = {
  ansiedade: 'Ansiedade',
  tristeza: 'Tristeza',
  bullying: 'Bullying',
  luto: 'Luto',
  estresse: 'Estresse',
  pedir_ajuda: 'Pedir ajuda',
};

export const ICONES_TEMA: Record<Tema, string> = {
  ansiedade: '😰',
  tristeza: '😔',
  bullying: '😤',
  luto: '💔',
  estresse: '😩',
  pedir_ajuda: '🆘',
};

export function isTema(value: string): value is Tema {
  return value in PERGUNTAS_POR_TEMA;
}

export function isNivel(value: string): value is NivelRisco {
  return value === 'leve' || value === 'medio' || value === 'grave';
}