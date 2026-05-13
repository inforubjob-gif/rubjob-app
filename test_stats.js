fetch('https://rubjob-all.com/api/admin/stats?t=' + Date.now(), { cache: 'no-store', headers: { Cookie: 'admin_token=admin123' } })
  .then(res => res.text())
  .then(data => console.log(data))
  .catch(err => console.error(err));
