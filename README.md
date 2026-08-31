# School Minds

# PROMPT DE DESENVOLVIMENTO COMPLETO — CHATBOT SAÚDE MENTAL NA ESCOLA
## Para usar no Lovable (lovable.dev)

---

## CONTEXTO DO PROJETO

Crie uma aplicação web PWA chamada **"Saúde Mental na Escola"** — um chatbot educacional, não clínico, de acolhimento inicial e triagem de demandas psicossociais para estudantes do ensino médio da rede pública. O app deve ser acolhedor, seguro, simples e funcionar perfeitamente em celular Android via navegador Chrome, sem instalação.

O backend usa **Supabase** (já conectado ao projeto). Toda a lógica de triagem roda no client-side em TypeScript — nenhuma resposta do aluno trafega para o servidor.

---

## STACK OBRIGATÓRIA

- React 18 + TypeScript + Tailwind CSS (já configurados pelo Lovable)
- React Router DOM para navegação entre telas
- Supabase JS Client para banco de dados e Realtime
- Fonte: **Nunito** (Google Fonts) — acolhedora, arredondada, legível para jovens
- Tamanho mínimo de fonte: 16px em todo o app
- Paleta de cores (usar como variáveis CSS):
  - `--cor-primaria: #1B6CA8` (azul confiança)
  - `--cor-secundaria: #2ECC71` (verde acolhimento)
  - `--cor-alerta: #E67E22` (laranja atenção)
  - `--cor-crise: #E74C3C` (vermelho urgência)
  - `--cor-fundo: #F0F7FF` (azul muito claro)
  - `--cor-texto: #1A2B3C` (quase preto)
  - `--cor-texto-leve: #5D7A8A` (cinza azulado)

---

## ARQUITETURA DE ARQUIVOS

Crie a seguinte estrutura de arquivos:

```
src/
├── lib/
│   ├── supabaseClient.ts       ← cliente Supabase
│   └── triagem.ts              ← motor de triagem (sem chamadas de API)
├── pages/
│   ├── Privacidade.tsx         ← Tela 1
│   ├── MenuTemas.tsx           ← Tela 2
│   ├── Perguntas.tsx           ← Tela 3
│   ├── RespostaLeve.tsx        ← Tela 4
│   ├── RespostaMedio.tsx       ← Tela 5
│   ├── RespostaGrave.tsx       ← Tela 6
│   └── Painel.tsx              ← Tela 7 (painel escolar)
├── components/
│   ├── ChatBubble.tsx          ← bolha de mensagem do bot
│   ├── BotaoTema.tsx           ← botão de tema do menu
│   ├── BotaoOpcao.tsx          ← botão de resposta da triagem
│   ├── CardContato.tsx         ← card de contato de crise
│   ├── ProgressoPerguntas.tsx  ← barra de progresso
│   └── AlertaRealtime.tsx      ← toast de alerta ao painel
├── App.tsx                     ← rotas principais
└── main.tsx
```

---

## ARQUIVO 1: src/lib/triagem.ts

Crie este arquivo com tipagem TypeScript completa:

```typescript
export type NivelRisco = 'leve' | 'medio' | 'grave';
export type Tema = 'ansiedade' | 'tristeza' | 'bullying' | 'luto' | 'estresse' | 'pedir_ajuda';

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
      texto: 'Com que frequência você sente aquele aperto no peito, agitação ou pensamentos acelerados?',
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
      texto: 'Essa tristeza está afetando sua vontade de estar com as pessoas ou de fazer coisas que você gosta?',
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
      texto: 'Com que frequência acontecem essas piadas ofensivas, exclusões ou ameaças?',
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
      texto: 'Você tem conseguido conversar com alguém de confiança sobre como está se sentindo?',
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
```

---

## ARQUIVO 2: src/lib/supabaseClient.ts

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

## ARQUIVO 3: src/App.tsx — ROTAS

Configure o React Router com estas rotas:

```
/                    → Privacidade.tsx
/temas               → MenuTemas.tsx
/triagem/:tema       → Perguntas.tsx
/resultado/leve      → RespostaLeve.tsx
/resultado/medio     → RespostaMedio.tsx
/resultado/grave     → RespostaGrave.tsx
/painel              → Painel.tsx (rota protegida — redireciona para /painel/login se não autenticado)
/painel/login        → formulário de login Supabase Auth
```

