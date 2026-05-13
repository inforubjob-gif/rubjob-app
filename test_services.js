fetch('https://rubjob-all.com/api/debug/services?t=' + Date.now(), { cache: 'no-store' })
  .then(res => res.json())
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(err => console.error(err));
