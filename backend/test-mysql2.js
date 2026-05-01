
const mysql = require('mysql2/promise');

async function test() {
    try {
        const connection = await mysql.createConnection({
            host: 'srv1012.hstgr.io',
            user: 'u783931396_schoolerp',
            password: 'vohjax-0gucmo-qoDtiv',
            database: 'u783931396_schoolerp',
            port: 3306,
            connectTimeout: 10000
        });
        console.log('Connected successfully with mysql2!');
        const [rows] = await connection.execute('SELECT 1 + 1 AS solution');
        console.log('Query result:', rows[0].solution);
        await connection.end();
    } catch (err) {
        console.error('Connection failed with mysql2:');
        console.error(err);
    }
}
test();

