# Magno Space: roteiro de prompts para criar o app com Codex

Este roteiro foi pensado para construir o Magno Space em etapas pequenas, verificaveis e mobile-first. Cole um prompt por vez no Codex. So avance para o proximo quando o Codex tiver explicado o que fez, rodado os testes/build disponiveis e mostrado claramente o que foi ou nao verificado.

## Regras de uso

- Nao peça para a IA "fazer tudo de uma vez". Use os prompts em sequencia.
- Se algum comando de instalacao, teste ou build falhar, pare a sequencia e use o prompt de reparo.
- O app deve ser pessoal, local-first e otimizado para celular antes de desktop.
- O Codex deve inspecionar o repositorio antes de escolher arquitetura, biblioteca ou padrao.
- Quando nao houver projeto existente, a recomendacao inicial e um PWA com React, TypeScript, Vite, Tailwind ou CSS modular, IndexedDB para dados locais, testes unitarios e um caminho simples de backup/exportacao.

---

## Prompt 1: inspecao inicial do projeto

```text
Voce vai me ajudar a construir o Magno Space, um app pessoal mobile-first de produtividade, saude, treino, notas e evolucao diaria.

Antes de criar ou alterar qualquer arquivo, inspecione o repositorio atual:
- Liste a estrutura de pastas e arquivos principais.
- Identifique framework, linguagem, gerenciador de pacotes, scripts disponiveis, testes e build.
- Leia arquivos de configuracao relevantes, README, package.json, rotas/componentes principais e qualquer instrucao do projeto.
- Verifique se ja existe frontend, backend, banco local/remoto ou autenticacao.

Depois disso, me entregue:
1. O que existe hoje no projeto.
2. Qual arquitetura voce recomenda com base no que encontrou.
3. Quais comandos usara para instalar, rodar, testar e gerar build.
4. Um plano incremental com etapas pequenas.

Nao implemente ainda. Nao invente verificacao: diga exatamente o que foi inspecionado e o que ainda precisa ser confirmado.
```

---

## Prompt 2: criacao ou ajuste da base do app

Use este prompt depois da inspecao. Se o repositorio ja tiver stack definida, o Codex deve respeitar a stack existente.

```text
Implemente a base do Magno Space respeitando a arquitetura do repositorio.

Se o projeto ja tiver frontend, use os padroes existentes. Se estiver vazio, crie uma base mobile-first com:
- TypeScript.
- App web responsivo.
- Estrutura clara de pastas: components, pages/views, data, hooks, lib, styles, tests.
- Persistencia local preparada para IndexedDB ou equivalente.
- Tema preto e vermelho, minimalista, serio e focado em progresso.
- Layout inicial pensado primeiro para celular.
- Navegacao principal com as areas: Hoje, Tarefas, Treinos, Notas, Habitos, Calendario e Configuracoes.

Requisitos visuais:
- Nada de landing page.
- A primeira tela deve ser o painel de uso real do dia.
- Evite elementos decorativos exagerados.
- Use tamanhos confortaveis para toque no celular.
- Garanta bom contraste e leitura.

Ao final:
- Rode formatacao/lint/testes/build conforme o projeto permitir.
- Explique os arquivos criados/alterados.
- Informe exatamente o que passou e o que falhou.
```

---

## Prompt 3: modelo de dados e persistencia local

