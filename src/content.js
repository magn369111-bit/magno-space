// Textos dinâmicos do app: provocações do dia, mensagens de vitória e Ouroboros.
// Tudo aqui é puro e determinístico (mesma entrada, mesma mensagem), para a tela
// não "piscar" uma frase diferente a cada atualização.

import { pickBy, plural } from "./util.js";

export const APP_VERSION = "0.2.0";

export const OUROBOROS_TEXT = {
  line1: "Se renda à mudança ou sofra em um ciclo.",
  line2: "Quebre o ciclo ou ele te quebrará."
};

export function greeting(hour, name = "") {
  const base = hour < 5 ? "Madrugada de quem decide" : hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  return name ? `${base}, ${name}` : base;
}

const COACH = {
  empty: [
    () => "Um dia sem plano é um dia entregue ao acaso. Defina o que decide o seu dia.",
    () => "Escolha as tarefas que movem a sua vida. Sem lista, não há vitória.",
    () => "Tudo começa na decisão. Escreva a primeira tarefa agora."
  ],
  morning: [
    ({ pending }) => `${plural(pending, "tarefa espera", "tarefas esperam")} por você. Comece pela mais difícil.`,
    ({ pending }) => `A manhã é sua. Termine ${plural(pending, "tarefa", "tarefas")} antes que o mundo peça atenção.`,
    () => "Quem vence a manhã comanda o dia. Dê o primeiro passo agora."
  ],
  afternoon: [
    ({ pending }) => `Metade do dia ficou para trás e ${plural(pending, "tarefa continua", "tarefas continuam")} em aberto. Mexa-se.`,
    ({ pending }) => `Faltam ${plural(pending, "tarefa", "tarefas")}. Vontade não conclui nada: ação conclui.`,
    () => "A tarde decide se hoje será mais um dia comum ou um dia vencido."
  ],
  evening: [
    ({ pending }) => `Ainda restam ${plural(pending, "tarefa", "tarefas")}. O dia não acabou, e você também não.`,
    ({ pending }) => `${plural(pending, "pendência", "pendências")} entre você e a vitória de hoje. Resolva.`,
    () => "A noite chegou e o trabalho continua. Feche o que você começou."
  ],
  late: [
    ({ pending }) => `Última chamada: ${plural(pending, "tarefa", "tarefas")}. Quebrar a sequência agora seria desistir por cansaço.`,
    ({ pending }) => `Faltam ${plural(pending, "tarefa", "tarefas")} e poucas horas. Quem cumpre agora vira outro homem amanhã.`,
    () => "Seu eu de amanhã está olhando para o que você faz nesta hora. Termine."
  ],
  won: [
    () => "Dia vencido. Descanse sem culpa e volte amanhã com a mesma fome.",
    ({ streak }) => `Sequência de ${plural(streak, "dia", "dias")}. Não negocie amanhã.`,
    () => "Você cumpriu o que prometeu a si mesmo. É assim que se constrói respeito próprio."
  ]
};

export function coachMessage({ hour, total, done, streak = 0, dayKey }) {
  const pending = Math.max(0, total - done);
  let tone = "push";
  let bucket;

  if (total === 0) bucket = "empty";
  else if (pending === 0) {
    bucket = "won";
    tone = "win";
  } else if (hour >= 21) bucket = "late";
  else if (hour >= 18) bucket = "evening";
  else if (hour >= 12) bucket = "afternoon";
  else bucket = "morning";

  const build = pickBy(COACH[bucket], `${dayKey}:${bucket}`);
  return { tone, bucket, text: build({ pending, streak }) };
}

const VICTORY = [
  { title: "Dia vencido.", body: "Você fez o que precisava ser feito, sem desculpas. Isso é caráter em movimento." },
  { title: "Missão cumprida.", body: "Cada tarefa concluída é uma promessa honrada com você mesmo. Hoje você honrou todas." },
  { title: "Vitória registrada.", body: "Enquanto muitos negociaram com a preguiça, você agiu. O calendário vai se lembrar." },
  { title: "Você venceu hoje.", body: "Disciplina não é sentimento, é decisão repetida. Mais uma decisão cumprida." },
  { title: "Dia ganho.", body: "O progresso não faz barulho. Ele se acumula em silêncio, dia após dia, como hoje." },
  { title: "Isso é consistência.", body: "Quem aparece todos os dias vence quem aparece quando tem vontade. Você apareceu." },
  { title: "Mais um tijolo.", body: "Impérios foram erguidos assim: um dia de trabalho concluído sobre o outro." },
  { title: "Respeito.", body: "Hoje você fez por merecer o descanso. Agora recarregue, porque amanhã tem mais." }
];

const MILESTONES = {
  3: { title: "3 dias seguidos.", body: "O início é onde a maioria desiste. Você passou dessa fase. Siga." },
  7: { title: "Uma semana de ferro.", body: "Sete vitórias consecutivas. O hábito começa a pesar a seu favor." },
  14: { title: "Duas semanas.", body: "Catorze dias sem quebrar. Você já não depende de motivação, depende de identidade." },
  21: { title: "21 dias.", body: "O que antes exigia esforço agora é rotina. Esse é o tamanho da sua mudança." },
  30: { title: "Um mês inteiro.", body: "Trinta dias de vitória. Quem começou esta jornada já não é a mesma pessoa." },
  50: { title: "50 dias.", body: "Cinquenta vezes você escolheu o futuro em vez do conforto. Isso é raro." },
  100: { title: "100 dias.", body: "Cem dias de disciplina. Poucos chegam aqui. Você chegou. Continue." }
};

export function victoryMessage({ dayKey, streak }) {
  const milestone = MILESTONES[streak];
  const base = milestone || pickBy(VICTORY, dayKey);
  return { ...base, streak, milestone: Boolean(milestone) };
}
