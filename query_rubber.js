const fs = require('fs');
fetch('https://admin.rubjob-all.com/api/debug/db-sync')
  .then(res => res.json())
  .then(data => console.log('This endpoint just runs DDL, no data.'));
