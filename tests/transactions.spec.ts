import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { execSync } from "node:child_process";
import { app } from "../src/app.js";

describe("Transactions routes", () => {
    beforeAll(async () => {
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(() => {
        execSync("npm run knex migrate:rollback --all");
        execSync("npm run knex migrate:latest");
    });

    it("should be able to create a new transaction", async () => {
        const response = await request(app.server).post("/transactions").send({
            title: "New Transaction",
            amount: 5000,
            type: "credit"
        });

        expect(response.statusCode).toEqual(201);
    });

    it("should be able to list all the transactions", async () => {
        const createTransactionResponse = await request(app.server).post("/transactions").send({
            title: "New Transaction",
            amount: 5000,
            type: "credit"
        });

        const cookies = createTransactionResponse.get("Set-Cookie");

        const listTransactionsResponse = await request(app.server)
            .get("/transactions")
            .set("Cookie", cookies)
            .expect(200);

        expect(listTransactionsResponse.body.transactions).toEqual([
            expect.objectContaining({
                title: "New Transaction",
                amount: 5000,
            }),
        ]);
    });

    it("should be able to list a specific transaction", async () => {
        const createTransactionResponse = await request(app.server).post("/transactions").send({
            title: "New Transaction",
            amount: 5000,
            type: "credit"
        });

        const cookies = createTransactionResponse.get("Set-Cookie");

        const listTransactionsResponse = await request(app.server)
            .get("/transactions")
            .set("Cookie", cookies)
            .expect(200);

        const transactionId = listTransactionsResponse.body.transactions[0].id;

        const getTransactionResponse = await request(app.server)
            .get(`/transactions/${transactionId}`)
            .get('Cookie', cookies)
            .expect(200);

        expect(getTransactionResponse.body.transaction).toEqual(
            expect.objectContaining({
                title: "New Transaction",
                amount: 5000,
            }),
        );
    });

    it("should be able to get the summary", async () => {
        const createTransactionResponse = await request(app.server).post("/transactions").send({
            title: "Credit Transaction",
            amount: 5000,
            type: "credit"
        });

        const cookies = createTransactionResponse.get("Set-Cookie");

        await request(app.server).post("/transactions")
        .set('Cookie', cookies)
        .send({
            title: "Debit Transaction",
            amount: 2000,
            type: "debit"
        });

        const summaryResponse = await request(app.server)
            .get("/transactions/summary")
            .set("Cookie", cookies)
            .expect(200);

        expect(summaryResponse.body.summary).toEqual({
            amount: 3000
        });
    });
});
