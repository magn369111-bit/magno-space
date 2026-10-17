// Biblioteca de frases do "Reprograme sua Mente".
//
// Formato de cada item: [autor, categoria, texto, nota?]
// - nota "atribuída": frase muito difundida e ligada à pessoa, sem fonte primária confirmada.
// - nota "adaptada": tradução livre ou resumo de uma ideia que a pessoa defendeu.
//
// IMPORTANTE: os ids são gerados pela posição (q001, q002...). Para não bagunçar o histórico
// de quem já usa o app, só acrescente frases novas no FIM da lista e nunca reordene.

const RAW = [
  // David Goggins
  ["David Goggins", "disciplina", "Você corre o risco de viver uma vida tão confortável e mole que vai morrer sem nunca ter descoberto o seu verdadeiro potencial."],
  ["David Goggins", "mentalidade", "Seja incomum entre os incomuns."],
  ["David Goggins", "perseverança", "Quando a sua mente disser que acabou, você ainda tem muito mais para dar. A maioria desiste com 40% do que é capaz.", "adaptada"],
  ["David Goggins", "disciplina", "Ninguém ganha dureza mental fazendo só o que gosta. Ela nasce de fazer o que você não quer fazer.", "adaptada"],
  ["David Goggins", "coragem", "Quem vai carregar os barcos e os troncos?"],

  // Jocko Willink
  ["Jocko Willink", "disciplina", "Disciplina é liberdade."],
  ["Jocko Willink", "disciplina", "Não espere motivação. Motivação é passageira; disciplina te leva até o fim.", "adaptada"],
  ["Jocko Willink", "liderança", "Não existem times ruins, só líderes ruins."],

  // Carl Jung
  ["Carl Jung", "mentalidade", "Quem olha para fora, sonha. Quem olha para dentro, desperta."],
  ["Carl Jung", "mentalidade", "O privilégio de uma vida inteira é tornar-se quem você realmente é."],
  ["Carl Jung", "mentalidade", "Tudo o que nos irrita nos outros pode nos levar a compreender a nós mesmos."],
  ["Carl Jung", "coragem", "Prefiro ser um homem inteiro a ser um homem bom."],
  ["Carl Jung", "mentalidade", "Aquilo a que você resiste, persiste.", "atribuída"],
  ["Carl Jung", "mentalidade", "Até você tornar o inconsciente consciente, ele vai dirigir a sua vida e você vai chamá-lo de destino.", "atribuída"],

  // Marco Aurélio
  ["Marco Aurélio", "mentalidade", "O que está no caminho se torna o caminho."],
  ["Marco Aurélio", "disciplina", "Basta de discutir sobre como deve ser um homem bom. Seja um."],
  ["Marco Aurélio", "mentalidade", "A sua alma ganha a cor dos seus pensamentos."],
  ["Marco Aurélio", "disciplina", "Se não é certo, não faça. Se não é verdade, não diga."],
  ["Marco Aurélio", "disciplina", "Ao amanhecer, quando custar levantar, lembre-se: você acorda para fazer o trabalho de um homem.", "adaptada"],
  ["Marco Aurélio", "mentalidade", "Você tem poder sobre a sua mente, não sobre os acontecimentos. Perceba isso e encontrará a força.", "atribuída"],

  // Sêneca
  ["Sêneca", "coragem", "Não é porque as coisas são difíceis que não ousamos. É porque não ousamos que elas são difíceis."],
  ["Sêneca", "mentalidade", "Sofremos mais na imaginação do que na realidade."],
  ["Sêneca", "foco", "Enquanto adiamos, a vida passa."],

  // Epicteto
  ["Epicteto", "mentalidade", "Não são as coisas que perturbam os homens, mas os julgamentos que fazem delas."],
  ["Epicteto", "disciplina", "Primeiro diga a si mesmo o que você quer ser. Depois faça o que precisa ser feito."],

  // Sun Tzu
  ["Sun Tzu", "mentalidade", "A suprema arte da guerra é vencer sem lutar."],
  ["Sun Tzu", "mentalidade", "Quem conhece o inimigo e conhece a si mesmo não precisa temer o resultado de cem batalhas."],
  ["Sun Tzu", "conquista", "A vitória é reservada para aqueles que estão dispostos a pagar o seu preço.", "atribuída"],

  // Alexandre, o Grande
  ["Alexandre, o Grande", "mentalidade", "Devo a Filipe o viver, mas a Aristóteles o viver bem.", "atribuída"],
  ["Alexandre, o Grande", "liderança", "Não temo um exército de leões liderado por uma ovelha. Temo um exército de ovelhas liderado por um leão.", "atribuída"],
  ["Alexandre, o Grande", "coragem", "Nada é impossível para quem tenta.", "atribuída"],

  // Júlio César
  ["Júlio César", "conquista", "Vim, vi, venci."],
  ["Júlio César", "coragem", "A sorte está lançada."],
  ["Júlio César", "mentalidade", "Os homens acreditam de bom grado naquilo que desejam."],
  ["Júlio César", "liderança", "Prefiro ser o primeiro aqui do que o segundo em Roma.", "atribuída"],

  // Napoleão Bonaparte
  ["Napoleão Bonaparte", "liderança", "Um líder é um negociante de esperança."],
  ["Napoleão Bonaparte", "perseverança", "A vitória pertence ao mais perseverante.", "atribuída"],
  ["Napoleão Bonaparte", "conquista", "Impossível é uma palavra encontrada apenas no dicionário dos tolos.", "atribuída"],

  // Winston Churchill
  ["Winston Churchill", "perseverança", "Nunca ceda. Nunca, nunca, nunca, em nada, grande ou pequeno."],
  ["Winston Churchill", "coragem", "Não tenho nada a oferecer senão sangue, labuta, lágrimas e suor."],
  ["Winston Churchill", "perseverança", "Se você está atravessando o inferno, continue andando.", "atribuída"],
  ["Winston Churchill", "perseverança", "O sucesso não é definitivo e o fracasso não é fatal. O que conta é a coragem de continuar.", "atribuída"],

  // Theodore e Franklin Roosevelt
  ["Theodore Roosevelt", "coragem", "O mérito pertence ao homem que está de fato na arena, com o rosto marcado de poeira, suor e sangue."],
  ["Theodore Roosevelt", "disciplina", "Faça o que puder, com o que tiver, onde estiver."],
  ["Franklin D. Roosevelt", "coragem", "A única coisa que devemos temer é o próprio medo."],

  // Líderes e conquistadores
  ["Nelson Mandela", "coragem", "A coragem não é a ausência de medo, mas o triunfo sobre ele."],
  ["Nelson Mandela", "perseverança", "Tudo parece impossível até que seja feito.", "atribuída"],
  ["Abraham Lincoln", "disciplina", "Vou me preparar, e talvez a minha chance chegue.", "atribuída"],
  ["Aníbal Barca", "conquista", "Encontraremos um caminho ou abriremos um.", "atribuída"],
  ["Leônidas I", "coragem", "Venha buscá-las.", "atribuída"],
  ["Gengis Khan", "coragem", "Se você tem medo, não faça. Se já está fazendo, não tenha medo.", "atribuída"],

  // Miyamoto Musashi
  ["Miyamoto Musashi", "disciplina", "Não se arrependa do que fez."],
  ["Miyamoto Musashi", "conquista", "Hoje é a vitória sobre o seu eu de ontem. Amanhã é a vitória sobre homens menores.", "atribuída"],

  // Filósofos
  ["Lao Tsé", "conquista", "Quem vence os outros é forte. Quem vence a si mesmo é poderoso."],
  ["Lao Tsé", "perseverança", "A jornada de mil milhas começa com um único passo."],
  ["Confúcio", "perseverança", "Não importa o quão devagar você vá, desde que não pare.", "atribuída"],
  ["Sócrates", "mentalidade", "Uma vida sem reflexão não vale a pena ser vivida."],
  ["Aristóteles", "disciplina", "Somos aquilo que fazemos repetidamente. A excelência, então, não é um ato, mas um hábito.", "atribuída"],
  ["Friedrich Nietzsche", "perseverança", "O que não me mata me fortalece."],
  ["Friedrich Nietzsche", "perseverança", "Quem tem um porquê para viver suporta quase qualquer como."],
  ["Friedrich Nietzsche", "mentalidade", "Torna-te quem tu és."],
  ["Friedrich Nietzsche", "coragem", "É preciso ter caos dentro de si para dar à luz uma estrela dançante."],
  ["Viktor Frankl", "mentalidade", "Quando não podemos mais mudar uma situação, somos desafiados a mudar a nós mesmos."],

  // Atletas
  ["Muhammad Ali", "perseverança", "Odiei cada minuto de treino, mas dizia a mim mesmo: não desista. Sofra agora e viva o resto da vida como um campeão."],
  ["Muhammad Ali", "conquista", "Campeões não são feitos em academias. São feitos de algo que carregam por dentro: um desejo, um sonho, uma visão."],
  ["Michael Jordan", "perseverança", "Errei mais de nove mil arremessos na carreira e perdi quase trezentos jogos. Falhei muitas vezes, e é por isso que tenho sucesso."],
  ["Michael Jordan", "conquista", "Algumas pessoas querem que aconteça, outras desejam que aconteça, outras fazem acontecer.", "atribuída"],
  ["Kobe Bryant", "coragem", "Se você tem medo de falhar, provavelmente vai falhar."],
  ["Kobe Bryant", "mentalidade", "Tudo o que é negativo, como pressão e desafios, é uma chance de crescer."],
  ["Arnold Schwarzenegger", "perseverança", "A força não vem da vitória. Ela vem das suas lutas. Quando você passa por dificuldades e decide não desistir, isso é força."],
  ["Bruce Lee", "disciplina", "Não temo o homem que praticou dez mil chutes uma vez. Temo o homem que praticou um chute dez mil vezes.", "atribuída"],
  ["Bruce Lee", "mentalidade", "Não peça uma vida mais fácil. Peça para ser um homem mais forte.", "atribuída"],
  ["Ayrton Senna", "disciplina", "Ou você faz bem feito, ou não faz. Em dedicação e esforço, não existe meio-termo.", "atribuída"],
  ["Ayrton Senna", "conquista", "Para ser bem-sucedido, é preciso dedicação total: buscar o seu último limite e dar o melhor de si.", "adaptada"],
  ["Pelé", "disciplina", "Sucesso não é acidente. É trabalho duro, perseverança, aprendizado, estudo, sacrifício e, acima de tudo, amor pelo que você faz.", "atribuída"],

  // Negócios e riqueza
  ["Napoleon Hill", "mentalidade", "O que a mente humana pode conceber e acreditar, ela pode conquistar.", "adaptada"],
  ["Henry Ford", "mentalidade", "Quer você ache que consegue, quer ache que não consegue, você está certo.", "atribuída"],
  ["John D. Rockefeller", "disciplina", "O sucesso é fazer as coisas comuns de maneira incomum.", "atribuída"],
  ["Warren Buffett", "foco", "Preço é o que você paga. Valor é o que você leva."],
  ["Warren Buffett", "disciplina", "Leva vinte anos para construir uma reputação e cinco minutos para destruí-la."],
  ["Warren Buffett", "perseverança", "Alguém está sentado na sombra hoje porque alguém plantou uma árvore há muito tempo."],
  ["Charlie Munger", "mentalidade", "Mostre-me o incentivo e eu lhe mostrarei o resultado."],
  ["Charlie Munger", "mentalidade", "Inverta, sempre inverta."],
  ["Steve Jobs", "coragem", "Permaneça faminto. Permaneça insensato."],
  ["Steve Jobs", "foco", "O seu tempo é limitado. Não o desperdice vivendo a vida de outra pessoa."],
  ["Elon Musk", "perseverança", "Quando algo é importante o bastante, você faz, mesmo que as probabilidades não estejam a seu favor."],

  // Bíblia (tradução Almeida Revista e Corrigida, de domínio público)
  ["Bíblia · Josué 1:9", "fé", "Esforça-te, e tem bom ânimo; não pasmes, nem te espantes, porque o Senhor teu Deus é contigo, por onde quer que andares."],
  ["Bíblia · Deuteronômio 31:6", "coragem", "Esforçai-vos, e tende bom ânimo; não temais, nem tenhais medo deles, porque o Senhor teu Deus é o que vai contigo."],
  ["Bíblia · Filipenses 4:13", "fé", "Posso todas as coisas em Cristo que me fortalece."],
  ["Bíblia · Isaías 41:10", "fé", "Não temas, porque eu sou contigo; não te assombres, porque eu sou o teu Deus; eu te fortaleço, e te ajudo."],
  ["Bíblia · Salmos 27:1", "coragem", "O Senhor é a minha luz e a minha salvação; a quem temerei? O Senhor é a força da minha vida; de quem me recearei?"],
  ["Bíblia · Provérbios 24:16", "perseverança", "Porque sete vezes cairá o justo, e se levantará."],
  ["Bíblia · Gálatas 6:9", "perseverança", "E não nos cansemos de fazer o bem, porque a seu tempo ceifaremos, se não desfalecermos."],
  ["Bíblia · 2 Timóteo 1:7", "coragem", "Porque Deus não nos deu o espírito de temor, mas de fortaleza, e de amor, e de moderação."],
  ["Bíblia · Romanos 8:37", "conquista", "Em todas estas coisas somos mais do que vencedores, por aquele que nos amou."],
  ["Bíblia · Provérbios 16:3", "foco", "Entrega ao Senhor as tuas obras, e teus pensamentos serão estabelecidos."],
  ["Bíblia · Eclesiastes 9:10", "disciplina", "Tudo quanto te vier à mão para fazer, faze-o conforme as tuas forças."],
  ["Bíblia · 1 Coríntios 16:13", "coragem", "Vigiai, estai firmes na fé, portai-vos varonilmente, e fortalecei-vos."],
  ["Bíblia · Tiago 1:12", "perseverança", "Bem-aventurado o homem que suporta a tentação; porque, quando for aprovado, receberá a coroa da vida."],
  ["Bíblia · Provérbios 21:5", "disciplina", "Os pensamentos do diligente tendem só à abundância."]
];

export const quotes = RAW.map(([author, category, text, note], index) => ({
  id: `q${String(index + 1).padStart(3, "0")}`,
  author,
  category,
  text,
  ...(note ? { note } : {})
}));
