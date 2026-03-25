const http = require('http');

const data = JSON.stringify({
  code: "test_role",
  name: "Test Role",
  description: "Test description",
  isActive: true,
  permissionIds: []
});

const req = http.request(
  {
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/roles',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  },
  (res) => {
    let raw = '';
    res.on('data', d => raw += d);
    res.on('end', () => console.log('Status:', res.statusCode, 'Body:', raw));
  }
);

req.on('error', console.error);
req.write(data);
req.end();
