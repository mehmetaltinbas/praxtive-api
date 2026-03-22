import * as mongoose from 'mongoose';

const DB_CONNECTION = process.env.DB_CONNECTION;
const DB_NAME = process.env.DB_NAME;
const DRY_RUN = process.argv.includes('--dry-run');

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

    const exercisesCollection = db.collection('exercises');
    const exerciseSetsCollection = db.collection('exercisesets');

    const exerciseCount = await exercisesCollection.countDocuments({ type: 'mcq' });
    const exerciseSetCount = await exerciseSetsCollection.countDocuments({ type: 'mcq' });

    console.log(`Found ${exerciseCount} exercises with type 'mcq'`);
    console.log(`Found ${exerciseSetCount} exercise sets with type 'mcq'`);

    if (DRY_RUN) {
        console.log('[DRY RUN] No changes made.');
        await mongoose.disconnect();
        return;
    }

    if (exerciseCount === 0 && exerciseSetCount === 0) {
        console.log('Nothing to migrate.');
        await mongoose.disconnect();
        return;
    }

    const session = await connection.startSession();

    try {
        await session.withTransaction(async () => {
            const exerciseResult = await exercisesCollection.updateMany(
                { type: 'mcq' },
                { $set: { type: 'multipleChoice' } },
                { session },
            );

            const exerciseSetResult = await exerciseSetsCollection.updateMany(
                { type: 'mcq' },
                { $set: { type: 'multipleChoice' } },
                { session },
            );

            console.log(`Updated ${exerciseResult.modifiedCount} exercises`);
            console.log(`Updated ${exerciseSetResult.modifiedCount} exercise sets`);
        });

        console.log('Migration completed successfully.');
    } finally {
        await session.endSession();
        await mongoose.disconnect();
    }
}

migrate().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});

// ROLLBACK (run manually if needed):
// db.exercises.updateMany({ type: 'multipleChoice' }, { $set: { type: 'mcq' } })
// db.exercisesets.updateMany({ type: 'multipleChoice' }, { $set: { type: 'mcq' } })
