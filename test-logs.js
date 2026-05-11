fetch('https://admin.rubjob-all.com/api/admin/debug-dispatch-logs')
  .then(r => r.json())
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(console.error);
