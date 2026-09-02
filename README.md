# Pinpoint – Historiska personer

## Starta desktopversionen

```bash
npm install
npm run desktop
```

## Lägg till eller ändra personer

Personerna finns nu separat i:

`data/people.js`

Du behöver normalt bara öppna den filen och lägga till ett nytt objekt i `PEOPLE`.

Exempel:

```js
{
  name: "Winston Churchill",
  birth: "30 november 1874",
  death: "24 januari 1965",
  b: [51.8410, -1.3610],
  d: [51.5074, -0.1278],
  bp: "Blenheim Palace, England",
  dp: "London, England",
  aliases: ["winston churchill", "churchill"],
  hint: "Brittisk premiärminister och statsman"
}
```

### Fält

- `name` – namnet som visas när svaret avslöjas.
- `birth` – födelsedatum/år.
- `death` – dödsdatum/år.
- `b` – födelsekoordinater `[latitud, longitud]`.
- `d` – dödskoordinater `[latitud, longitud]`.
- `bp` – födelseplats som visas efter fel gissning.
- `dp` – dödsplats som visas efter fel gissning.
- `aliases` – godkända namnformer. Lägg gärna till efternamn eller vanligt namn.
- `hint` – ledtråden som visas av livlinan.

Geografiska koordinater är i decimalgrader, till exempel Stockholm: `[59.3293, 18.0686]`.

## Viktigt

- Ändra bara `data/people.js` när du lägger till personer.
- Kartan och själva spel-logiken ligger kvar i `app.js`.
- Personerna blandas automatiskt när spelet startar.