O estado compartilhado entre telas (tema escolhido, pesos das respostas) deve ser passado via `useNavigate` com `state` do React Router. Não usar localStorage.

---

## TELA 1: Privacidade.tsx

**Rota:** `/`

**Layout:** centralizado, padding 24px, fundo `var(--cor-fundo)`.

**Elementos obrigatórios (de cima para baixo):**

1. Ícone de coração ou abraço (emoji 🤝 ou SVG) — 48px — cor primária
2. Título: **"Saúde Mental na Escola"** — fonte Nunito 28px bold — cor primária
3. Subtítulo: *"Estou aqui para te ouvir"* — 16px — cor-texto-leve
4. Card com borda esquerda 4px cor-primária, fundo branco, border-radius 12px, padding 20px, contendo:
   - Ícone 🔒 + texto bold: "Tudo o que conversarmos aqui é seguro e confidencial."
   - Quebra de linha
   - Texto normal: "Mas atenção: eu sou um robô. Não substituo psicólogo, não faço diagnóstico e não sou canal de emergência."
5. Linha separadora sutil
6. Botão primário largo (width 100%): **"Quero continuar →"** — fundo cor-primária, texto branco, border-radius 12px, height 52px, font-size 18px — ao clicar navega para `/temas`
7. Botão secundário (texto simples, sem borda): *"Prefiro sair"* — cor-texto-leve — ao clicar não faz nada (mantém na tela ou redireciona para página em branco)
8. Rodapé: *"Nenhuma resposta sua fica salva."* — 13px — cor-texto-leve — centralizado

**Animação de entrada:** cada elemento aparece com `fadeInUp` escalonado (delay 100ms entre elementos).

---

## TELA 2: MenuTemas.tsx

**Rota:** `/temas`

**Layout:** fundo `var(--cor-fundo)`, padding 20px.

**Elementos obrigatórios:**

1. Seta de voltar no canto superior esquerdo (←) — navega para `/`
2. Componente `ChatBubble` com texto: *"Para começarmos, escolha o tema que melhor descreve o que você está sentindo hoje:"* — aparece com animação de digitação (typing effect 800ms)
3. Grade 2 colunas com 6 botões `BotaoTema`, cada um com:
   - Ícone emoji + label + seta →
   - border-radius 16px, padding 18px, fundo branco, sombra sutil
   - hover: eleva (translateY -2px) + sombra maior
   - Botões: Ansiedade 😰, Tristeza 😔, Bullying 😤, Luto 💔, Estresse 😩, Pedir ajuda 🆘
   - O botão **"Pedir ajuda 🆘"** ocupa as 2 colunas, fundo `#FFF3F3`, borda cor-crise, texto cor-crise — indica urgência visual
4. Ao clicar em qualquer botão: navega para `/triagem/:tema` (ex: `/triagem/ansiedade`)

---

## TELA 3: Perguntas.tsx

**Rota:** `/triagem/:tema`

**Lógica:**
- Ler o parâmetro `:tema` com `useParams()`
- Importar `PERGUNTAS_POR_TEMA` e `calcularNivel` de `triagem.ts`
- Manter estado: `perguntaAtual: number` (índice, começa em 0), `pesosColetados: number[]`
- Quando aluno clica em uma opção:
  - Se `opcao.peso === 3`: chamar `finalizarTriagem([...pesosColetados, 3])` imediatamente
  - Senão: adicionar peso ao array e avançar para próxima pergunta
  - Se era a última pergunta: chamar `finalizarTriagem(pesosColetados)`
- `finalizarTriagem(pesos)`: calcular nível com `calcularNivel(pesos)` e navegar para `/resultado/:nivel` passando `{ state: { tema, pesos } }`

**Elementos obrigatórios:**

1. Header fixo com: seta voltar (←), badge com label do tema (ex: chip azul "Ansiedade"), barra de progresso (ex: "Pergunta 2 de 3" + barra preenchida proporcionalmente)
2. Componente `ChatBubble` com o texto da pergunta atual — anima ao trocar de pergunta
3. Lista vertical de botões `BotaoOpcao`, um para cada opção:
   - fundo branco, borda 1px `#E0E0E0`, border-radius 12px, padding 16px, texto 16px
   - hover: borda cor-primária, fundo `#F0F7FF`
   - ao clicar: feedback visual (borda verde + check) por 300ms antes de avançar
