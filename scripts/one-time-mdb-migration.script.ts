import * as mongoose from 'mongoose';

const DB_CONNECTION = process.env.DB_CONNECTION;
const DB_NAME = process.env.DB_NAME;
const DRY_RUN = process.argv.includes('--dry-run');

/**
 * CONFIGURATION: Fill these in for each specific migration
 */
const COLLECTION_NAME = 'users';
const FILTER = {
    // Example: { sourceType: { $exists: true } }
};
const UPDATE_OPERATION = {
    // Example: { $rename: { "sourceType": "contextType" } }
};

async function migrate(): Promise<void> {
    if (!DB_CONNECTION || !DB_NAME) {
        throw new Error('DB_CONNECTION and DB_NAME env variables are required');
    }

    console.log(`--- MIGRATION START ---`);
    console.log(`Target DB: ${DB_NAME}`);
    console.log(`Collection: ${COLLECTION_NAME}`);

    const connection = await mongoose.connect(DB_CONNECTION, { dbName: DB_NAME });
    const db = connection.connection.db;

    if (!db) throw new Error('Failed to get database instance');

    const collection = db.collection(COLLECTION_NAME);

    // 1. Check for documents
    const count = await collection.countDocuments(FILTER);

    console.log(`Documents matching filter: ${count}`);

    if (DRY_RUN) {
        console.log('[DRY RUN] No changes were applied to the database.');
        await mongoose.disconnect();

        return;
    }

    if (count === 0) {
        console.log('No documents found matching the criteria. Skipping.');
        await mongoose.disconnect();

        return;
    }

    // 2. Execute Transaction
    const session = await connection.startSession();

    try {
        await session.withTransaction(async () => {
            const result = await collection.updateMany(FILTER, UPDATE_OPERATION, { session });

            console.log(`Successfully modified ${result.modifiedCount} documents.`);
        });
        console.log('--- MIGRATION COMPLETED SUCCESSFULLY ---');
    } catch (error) {
        console.error('!!! MIGRATION FAILED - Transaction Aborted !!!');
        console.error('Error Details:', error);
        throw error;
    } finally {
        await session.endSession();
        await mongoose.disconnect();
    }
}

migrate().catch((err) => {
    console.error('Process exited with error:', err);
    process.exit(1);
});
