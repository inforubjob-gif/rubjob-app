const fs = require('fs');
fetch('https://admin.rubjob-all.com/api/admin/support')
  .then(res => res.json())
  .then(data => {
    const tickets = data.tickets.slice(0, 5).map(t => ({ id: t.id, channel: t.channel, senderName: t.senderName }));
    console.log(JSON.stringify(tickets, null, 2));
  });