```text
Agora implemente o modelo de dados local do Magno Space.

O app e de uso pessoal e deve funcionar bem no celular, inclusive sem internet sempre que possivel.

Crie ou ajuste a camada de persistencia para armazenar:
- Perfil/configuracoes do usuario: nome opcional, meta de agua, preferencias de notificacao visual, tema.
- Frases motivacionais diarias: texto, autor/fonte, categoria, data exibida, favorito.
- Tarefas diarias: titulo, data local, status, prioridade opcional, criadaEm, concluidaEm.
- Tarefas do dia seguinte: permitir planejar amanha sem misturar com hoje.
- Historico diario: data, total de tarefas, tarefas concluidas, dia vitorioso, mensagem exibida, streak.
- Treinos: semana, dia, grupo muscular opcional, exercicios, series, repeticoes, carga, observacoes.
- Notas: titulo, conteudo, tags, atualizadaEm, criadaEm.
- Habitos: agua consumida no dia, meta diaria, lembretes de evitar acucar, ultraprocessados e fast food.
- Backups/exportacoes: versao do schema, data de exportacao.

Cuidados obrigatorios:
- Use datas locais de forma consistente.
- Crie funcoes puras para calculo de streak, vitoria do dia e status do calendario.
- Inclua migracao/versionamento simples do schema local.
- Nao dependa de login ou servidor nesta versao.

Adicione testes unitarios para as regras de data, streak, vitoria diaria e serializacao/exportacao se o projeto tiver estrutura de testes. Se nao tiver, configure o minimo necessario.

Rode os testes e o build. Relate resultados.
```

---

## Prompt 4: painel "Hoje" mobile-first

```text
Implemente a tela principal "Hoje" do Magno Space.

Ela deve abrir direto em um painel diario com:
- Frase motivacional/reprogramacao mental do dia.
- Indicador de streak atual.
- Checklist das tarefas de hoje.
- Acoes rapidas para adicionar tarefa, registrar agua, abrir treino, criar nota e planejar amanha.
- Resumo de agua do dia.
- Avisos curtos de evitar acucar, ultraprocessados e fast food.
- Estado de "dia vitorioso" quando todas as tarefas do dia forem concluidas.

Comportamento:
- A frase do dia deve permanecer a mesma durante o dia local.
- A interface deve funcionar muito bem em telas pequenas.
- Acoes principais devem estar acessiveis com o polegar.
- Estados vazios devem permitir criar o primeiro item imediatamente.
- Nao use textos longos explicando como usar; a interface deve ser intuitiva.

Ao final, teste:
- Tela vazia.
- Dia com tarefas pendentes.
- Dia com todas as tarefas concluidas.
- Alternancia entre hoje e amanha, se ja existir.

Rode testes/build e informe o que foi verificado.
```

---

## Prompt 5: tarefas, provocacoes, streak e Ouroboros

```text
Implemente o sistema diario de tarefas, streak, provocacoes motivacionais e quebra de ciclo.

Funcionalidades:
- Criar, editar, concluir, reabrir e excluir tarefas do dia.
- Planejar tarefas de amanha.
- Ao finalizar todas as tarefas do dia, registrar o dia como vitorioso no historico.
- Exibir mensagem de gratificacao/exaltacao quando o dia for concluido.
- Atualizar streak com base em dias vitoriosos consecutivos.
- Se a sequencia for quebrada, exibir uma tela ou modal forte com o tema da serpente Ouroboros e as frases:
  "Se renda a mudanca ou sofra em um ciclo."
  "Quebre o ciclo ou ele te quebrara."

Regras importantes:
- Uma tarefa concluida deve registrar horario de conclusao.
- O calculo de streak nao pode duplicar dias.
- O dia deve ser identificado por data local.
- Se nao houver tarefas cadastradas em um dia, nao marque automaticamente como vitoria.
- O usuario deve conseguir continuar usando o app depois da mensagem de quebra de ciclo.

Visual:
- Mantenha o estilo preto e vermelho.
- A imagem/animacao do Ouroboros pode ser implementada inicialmente como asset simples, CSS animado ou placeholder visual elegante, mas deixe a estrutura pronta para trocar por uma imagem animada real depois.
- Nao deixe a tela pesada ou lenta no celular.

Inclua testes para streak e quebra de sequencia. Rode testes/build.
```

---

## Prompt 6: calendario de vitorias

