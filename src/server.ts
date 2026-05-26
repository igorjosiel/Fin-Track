import "dotenv/config";
import fastify from "fastify";
import { db as knex } from "./database.js";
import { env } from "./env/index.js";

const app = fastify();

app.get("/hello", async () => {
    const transactions = await knex("transactions")
    .where("amount", 500)
    .select("*");

    return transactions;
});

app.listen({
    port: env.PORT,
}).then(() => {
    console.log("HTTP Server Running!");
});
