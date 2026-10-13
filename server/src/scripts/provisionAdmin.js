/**
 * BloodConnect — Secure Admin Account Provisioning Script
 *
 * Usage:
 *   Interactive mode:
 *     node src/scripts/provisionAdmin.js
 *
 *   CLI argument mode:
 *     node src/scripts/provisionAdmin.js --name "Admin Name" --email "admin@example.com" --password "SecurePassword123" --phone "9876543210"
 *
 * Security:
 *   - Runs purely locally; never exposes credentials over the network.
 *   - Verifies whether the account already exists in MongoDB before performing any actions.
 *   - Hashes passwords using bcryptjs (salt rounds: 10) in exact accordance with project conventions.
 *   - Only provisions the 'admin' role.
 */

const readline = require("node:readline");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dns = require("node:dns");
require("dotenv").config();

// Configure DNS resolution matching project server setup
try {
    dns.setServers(["8.8.8.8", "8.8.4.4"]);
} catch (e) {
    // Fall back to system DNS resolver if setServers fails
}

const User = require("../models/User");

const prompt = (rl, question) => {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim());
        });
    });
};

const parseArgs = () => {
    const args = process.argv.slice(2);
    const parsed = {};
    for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith("--")) {
            const key = args[i].replace(/^--/, "");
            const value = args[i + 1] && !args[i + 1].startsWith("--") ? args[++i] : true;
            parsed[key] = value;
        }
    }
    return parsed;
};

const run = async () => {
    const args = parseArgs();

    let name = args.name;
    let email = args.email;
    let password = args.password;
    let phone = args.phone || "";

    if (!name || !email || !password) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        console.log("\n========================================================");
        console.log(" BloodConnect — Administrator Account Provisioning Tool");
        console.log("========================================================\n");

        if (!name) name = await prompt(rl, "Enter Admin Full Name: ");
        if (!email) email = await prompt(rl, "Enter Admin Email: ");
        if (!password) password = await prompt(rl, "Enter Admin Password (min 8 chars): ");
        if (!phone) phone = await prompt(rl, "Enter Phone Number (optional): ");

        rl.close();
    }

    // Input Validation
    if (!name || !email || !password) {
        console.error("\n[Error] Name, email, and password are all required to provision an administrator.");
        process.exit(1);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        console.error(`\n[Error] Invalid email format: '${email}'`);
        process.exit(1);
    }

    if (password.length < 8) {
        console.error("\n[Error] For security, admin passwords must be at least 8 characters long.");
        process.exit(1);
    }

    if (!process.env.MONGO_URI) {
        console.error("\n[Error] MONGO_URI is missing from environment variables (.env).");
        process.exit(1);
    }

    try {
        console.log("\nConnecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected successfully.");

        // Check for existing account
        const normalizedEmail = email.toLowerCase().trim();
        const existingUser = await User.findOne({ email: normalizedEmail });

        if (existingUser) {
            console.error(`\n[Aborted] An account with email '${normalizedEmail}' already exists (Role: '${existingUser.role}').`);
            console.error("No modifications were made to the database.");
            await mongoose.disconnect();
            process.exit(1);
        }

        // Hash password once using bcrypt salt rounds: 10 (matching project User conventions)
        console.log("Hashing administrator password...");
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create the admin account
        const newAdmin = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: "admin",
            phone: phone.trim(),
            status: "active"
        });

        console.log("\n========================================================");
        console.log(" Administrator Provisioned Successfully!");
        console.log("========================================================");
        console.log(` Name:    ${newAdmin.name}`);
        console.log(` Email:   ${newAdmin.email}`);
        console.log(` Role:    ${newAdmin.role}`);
        console.log(` User ID: ${newAdmin._id}`);
        console.log(" Status:  Active");
        console.log("========================================================");
        console.log("You can now log in at http://localhost:5173 using the 'Admin' role.\n");

        await mongoose.disconnect();
        process.exit(0);

    } catch (err) {
        console.error("\n[Fatal Error] Provisioning failed:", err.message);
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
        process.exit(1);
    }
};

run();
