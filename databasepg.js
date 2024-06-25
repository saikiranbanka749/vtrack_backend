// const { Client } = require("pg");
// const client = new Client({
//     host: "localhost",
//     user: "postgres",
//     port: 5432,
//     password: "Vamsi1725@",
//     database: "vensai"
// });

// async function postgressqlConnection() {
//     await client.connect();
// }

// module.exports = { postgressqlConnection, client }; // Export both the connection function and the client object

const { Client } = require("pg");

async function postgressqlConnection() {
    const client = new Client({
        host: "localhost",
        user: "postgres",
        port: 5432,
        password: "1725",
        database: "Vensai"
    });
    await client.connect();
    return client;
}

module.exports = postgressqlConnection;
