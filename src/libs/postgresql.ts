import * as E from 'fp-ts/lib/Either';
import * as TE from 'fp-ts/lib/TaskEither';
import { Pool, PoolClient } from 'pg';


export const tx = <A>(pool: Pool, task: (c: PoolClient) => Promise<A>): TE.TaskEither<Error, A> =>
    async () => {
        const client = await pool.connect();

        try {
            await client.query("BEGIN");
            const ret = await task(client);
            await client.query("COMMIT");
            return E.right(ret);
        } catch (e) {
            await client.query("ROLLBACK");
            return E.left(Error(`cause: ${e}`));
        } finally {
            client.release();
        }
    };
