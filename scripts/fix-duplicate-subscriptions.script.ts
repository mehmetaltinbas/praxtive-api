import * as mongoose from 'mongoose';

const DB_CONNECTION = process.env.DB_CONNECTION;
const DB_NAME = process.env.DB_NAME;
const DRY_RUN = process.argv.includes('--dry-run');

const UNIQUE_STATUSES = ['active', 'canceled', 'pendingActivate'];

async function migrate(): Promise<void> {
    if (!DB_CONNECTION) {
        throw new Error('DB_CONNECTION env variable is required');
    }

    if (!DB_NAME) {
        throw new Error('DB_NAME env variable is required');
    }

    console.log(`Connecting to ${DB_NAME}...`);
    const connection = await mongoose.connect(DB_CONNECTION, { dbName: DB_NAME });
    const db = connection.connection.db;

    if (!db) {
        throw new Error('Failed to get database instance');
    }

    const subscriptionsCollection = db.collection('subscriptions');

    for (const status of UNIQUE_STATUSES) {
        const duplicates = await subscriptionsCollection
            .aggregate([
                { $match: { status } },
                { $group: { _id: '$user', count: { $sum: 1 }, docs: { $push: { id: '$_id', createdAt: '$createdAt' } } } },
                { $match: { count: { $gt: 1 } } },
            ])
            .toArray();

        if (duplicates.length === 0) {
            console.log(`No duplicate '${status}' subscriptions found.`);
            continue;
        }

        console.log(`Found ${duplicates.length} user(s) with duplicate '${status}' subscriptions.`);

        if (DRY_RUN) {
            for (const dup of duplicates) {
                console.log(`[DRY RUN] userId: ${dup._id}, count: ${dup.count}, docs: ${JSON.stringify(dup.docs)}`);
            }
            continue;
        }

        const session = await connection.startSession();

        try {
            await session.withTransaction(async () => {
                for (const dup of duplicates) {
                    const sorted = dup.docs.sort(
                        (a: { createdAt: Date }, b: { createdAt: Date }) =>
                            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                    );
                    const idsToExpire = sorted.slice(1).map((d: { id: mongoose.Types.ObjectId }) => d.id);

                    const result = await subscriptionsCollection.updateMany(
                        { _id: { $in: idsToExpire } },
                        { $set: { status: 'expired', endedAt: new Date() } },
                        { session }
                    );

                    console.log(
                        `userId: ${dup._id} — kept newest '${status}' subscription, expired ${result.modifiedCount} duplicate(s)`
                    );
                }
            });
        } finally {
            await session.endSession();
        }
    }

    console.log('Cleanup completed.');
    await mongoose.disconnect();
}

migrate().catch((err) => {
    console.error('Cleanup failed:', err);
    process.exit(1);
});
