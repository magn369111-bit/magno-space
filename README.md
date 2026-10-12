# Magno Space

Magno Space e um app pessoal mobile-first para acompanhar tarefas, streak, frases diarias, hidratacao, habitos, treinos, notas e calendario de vitorias.

## Como rodar

```bash
npm start
```

Abra `http://localhost:4173`.

## Testes

```bash
npm test
```

## Build

```bash
npm run build
```

O build estatico sera criado em `dist/`.

## Dados e backup

Os dados ficam salvos no navegador, usando IndexedDB com fallback em localStorage. Use a tela `Ajustes` para exportar um backup JSON antes de trocar de aparelho, limpar dados do navegador ou publicar uma nova versao.

## Uso no celular

Rode o servidor local e acesse pelo navegador do celular na mesma rede usando o IP do computador e a porta `4173`. Para instalacao como PWA, acesse via `http://localhost` ou deploy HTTPS; navegadores geralmente nao permitem service worker em arquivo local.