4. Espaçamento generoso entre botões (gap 12px)

---

## TELA 4: RespostaLeve.tsx

**Rota:** `/resultado/leve`

**Lógica:** receber `{ tema, pesos }` via `location.state`. Ao montar, chamar `registrarNoSupabase(tema, 'leve')`.

**Função registrarNoSupabase:**
```typescript
async function registrarNoSupabase(tema: string, nivel: string) {
  await supabase.from('registros').insert({ tema, nivel_risco: nivel });
}
```

**Elementos obrigatórios:**

1. Ícone grande ✅ ou 💚 — 64px — verde — com animação de escala (bounceIn)
2. Título: **"Obrigado por compartilhar"** — 24px bold — cor-primária
3. Componente `ChatBubble` com texto: *"É normal sentir-se assim às vezes. Você fez bem em parar e prestar atenção em como está se sentindo."*
4. Card "Técnica de respiração" — fundo gradiente suave azul-verde, border-radius 16px, padding 20px:
   - Título: 🫁 Respira comigo
   - Instrução passo a passo (3 steps visuais): **Inspira** (4s) → **Segura** (4s) → **Solta** (4s)
   - Animação opcional: círculo que expande e contrai no ritmo
5. Card de dica de autocuidado relacionada ao tema (varie o texto por tema)
6. Botão: **"Encerrar conversa"** — fundo cor-secundária — ao clicar navega para `/`

---

## TELA 5: RespostaMedio.tsx

**Rota:** `/resultado/medio`

**Lógica:** receber `{ tema, pesos }` via `location.state`. Ao montar:
```typescript
const { data } = await supabase.from('registros').insert({ tema, nivel_risco: 'medio' }).select().single();
await supabase.from('alertas').insert({ registro_id: data.id, status: 'pendente', prazo_dias: 7 });
```

**Elementos obrigatórios:**

1. Ícone 🤝 — 56px — cor-alerta
2. Título: **"Percebo que tem sido difícil"** — 22px bold
3. Componente `ChatBubble` com texto: *"Você não precisa carregar isso sozinho(a). Conversar com alguém de confiança pode ajudar muito."*
4. Card com borda esquerda laranja: **Orientação Pedagógica da escola** — subtítulo: "Procure na secretaria ou sala de orientação" — ícone 🏫
5. Card com borda esquerda azul: **Um professor de confiança** — subtítulo: "Fale com aquele professor com quem você se sente bem" — ícone 👩‍🏫
6. Texto informativo pequeno: *"A escola foi notificada de que um aluno pediu apoio. Ninguém saberá que foi você."*
7. Dois botões:
   - **"Já pedi ajuda"** — fundo cor-secundária
   - **"Encerrar"** — botão secundário
   - Ambos navegam para `/`

---

## TELA 6: RespostaGrave.tsx

**Rota:** `/resultado/grave`

**Lógica:** receber `{ tema, pesos }` via `location.state`. Ao montar **imediatamente e de forma assíncrona**:
```typescript
const { data } = await supabase.from('registros').insert({ tema, nivel_risco: 'grave' }).select().single();
await supabase.from('alertas').insert({ registro_id: data.id, status: 'pendente', prazo_dias: 7 });
```

**ATENÇÃO: Esta tela é a mais crítica. O design deve transmitir seriedade, cuidado e urgência ao mesmo tempo.**

**Elementos obrigatórios:**