```text
Implemente o calendario de progresso do Magno Space.

Funcionalidades:
- Visualizacao mensal mobile-first.
- Marcar dias vitoriosos.
- Diferenciar dias incompletos, dias sem tarefas e dia atual.
- Ao tocar em um dia, mostrar resumo: tarefas concluidas, total de tarefas, agua, treino registrado e notas criadas/atualizadas.
- Exibir streak atual e melhor streak.

Regras:
- O calendario deve usar o historico diario persistido.
- Nao recalcular historico de forma destrutiva.
- Se dados antigos estiverem incompletos, lidar com isso sem quebrar a tela.

Teste meses com:
- Nenhum dado.
- Varios dias vitoriosos consecutivos.
- Quebra de streak.
- Mes com virada de ano.

Rode testes/build e relate.
```

---

## Prompt 7: frases motivacionais e conteudo diario

```text
Implemente a area de frases diarias do Magno Space.

Objetivo:
O usuario deve receber diariamente uma frase de motivacao, coragem, fe, conquista, disciplina ou reprogramacao mental.

Requisitos:
- Criar um banco inicial de frases com categorias:
  disciplina, coragem, fe, conquista, perseveranca, foco, poder pessoal.
- Incluir autor/fonte quando aplicavel.
- Permitir favoritar frases.
- Permitir trocar manualmente a frase do dia, mas manter registro da frase exibida naquele dia.
- Evitar repetir a mesma frase em dias proximos quando houver opcoes suficientes.

Cuidados com direitos autorais:
- Nao preencher o app com traducoes modernas protegidas por direitos autorais.
- Para versiculos, salve preferencialmente a referencia biblica e um resumo/parafrase motivacional, ou use apenas textos cuja licenca esteja clara para uso no projeto.
- Para autores historicos, use frases em dominio publico quando houver seguranca, ou crie frases originais inspiradas no tema sem atribuir falsamente.

Interface:
- A frase do dia deve aparecer no painel Hoje.
- Deve haver uma tela simples para listar, buscar, filtrar por categoria e favoritar.

Inclua testes para selecao da frase diaria e nao repeticao basica. Rode testes/build.
```

---

## Prompt 8: hidratacao e alertas de habitos alimentares

```text
Implemente a area de Habitos do Magno Space.

Funcionalidades:
- Definir meta diaria de agua.
- Registrar agua consumida com botoes rapidos e entrada manual.
- Mostrar progresso do dia no painel Hoje.
- Registrar lembretes/avisos diarios contra acucar, ultraprocessados e fast food.
- Permitir marcar que resisti ao habito ruim no dia.
- Salvar historico diario.

Mobile-first:
- Registrar agua deve exigir poucos toques.
- Botoes devem ser grandes o suficiente para celular.
- O progresso deve ser visual, simples e rapido de entender.

Regras:
- Agua e habitos devem ser por data local.
- Alterar a meta nao deve apagar historico anterior.
- Se possivel, preparar a estrutura para notificacoes futuras, mas sem depender delas agora.

Adicione testes para progresso de agua e historico por data. Rode testes/build.
```

---

## Prompt 9: treinos de musculacao

```text
Implemente a area de Treinos do Magno Space.

Funcionalidades:
- Criar treinos por dia da semana.
- Adicionar exercicios com nome, series, repeticoes, carga e observacoes.
- Editar carga rapidamente para acompanhar evolucao.
- Duplicar treino anterior.
- Ver historico de cargas por exercicio.
- Marcar treino como concluido no dia.

Interface mobile:
- Formularios curtos e faceis de usar no celular.
- Edicao inline quando fizer sentido.
- Evite tabelas largas que fiquem ruins no mobile; use listas compactas ou cards simples.

Regras:
- Preservar historico de carga.
- Nao sobrescrever treino antigo ao editar o plano da semana, a menos que o usuario confirme.
- Permitir observacoes livres.

Inclua testes para salvar treino, duplicar treino e historico de carga. Rode testes/build.
```

---

