const mysql = require('mysql2/promise');
const fs = require('fs');
async function test() {
  try {
    const connection = await mysql.createConnection({
      host: 'database-1.c412eyoqgtsw.us-east-1.rds.amazonaws.com',
      user: 'admin',
      password: 'Eraser@4',
      database: 'mysql', // Using built-in mysql database to test credentials
      ssl: {
        ca: fs.readFileSync('./prisma/global-bundle.pem')
      }
    });
    console.log("Connected successfully to mysql database! Credentials are correct.");
    
    // Now let's try to create beauty_product if it doesn't exist
    await connection.query("CREATE DATABASE IF NOT EXISTS beauty_product;");
    console.log("Created beauty_product database!");
    
    connection.end();
  } catch (err) {
    console.error("Connection error:", err.message);
  }
}
test();
