const mysql = require('mysql2/promise');
const fs = require('fs');
async function test() {
  try {
    const connection = await mysql.createConnection({
      host: 'database-1.c412eyoqgtsw.us-east-1.rds.amazonaws.com',
      user: 'admin',
      password: 'Eraser@4',
      database: 'beauty_product',
      ssl: {
        ca: fs.readFileSync('./prisma/global-bundle.pem')
      }
    });
    console.log("Connected successfully!");
    connection.end();
  } catch (err) {
    console.error("Connection error:", err.message);
  }
}
test();
