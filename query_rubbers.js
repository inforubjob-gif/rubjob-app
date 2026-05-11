fetch('https://admin.rubjob-all.com/api/admin/rubbers', {
  headers: {
    // If I need an admin session, this will fail with 401. Let's try
  }
})
  .then(res => res.json())
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(err => console.error(err));
