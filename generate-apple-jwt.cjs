const fs = require("fs");
const jwt = require("jsonwebtoken");

const teamId = "AMXC5RZ9TC";        // Your Apple Team ID
const clientId = "com.cnorewards";  // Your Apple Service ID (Client ID)
const keyId = "9YUCH2N3PC";         // Your Apple Key ID

// Make sure this filename matches your .p8 file in this folder
const privateKey = fs.readFileSync("./AuthKey_9YUCH2N3PC.p8", "utf8");

const now = Math.floor(Date.now() / 1000);

const payload = {
  iss: teamId,
  iat: now,
  exp: now + 15777000,  // ~6 months
  aud: "https://appleid.apple.com",
  sub: clientId,
};

const token = jwt.sign(payload, privateKey, {
  algorithm: "ES256",
  keyid: keyId,
});

console.log("\nYOUR APPLE CLIENT SECRET JWT:\n");
console.log(token);
console.log("\nPaste this JWT into Supabase → Auth → Providers → Apple → Secret Key (for OAuth)\n");
