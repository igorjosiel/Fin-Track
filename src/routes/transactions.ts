import type { FastifyInstance } from "fastify";
import { z } from "zod";
import crypto from "node:crypto";
import { db as knex } from "../database.js";
import { type ITransaction } from "../@types/knex.d.js";
import { checkSessionIdExists } from "../../middlewares/check-session-id-exists.js";

export async function transactionsRoutes(app: FastifyInstance) {
    app.get(
        "/",
        { preHandler: [checkSessionIdExists] },
        async (request, reply) => {
            const { sessionId } = request.cookies;

            const transactions = await knex("transactions")
                .where("session_id", sessionId)
                .select();

            return { transactions }
        }
    );

    app.get(
        "/:id",
        { preHandler: [checkSessionIdExists] },
        async (request, reply) => {
            const { sessionId } = request.cookies;

            const getTransactionParamsSchema = z.object({
                id: z.uuid(),
            });

            const { id } = getTransactionParamsSchema.parse(request.params);

            const transaction = await knex<ITransaction>("transactions")
                .where({
                    session_id: sessionId,
                    id,
                })
                .first();

            return { transaction }
        }
    );

    app.get(
        "/summary",
        { preHandler: [checkSessionIdExists] },
        async (request, reply) => {
            const { sessionId } = request.cookies;

            const summary = await knex<ITransaction>("transactions")
                .where("session_id", sessionId)
                .sum("amount", { as: "amount" })
                .first();

            return { summary }
        }
    );

    app.post("/", async (request, reply) => {
        const createTransactionBodySchema = z.object({
            title: z.string(),
            amount: z.number(),
            type: z.enum(['credit', 'debit']),
        });

        const { title, amount, type } = createTransactionBodySchema.parse(request.body);

        let sessionId = request.cookies.sessionId;

        if (!sessionId) {
            sessionId = crypto.randomUUID();

            reply.cookie("sessionId", sessionId, {
                path: "/",
                maxAge: 60 * 60 * 24 * 7 // 7 days
            });
        }

        await knex<ITransaction>("transactions").insert({
            id: crypto.randomUUID(),
            title,
            amount: type === "credit" ? amount : amount * -1,
            session_id: sessionId
        });

        return reply.status(201).send();
    });
}