1. Faixa de aviso no topo (width 100%, fundo cor-crise claro `#FFEBEE`, padding 12px, texto centralizado): *"🔴 Você não está sozinho(a). Ajuda real está disponível agora."*
2. Componente `ChatBubble` com texto: *"Sinto muito que você está passando por isso. Como sou um robô, preciso garantir sua segurança com ajuda de uma pessoa real."*
3. Três cards de contato `CardContato`, empilhados verticalmente:

   **Card 1 — CVV:**
   - Fundo `#FFEBEE`, borda cor-crise, border-radius 16px, padding 20px
   - Ícone 📞 + Título bold: **CVV — Centro de Valorização da Vida**
   - Subtítulo: *"Ligação gratuita, sigilosa, 24 horas por dia"*
   - Número em destaque: **188** (font-size 32px, bold, cor-crise)
   - Botão: **"Ligar agora"** — fundo cor-crise — ao clicar: `window.location.href = 'tel:188'`

   **Card 2 — SAMU:**
   - Fundo `#FFF3E0`, borda laranja, border-radius 16px, padding 16px
   - Ícone 🚑 + Título: **SAMU — Emergência Médica**
   - Número: **192** (font-size 28px, bold, laranja)
   - Botão: **"Ligar SAMU"** → `tel:192`

   **Card 3 — Adulto na escola:**
   - Fundo `#E3F2FD`, borda cor-primária, border-radius 16px, padding 16px
   - Ícone 🏫 + Título: **Fale com um adulto agora**
   - Subtítulo: *"Procure um professor, coordenador ou qualquer adulto de confiança na escola agora mesmo."*

4. Aviso de rodapé (texto pequeno, centralizado, cor-texto-leve): *"A equipe da escola foi avisada de que um aluno precisa de apoio. Você não será identificado(a)."*
5. Botão: **"Encerrar"** — largo, fundo cinza — navega para `/`

---

## TELA 7: Painel.tsx

**Rota:** `/painel` — **ROTA PROTEGIDA**

**Lógica de proteção:** ao montar, verificar `supabase.auth.getSession()`. Se não autenticado, redirecionar para `/painel/login`.

**Lógica de dados:**
- Ao montar: buscar `supabase.from('alertas').select('*, registros(tema, nivel_risco, criado_em)').order('criado_em', { ascending: false })`
- Inscrever Realtime: `supabase.channel('alertas_realtime').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alertas' }, (payload) => { /* adicionar ao estado + mostrar toast */ }).subscribe()`
- Ao atualizar status: `supabase.from('alertas').update({ status: novoStatus }).eq('id', alertaId)`

**Elementos obrigatórios:**

1. Header com logo + título "Painel da Escola" + botão "Sair" (chama `supabase.auth.signOut()`)
2. Faixa de resumo (3 cards horizontais):
   - Card vermelho: total de alertas GRAVES pendentes esta semana
   - Card laranja: total de alertas MÉDIOS pendentes
   - Card verde: total de alertas CONCLUÍDOS esta semana
3. Tabela de alertas com colunas: **ID** (primeiros 8 chars do uuid) | **Tema** (badge colorido) | **Nível** (badge cor por nível) | **Data** | **Status** | **Prazo** | **Ação**
   - Coluna Ação: dropdown/select com opções: Pendente → Em atendimento → Concluído → Não localizado
   - Linhas com nivel_risco = 'grave' têm fundo `#FFEBEE`
4. Gráfico de barras simples (pode usar div com altura proporcional em Tailwind) mostrando os 6 temas por contagem nos últimos 30 dias
5. Componente `AlertaRealtime`: toast no canto superior direito que aparece ao receber novo INSERT via Realtime — fundo cor-crise, texto branco, ícone 🚨, mensagem "Novo alerta grave recebido!", some após 8 segundos

**Tela de Login `/painel/login`:**
- Formulário simples: campo e-mail + campo senha + botão "Entrar"
- Chamar `supabase.auth.signInWithPassword({ email, password })`
- Ao autenticar com sucesso: navegar para `/painel`
- Exibir erro se credenciais inválidas

---

## COMPONENTES

### ChatBubble.tsx
Card com fundo branco, borda esquerda 4px cor-primária, border-radius 0 12px 12px 12px, padding 16px 20px, sombra sutil, texto 16px. Recebe prop `texto: string`. Anima entrada com `fadeIn` 400ms.

### BotaoTema.tsx
Recebe: `icone: string`, `label: string`, `tema: Tema`, `destaque?: boolean`. Se destaque=true, aplica estilos de urgência (borda cor-crise). Ao clicar navega para `/triagem/${tema}`.

### BotaoOpcao.tsx
Recebe: `texto: string`, `peso: number`, `onClick: () => void`, `selecionado?: boolean`. Mostra check verde quando selecionado. Transição de 200ms.

### CardContato.tsx
Recebe: `titulo`, `subtítulo`, `numero`, `corFundo`, `corBorda`, `telefone`. Renderiza card de contato com botão de ligação.

