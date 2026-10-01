// Usage: npm run create-admin -- "Full Name" admin@example.com "StrongPassword1"
require('../src/config/env');
const env = require('../src/config/env');
const mongoose = require('mongoose');
const User = require('../src/models/User');

(async () => {
  const [name, email, password] = process.argv.slice(2);
  if (!name || !email || !password) {
    console.error('Usage: npm run create-admin -- "Full Name" admin@example.com "StrongPassword1"');
    process.exit(1);
  }
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    console.error('Password must be at least 8 characters and include a letter and a number.');
    process.exit(1);
  }
  env.assertRequired();
  await mongoose.connect(env.mongoUri);
  try {
    const user = await User.create({ name, email, role: 'ADMIN', passwordHash: await User.hashPassword(password) });
    console.log(`Admin created: ${user.email}`);
  } catch (err) {
    console.error(err.code === 11000 ? 'A user with this email already exists.' : err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
