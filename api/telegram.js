export default async function handler(req, res) {
  const TOKEN = "8825910376:AAHpnjHuhaLyJhQMI9oOZmqxEcupaId-54E";
  const CHAT_ID = "8639536197";
  const t = req.body?.text || req.query?.text || "test";
  await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({chat_id: CHAT_ID, text: t, parse_mode:'HTML'})
  });
  res.json({ok:true});
}
