const express = require('express');
const app = express();
app.use(express.static(__dirname));
app.get('/', (req,res)=>res.sendFile(__dirname+'/index.html'));
const port = process.env.PORT||3000;
app.listen(port, ()=>console.log('FENIX 24/7 en puerto '+port));
