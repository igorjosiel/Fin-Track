import type { FastifyInstance } from "fastify";
import { z } from "zod";
import crypto from "node:crypto";
import { db as knex } from "../database.js";
import { type ITransaction } from "../@types/knex.js";

export async function transactionsRoutes(app: FastifyInstance) {
    app.post("/", async (request, reply) => {
        const createTransactionBodySchema = z.object({
            title: z.string(),
            amount: z.number(),
            type: z.enum(['credit', 'debit']),
        });

        const { title, amount, type } = createTransactionBodySchema.parse(request.body);

        await knex<ITransaction>("transactions").insert({
            id: crypto.randomUUID(),
            title,
            amount: type === "credit" ? amount : amount * -1,
        });

        return reply.status(201).send();
    });
}
