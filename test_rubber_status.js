fetch('https://rubjob-all.com/api/rubber/orders/RJ-W7ITXMRW/status', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Cookie': 'rubber_token=fake_token' // Wait, I don't have a valid session!
  },
  body: JSON.stringify({ status: 'completed', photo: 'fake_photo_url' })
})
  .then(res => res.json())
  .then(data => console.log(JSON.stringify(data, null, 2)))
  .catch(err => console.error(err));
