// Sample queries from Section 6 of the case document + extras.
// Run:  mongosh studentAccommodationDB scripts/mongosh-queries.js
print('--- 6.1 All students (first 3) ---');           printjson(db.students.find().limit(3).toArray());
print('--- 6.2 Available rooms ---');                   printjson(db.rooms.find({ status: 'Available' }).toArray());
print('--- 6.3 Rooms <= 200,000 UGX ---');              printjson(db.rooms.find({ monthlyRent: { $lte: 200000 } }).toArray());
print('--- 6.4 Confirmed bookings (count) ---');        print(db.bookings.countDocuments({ status: 'Confirmed' }));
print('--- 6.5 Unpaid payments ---');                   printjson(db.payments.find({ status: 'Unpaid' }).toArray());
print('--- 6.6 Number of rooms ---');                   print(db.rooms.countDocuments());
print('--- 6.7 Hostel names and locations (first 5) ---');
printjson(db.hostels.find({}, { hostelName: 1, location: 1, _id: 0 }).limit(5).toArray());
print('--- Extra: total money received ---');
printjson(db.payments.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]).toArray());
