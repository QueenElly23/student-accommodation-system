require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { Student, Hostel, Room, Booking, Payment } = require('../models');
const data = require('./seedData');

(async () => {
  try {
    await connectDB();
    const sets = [
      ['students', Student, data.students], ['hostels', Hostel, data.hostels], ['rooms', Room, data.rooms],
      ['bookings', Booking, data.bookings], ['payments', Payment, data.payments],
    ];
    for (const [name, Model, docs] of sets) {
      await Model.deleteMany({});
      await Model.syncIndexes();
      const inserted = await Model.insertMany(docs); // validated by the schema
      console.log(`  ${name.padEnd(9)} -> ${inserted.length} documents inserted`);
    }
    console.log('Seeding complete: 30 documents in each of the 5 collections (150 total).');
  } catch (err) {
    console.error('Seeding failed:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
