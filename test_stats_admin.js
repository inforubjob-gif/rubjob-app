fetch('https://admin.rubjob-all.com/api/admin/stats?t=' + Date.now(), { cache: 'no-store', headers: { Cookie: 'admin_token=admin123' } })
  .then(res => res.text())
  .then(data => console.log("Response:", data.substring(0, 100)))
  .catch(err => console.error(err));
