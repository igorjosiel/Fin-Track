import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import crypto from "node:crypto";
import { db as knex } from "../database.js";
import { type ITransaction } from "../@types/knex.d.ts";
import { checkSessionIdExists } from "../../middlewares/check-session-id-exists.js";

export async function transactionsRoutes(app: FastifyInstance) {
    app.get(
        "/",
        { preHandler: [checkSessionIdExists] },
        async (request: FastifyRequest, reply: FastifyReply) => {
            const { sessionId } = request.cookies;
            const { page = 1, limit = 5, type, title, sort, order } = request.query;

            const query = knex("transactions")
                .where("session_id", sessionId);

            if (type === "credit") {
                query.andWhere("amount", ">", 0);
            }

            if (type === "debit") {
                query.andWhere("amount", "<", 0);
            }

            if (title) {
                query.andWhereILike("title", `%${title}%`);
            }

            if (sort && order) {
                query.orderBy(sort, order);
            }

            const transactions = await query
                .limit(limit, { skipBinding: true })
                .offset((page - 1) * limit);

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

    app.put("/:id", async (request, reply) => {
        const updateTransactionBodySchema = z.object({
            title: z.string(),
            amount: z.number(),
            type: z.enum(['credit', 'debit']),
        });

        const transactionIdParamsSchema = z.object({
            id: z.uuid(),
        });

        const { title, amount, type } = updateTransactionBodySchema.parse(request.body);
        const { id } = transactionIdParamsSchema.parse(request.params);

        let sessionId = request.cookies.sessionId;

        if (!sessionId) {
            sessionId = crypto.randomUUID();

            reply.cookie("sessionId", sessionId, {
                path: "/",
                maxAge: 60 * 60 * 24 * 7 // 7 days
            });
        }

        await knex<ITransaction>("transactions")
            .update({
                id,
                title,
                amount: type === "credit" ? amount : amount * -1,
                session_id: sessionId
            })
            .where("id", "=", id)
            .andWhere("session_id", sessionId);
    });

    app.delete("/:id", async (request, apply) => {
        const transactionIdParamsSchema = z.object({
            id: z.uuid(),
        });

        const { id } = transactionIdParamsSchema.parse(request.params);

        let sessionId = request.cookies.sessionId;

        await knex<ITransaction>("transactions")
            .where("id", "=", id)
            .andWhere("session_id", "=", sessionId)
            .del();
    });
}
