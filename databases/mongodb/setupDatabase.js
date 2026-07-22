import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import path from "path";
import { fileURLToPath } from "url";

// Resolve .env path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
    path: path.join(__dirname, "../../.env"),
});

const username = encodeURIComponent(process.env.MONGO_DB_USER);
const password = encodeURIComponent(process.env.MONGO_DB_PASSWORD);

if (!username || !password) {
    console.error("❌ MONGO_DB_USER or MONGO_DB_PASSWORD not found in .env");
    process.exit(1);
}

const uri = `mongodb+srv://${username}:${password}@codepulse.q4dr9ti.mongodb.net/?appName=codepulse`;

const client = new MongoClient(uri);

async function setupDatabase() {
    try {
        // Connect
        await client.connect();
        console.log("✅ Connected to MongoDB Atlas");

        const db = client.db("codepulse");

        // ==========================
        // Create Collections
        // ==========================

        const collections = [
            "users",
            "repositories",
            "repo_files",
            "commits",
            "dependencies",
            "documentation",
            "drift_findings",
        ];

        const existingCollections = (
            await db.listCollections().toArray()
        ).map((c) => c.name);

        for (const collection of collections) {
            if (!existingCollections.includes(collection)) {
                await db.createCollection(collection);
                console.log(`✅ Created collection: ${collection}`);
            } else {
                console.log(`ℹ️ Collection already exists: ${collection}`);
            }
        }

        console.log("\n✅ Collections ready");

        // ==========================
        // Users
        // ==========================

        await db.collection("users").createIndex(
            { email: 1 },
            { unique: true }
        );

        // ==========================
        // Repositories
        // ==========================

        await db.collection("repositories").createIndex({
            user_id: 1,
        });

        // ==========================
        // Repo Files
        // ==========================

        await db.collection("repo_files").createIndex({
            repository_id: 1,
        });

        // ==========================
        // Commits
        // ==========================

        await db.collection("commits").createIndex({
            repository_id: 1,
        });

        await db.collection("commits").createIndex(
            { commit_hash: 1 },
            { unique: true }
        );

        await db.collection("commits").createIndex({
            commit_date: -1,
        });

        // ==========================
        // Dependencies
        // ==========================

        await db.collection("dependencies").createIndex({
            repository_id: 1,
        });

        // ==========================
        // Documentation
        // ==========================

        await db.collection("documentation").createIndex({
            repository_id: 1,
        });

        // ==========================
        // Drift Findings
        // ==========================

        await db.collection("drift_findings").createIndex({
            repository_id: 1,
        });

        console.log("✅ Indexes created");
        console.log("🎉 CodePulse database setup complete!");
    } catch (err) {
        console.error("❌ Error setting up database:");
        console.error(err);
    } finally {
        await client.close();
        console.log("🔌 MongoDB connection closed.");
    }
}

setupDatabase();