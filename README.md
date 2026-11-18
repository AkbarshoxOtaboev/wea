# WEA

Suv, havo va tuproq monitoringi. Backend: Node.js, Express, PostgreSQL (`wea_db`). Frontend: Vue.js.

Landing sahifa ochiq ko‘rinish. Admin panel alohida: `/admin`.

## Ishga tushirish

PostgreSQL da `wea_db` bazasi, foydalanuvchi `postgres`, parol `postgres`.

```bash
npm install
npm run dev
```

Brauzer: http://127.0.0.1:5173

| Rol | Email | Parol |
|---|---|---|
| Administrator | admin@wea.uz | Admin123! |
| Ekolog | ekolog@wea.uz | Ekolog123! |
| Tadqiqotchi | tadqiqot@wea.uz | Tadqiq123! |
| Davlat vakili | davlat@wea.uz | Davlat123! |

Ma’lumotni tozalash: serverni to‘xtatib `npm run reset`, keyin `npm run dev`.
