# Magno Space

App pessoal, feito primeiro para o celular, para acompanhar a jornada diária: frase de reprogramação mental, checklist "Vá e vença" com streak, alertas do dia editáveis, hidratação, treinos com evolução de cargas, notas e calendário de vitórias.

## Como rodar

```bash
npm start
```

Abra `http://localhost:4173`.

## Testes e build

```bash
npm test          # regras de negócio (datas, streak, Ouroboros, backup, treinos...)
npm run build     # site estático em dist/
```

## Navegação

As seções ficam em abas no topo (Hoje, Treinos, Notas, Calendário, Ajustes). Deslize a tela para o lado ou toque na aba.

## Trocar a logo

Substitua o arquivo `src/assets/logo.svg` (ou aponte o `<img class="brand-logo">` do `index.html` para um PNG). O ícone do app instalado fica em `src/assets/icon.svg`.

## Frases

A biblioteca está em `src/quotes.js`. Para acrescentar, adicione linhas **no final** da lista (nunca reordene). Itens marcados "atribuída" são frases muito difundidas sem fonte primária confirmada.

## Dados e backup

Os dados ficam somente no aparelho (IndexedDB, com reserva em localStorage). Use **Ajustes → Exportar backup** antes de trocar de celular ou limpar os dados do navegador. A importação valida e limpa tudo o que entra.

## Uso no celular

Para instalar como app (PWA), publique em HTTPS (o deploy do GitHub Pages já está configurado) e use "Adicionar à tela inicial". Em rede local, acesse `http://IP-do-computador:4173`.