## Prompt 10: notas estilo Notion, simples e pessoal

```text
Implemente o bloco de notas do Magno Space.

Objetivo:
Um espaco simples, rapido e poderoso para reflexoes, aprendizados de leitura, ideias e registros pessoais.

Funcionalidades:
- Criar, editar, excluir e buscar notas.
- Titulo, conteudo, tags e data de atualizacao.
- Suporte a Markdown basico ou editor rico simples, conforme fizer mais sentido para a stack existente.
- Fixar notas importantes.
- Filtrar por tags.
- Salvar automaticamente enquanto digita, com indicacao discreta de salvo.

Mobile-first:
- Criar uma nota deve ser muito rapido.
- Edicao deve ser confortavel no celular.
- Busca deve ser acessivel.

Cuidados:
- Nao implemente um editor complexo demais se isso atrasar o app.
- Priorize confiabilidade, autosave e exportacao futura.

Inclua testes para criar/editar/buscar notas se a estrutura permitir. Rode testes/build.
```

---

## Prompt 11: backup, exportacao e restauracao

```text
Implemente backup/exportacao dos dados do Magno Space.

Funcionalidades:
- Exportar todos os dados locais para um arquivo JSON.
- Incluir versao do schema, data de exportacao e resumo do conteudo.
- Importar/restaurar backup com validacao basica.
- Antes de importar, mostrar aviso claro de que os dados atuais podem ser mesclados ou substituidos, conforme a opcao escolhida.
- Oferecer modo "mesclar" e modo "substituir tudo", se isso for viavel com seguranca.

Regras:
- Nunca apague dados atuais sem confirmacao explicita.
- Validar estrutura minima do arquivo antes de importar.
- Lidar com backups de versoes antigas quando possivel.
- Criar testes para exportar e importar.

Ao final, rode testes/build e explique como fazer backup manualmente.
```

---

## Prompt 12: acessibilidade, qualidade mobile e polimento visual

```text
Faça uma revisao de acessibilidade e experiencia mobile do Magno Space.

Verifique e ajuste:
- Contraste das cores preto/vermelho.
- Tamanho minimo de toque para botoes e controles.
- Leitura em telas pequenas.
- Estados de foco para teclado.
- Labels acessiveis em botoes de icone.
- Navegacao por teclado quando aplicavel.
- Evitar textos cortados, sobrepostos ou pequenos demais.
- Performance inicial no celular.
- Layout em larguras pequenas, medias e desktop.

Tambem refine o visual:
- Manter seriedade, disciplina e progresso.
- Evitar aparencia generica.
- Evitar excesso de cards, sombras e decoracoes.
- Usar vermelho como acento de decisao/energia, nao como poluicao visual.

Se o projeto tiver Playwright, Cypress ou outro teste visual, crie verificacoes basicas para telas principais. Se nao tiver, ao menos rode build e faca uma verificacao manual estruturada com screenshots se as ferramentas locais permitirem.

Relate exatamente o que foi verificado.
```

---

## Prompt 13: testes de fluxo completo

```text
Crie e/ou rode uma bateria de testes do fluxo principal do Magno Space.

Fluxos obrigatorios:
1. Primeiro uso: abrir app sem dados, criar tarefa, registrar agua, criar nota e treino.
2. Dia vitorioso: criar tarefas, concluir todas, registrar vitoria e atualizar calendario.
3. Streak: simular dias consecutivos e quebra de sequencia.
4. Planejar amanha: criar tarefas futuras e verificar que nao misturam com hoje.
5. Backup: exportar dados e validar arquivo.
6. Restauracao: importar backup valido em ambiente de teste.
7. Mobile: verificar layout das telas principais em largura de celular.

Se algum teste falhar, corrija e rode novamente.

No final, entregue:
- Lista de comandos executados.
- Resultado de testes/build.
- Problemas encontrados e corrigidos.
- Problemas restantes, se houver.
```

---

