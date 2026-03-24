import * as mongoose from 'mongoose';

const DB_CONNECTION = process.env.DB_CONNECTION;
const DB_NAME = process.env.DB_NAME;

const PLANS = [
    { name: 'free', monthlyPrice: 0, monthlyCredits: 50, maximumCredits: 100 },
    { name: 'pro', monthlyPrice: 49.99, monthlyCredits: 200, maximumCredits: 500 },
    { name: 'business', monthlyPrice: 99.99, monthlyCredits: 500, maximumCredits: 2000 },
];

async function seed(): Promise<void> {
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

    const plansCollection = db.collection('plans');

    for (const plan of PLANS) {
        const result = await plansCollection.updateOne(
            { name: plan.name },
            { $set: plan },
            { upsert: true }
        );

        if (result.upsertedCount > 0) {
            console.log(`Created plan: ${plan.name}`);
        } else if (result.modifiedCount > 0) {
            console.log(`Updated plan: ${plan.name}`);
        } else {
            console.log(`Plan already up to date: ${plan.name}`);
        }
    }

    console.log('Plan seeding completed.');
    await mongoose.disconnect();
}

seed().catch((err) => {
    console.error('Plan seeding failed:', err);
    process.exit(1);
});