### ProgressoPerguntas.tsx
Recebe: `atual: number`, `total: number`, `labelTema: string`. Exibe "Pergunta X de Y" + barra de progresso animada.

### AlertaRealtime.tsx
Toast fixo no canto superior direito. Recebe: `visivel: boolean`, `onFechar: () => void`. Animação slideInRight na entrada, fadeOut na saída.

---

## REGRAS DE NEGÓCIO — CRÍTICAS

1. **NUNCA** armazenar no Supabase: texto das respostas, nome do aluno, turma, IP, histórico de conversa.
2. **SEMPRE** que peso 3 aparecer → ir direto para `/resultado/grave`, sem esperar demais perguntas.
3. Registro no Supabase só acontece na tela de resultado, nunca durante as perguntas.
4. O painel em `/painel` deve ser **inacessível sem autenticação** — redirecionar para login.
5. O botão "Pedir ajuda" no menu deve ter aparência visual distinta (cor, tamanho ou destaque) para comunicar urgência.
6. Em RespostaGrave.tsx, os botões de ligar (CVV e SAMU) devem usar `tel:` links reais.
7. Todo texto do bot deve aparecer em `ChatBubble` — nunca texto solto sem componente.

---

## SUPABASE — SCRIPT SQL

Execute este script no SQL Editor do Supabase antes de rodar o app:

```sql
-- Tipos ENUM
CREATE TYPE tema_enum AS ENUM ('ansiedade','tristeza','bullying','luto','estresse','pedir_ajuda');
CREATE TYPE nivel_enum AS ENUM ('leve','medio','grave');
CREATE TYPE status_enum AS ENUM ('pendente','em_atendimento','concluido','nao_localizado');
CREATE TYPE papel_enum AS ENUM ('gestor','monitor','docente');

-- Tabela registros
CREATE TABLE registros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tema tema_enum NOT NULL,
  nivel_risco nivel_enum NOT NULL,
  criado_em timestamptz DEFAULT now()
);

-- Tabela alertas
CREATE TABLE alertas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registro_id uuid REFERENCES registros(id),
  status status_enum DEFAULT 'pendente',
  prazo_dias integer DEFAULT 7,
  atualizado_em timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE registros ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Alunos podem inserir registros" ON registros FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Apenas autenticados leem registros" ON registros FOR SELECT TO authenticated USING (true);
CREATE POLICY "Apenas autenticados inserem alertas" ON alertas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Apenas autenticados leem alertas" ON alertas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Apenas autenticados atualizam alertas" ON alertas FOR UPDATE TO authenticated USING (true);

-- Habilitar Realtime na tabela alertas
ALTER TABLE alertas REPLICA IDENTITY FULL;
```

---

## DESIGN SYSTEM GLOBAL

No arquivo `src/index.css`, adicione:

```css
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap');

:root {
  --cor-primaria: #1B6CA8;
  --cor-secundaria: #2ECC71;
  --cor-alerta: #E67E22;
  --cor-crise: #E74C3C;
  --cor-fundo: #F0F7FF;
  --cor-texto: #1A2B3C;
  --cor-texto-leve: #5D7A8A;
  --raio: 12px;
  --sombra: 0 2px 12px rgba(27, 108, 168, 0.10);
}

* { box-sizing: border-box; }

body {
  font-family: 'Nunito', sans-serif;
  font-size: 16px;
  background-color: var(--cor-fundo);
  color: var(--cor-texto);
  margin: 0;
  padding: 0;
  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes bounceIn {
  0% { transform: scale(0.3); opacity: 0; }
  60% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes slideInRight {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
```

---

## RESULTADO FINAL ESPERADO

Ao finalizar, o projeto deve ter:
- 7 telas funcionais e navegáveis
- Motor de triagem TypeScript sem chamadas de API
- Integração real com Supabase (INSERT em registros e alertas)
- Painel protegido por autenticação com Realtime funcionando
- Design acolhedor, responsivo, mobile-first com fonte Nunito
- Botões CVV 188 e SAMU 192 com links `tel:` reais
- Nenhum dado sensível do aluno armazenado no banco

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/600d201a-3553-4c66-b0fa-62c99c157713).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