## Prompt 14: PWA, instalacao no celular e uso offline

```text
Prepare o Magno Space para uso como PWA no celular.

Funcionalidades:
- Manifest com nome Magno Space, icones e cor de tema.
- Configuracao para instalar no celular.
- Service worker ou estrategia equivalente para abrir o app offline, se a stack permitir.
- Persistencia local funcionando sem internet.
- Tela ou aviso discreto para status offline/online.

Cuidados:
- Nao quebrar build.
- Nao cachear de forma perigosa dados exportados ou arquivos sensiveis.
- Documentar como testar instalacao no celular.

Rode build e, se possivel, uma auditoria ou verificacao PWA. Informe o que foi confirmado e o que depende de teste manual no aparelho.
```

---

## Prompt 15: deploy pessoal e rotina de backup

```text
Prepare o Magno Space para deploy pessoal.

Objetivo:
Eu quero usar no celular como app pessoal. Sugira e implemente o caminho mais simples de deploy de acordo com a stack do projeto.

Considere:
- Deploy estatico, se o app for frontend local-first.
- Vercel, Netlify, GitHub Pages ou outro caminho simples, conforme fizer sentido.
- Variaveis de ambiente, se existirem.
- Build de producao.
- Documentacao curta no README com:
  - como rodar localmente,
  - como gerar build,
  - como fazer deploy,
  - como exportar backup,
  - como restaurar backup,
  - cuidados antes de atualizar versao.

Importante:
- Nao coloque dados pessoais no repositorio.
- Nao invente que o deploy foi feito se voce apenas preparou os arquivos.
- Se precisar de credenciais ou login externo, pare e diga exatamente o que precisa de mim.

Rode build final e relate o resultado.
```

---

## Prompt de reparo quando algo falhar

Use sempre que teste, build, instalacao ou tela quebrar.

```text
Algo falhou na ultima etapa. Antes de continuar criando funcionalidades novas, corrija o problema.

Tarefa:
- Leia o erro completo.
- Identifique a causa provavel.
- Inspecione os arquivos relacionados.
- Aplique a menor correcao segura.
- Rode novamente o comando que falhou.
- Se passar, rode tambem os testes/build relevantes para garantir que nada quebrou.

No final, explique:
- Qual era o problema.
- O que foi alterado.
- Qual comando foi reexecutado.
- Se agora passou ou se ainda existe bloqueio.

Nao avance para novas funcionalidades ate a falha estar resolvida ou claramente bloqueada por algo que depende de mim.
```

---

## Prompt de revisao final antes de usar de verdade

```text
Faça uma revisao final do Magno Space como se eu fosse comecar a usar hoje no celular.

Verifique:
- Build de producao.
- Fluxo de primeiro uso.
- Criacao e conclusao de tarefas.
- Streak e calendario.
- Frase diaria.
- Agua e habitos.
- Treinos.
- Notas.
- Backup/exportacao.
- Layout mobile.
- Acessibilidade basica.
- README.

Depois entregue:
1. O que esta pronto para uso.
2. O que foi testado de verdade.
3. O que ainda precisa de teste manual no celular.
4. Riscos ou limitacoes restantes.
5. Proximas melhorias recomendadas, em ordem de prioridade.

Se encontrar problema, corrija antes de finalizar quando for seguro fazer isso.
```

---

## Melhorias futuras depois da primeira versao

Depois que a primeira versao estiver funcionando, evolua com prompts menores:

```text
Analise o uso atual do Magno Space e proponha uma melhoria pequena, segura e de alto impacto para a proxima versao. Priorize confiabilidade, experiencia mobile e utilidade diaria. Nao implemente ainda; primeiro explique a proposta e o risco.
```

```text
Implemente [descrever melhoria escolhida] no Magno Space. Respeite a arquitetura existente, mantenha compatibilidade com os dados locais atuais, adicione ou ajuste testes e rode build. Nao altere areas nao relacionadas.
```

