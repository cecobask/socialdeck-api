const MongoMemoryServer = require('mongodb-memory-server').MongoMemoryServer;
require('dotenv')
    .config();

async function foo() {
    const mongoServer = new MongoMemoryServer({
        instance: {
            port: 27015,
            dbName: process.env.MONGO_DB_NAME,
            dbPath: './test/testDB',
        }
    });
    console.log(`Opened database connection at: ${await mongoServer.getConnectionString()}`);
}

foo();