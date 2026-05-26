import knex from 'knex';
import { env } from './env/index.js';

// console.log(env);

export const config = {
    client: "sqlite3",
    connection: {
        filename: env.DATABASE_URL,
    },
    useNullAsDefault: true,
};

export const db = knex(config);
