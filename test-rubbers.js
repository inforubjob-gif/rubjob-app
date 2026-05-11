const http = require('http');
fetch('http://localhost:3000/api/admin/debug-rubbers')
  .then(r => r.json())
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(console.error);
