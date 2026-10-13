const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
    await mongoose.connect(process.env.MONGO_URI);
    const cols = await mongoose.connection.db.listCollections().toArray();
    for (let c of cols) {
        const docs = await mongoose.connection.db.collection(c.name).find({}).toArray();
        for (let doc of docs) {
            const str = JSON.stringify(doc);
            if (str.includes('6abe730744d5eabccb721428') || str.includes('6abe')) {
                if (c.name !== 'bloodrequests') {
                    console.log("Found in collection:", c.name);
                    console.log(str);
                }
            }
        }
    }
    process.exit(0);
}
run();
