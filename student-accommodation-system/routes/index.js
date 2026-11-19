const express = require('express');
const { crudRouter, HttpError } = require('./crud');
const { Student, Hostel, Room, Booking, Payment } = require('../models');

const router = express.Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Re-calculates a room's status from its bookings (Confirmed => Booked)
async function syncRoomStatus(roomId) {
  if (!roomId) return;
  const room = await Room.findOne({ roomId });
  if (!room || room.status === 'Maintenance') return;
  const hasConfirmed = await Booking.exists({ roomId, status: 'Confirmed' });
  const status = hasConfirmed ? 'Booked' : 'Available';
  if (room.status !== status) { room.status = status; await room.save(); }
}

// ---------------- Students ----------------
router.use('/students', crudRouter({
  Model: Student, idField: 'studentId', prefix: 'ST',
  searchFields: ['studentId', 'fullName', 'institution', 'course', 'phone'],
  beforeDelete: async (s) => {
    if (await Booking.exists({ studentId: s.studentId }) || await Payment.exists({ studentId: s.studentId }))
      throw new HttpError(409, 'Cannot delete: this student has bookings/payments. Remove those first.');
  },
}));

// ---------------- Hostels ----------------
router.use('/hostels', crudRouter({
  Model: Hostel, idField: 'hostelId', prefix: 'H',
  searchFields: ['hostelId', 'hostelName', 'location', 'ownerName', 'contact'],
  beforeDelete: async (h) => {
    if (await Room.exists({ hostelId: h.hostelId }))
      throw new HttpError(409, 'Cannot delete: this hostel still has rooms. Remove the rooms first.');
  },
}));

// ---------------- Rooms ----------------
router.use('/rooms', crudRouter({
  Model: Room, idField: 'roomId', prefix: 'R',
  searchFields: ['roomId', 'roomNumber', 'hostelId', 'roomType'],
  validate: async (r) => {
    if (!(await Hostel.exists({ hostelId: r.hostelId })))
      throw new HttpError(400, `Hostel '${r.hostelId}' does not exist`);
  },
  beforeDelete: async (r) => {
    if (await Booking.exists({ roomId: r.roomId }))
      throw new HttpError(409, 'Cannot delete: this room has bookings. Remove the bookings first.');
  },
}));

// ---------------- Bookings ----------------
router.use('/bookings', crudRouter({
  Model: Booking, idField: 'bookingId', prefix: 'B',
  searchFields: ['bookingId', 'studentId', 'roomId'],
  validate: async (b, previous) => {
    if (!(await Student.exists({ studentId: b.studentId })))
      throw new HttpError(400, `Student '${b.studentId}' does not exist`);
    const room = await Room.findOne({ roomId: b.roomId }).lean();
    if (!room) throw new HttpError(400, `Room '${b.roomId}' does not exist`);
    if (b.status === 'Confirmed') {
      if (room.status === 'Maintenance')
        throw new HttpError(400, `Room '${b.roomId}' is under maintenance`);
      const clash = await Booking.exists({
        roomId: b.roomId, status: 'Confirmed',
        bookingId: { $ne: previous ? previous.bookingId : b.bookingId },
      });
      if (clash) throw new HttpError(409, `Room '${b.roomId}' already has a confirmed booking`);
    }
  },
  beforeDelete: async (b) => {
    if (await Payment.exists({ bookingId: b.bookingId }))
      throw new HttpError(409, 'Cannot delete: this booking has payments. Remove the payments first.');
  },
  afterChange: async (doc, prev) => {
    for (const id of new Set([doc && doc.roomId, prev && prev.roomId])) await syncRoomStatus(id);
  },
}));

// ---------------- Payments ----------------
router.use('/payments', crudRouter({
  Model: Payment, idField: 'paymentId', prefix: 'P',
  searchFields: ['paymentId', 'bookingId', 'studentId'],
  validate: async (p) => {
    const booking = await Booking.findOne({ bookingId: p.bookingId }).lean();
    if (!booking) throw new HttpError(400, `Booking '${p.bookingId}' does not exist`);
    if (!p.studentId) p.studentId = booking.studentId;
    if (p.studentId !== booking.studentId)
      throw new HttpError(400, `Booking '${p.bookingId}' belongs to ${booking.studentId}, not ${p.studentId}`);
  },
}));

// ---------------- Dashboard statistics (aggregation) ----------------
router.get('/stats', wrap(async (req, res) => {
  const [students, hostels, rooms, bookings, payments, availableRooms, revenue, bookingStatus, paymentStatus, roomStatus] =
    await Promise.all([
      Student.countDocuments(), Hostel.countDocuments(), Room.countDocuments(),
      Booking.countDocuments(), Payment.countDocuments(),
      Room.countDocuments({ status: 'Available' }),
      Payment.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
      Booking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Payment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } }]),
      Room.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);
  const toMap = (arr) => Object.fromEntries(arr.map((x) => [x._id, x.count]));
  res.json({
    totals: { students, hostels, rooms, bookings, payments, availableRooms },
    revenue: revenue[0] ? revenue[0].total : 0,
    bookingStatus: toMap(bookingStatus),
    paymentStatus: toMap(paymentStatus),
    roomStatus: toMap(roomStatus),
  });
}));

// ---------------- Joined report ($lookup across all 5 collections) ----------------
router.get('/reports/bookings', wrap(async (req, res) => {
  const rows = await Booking.aggregate([
    { $lookup: { from: 'students', localField: 'studentId', foreignField: 'studentId', as: 'student' } },
    { $lookup: { from: 'rooms', localField: 'roomId', foreignField: 'roomId', as: 'room' } },
    { $lookup: { from: 'payments', localField: 'bookingId', foreignField: 'bookingId', as: 'payments' } },
    { $unwind: { path: '$student', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$room', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'hostels', localField: 'room.hostelId', foreignField: 'hostelId', as: 'hostel' } },
    { $unwind: { path: '$hostel', preserveNullAndEmptyArrays: true } },
    { $addFields: { amountPaid: { $sum: '$payments.amount' } } },
    { $project: {
        _id: 0, bookingId: 1, bookingDate: 1, status: 1,
        studentName: '$student.fullName', hostelName: '$hostel.hostelName', location: '$hostel.location',
        roomNumber: '$room.roomNumber', monthlyRent: '$room.monthlyRent', amountPaid: 1,
        paymentStatus: { $arrayElemAt: ['$payments.status', 0] },
        balance: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 0,
                           { $max: [0, { $subtract: ['$room.monthlyRent', '$amountPaid'] }] }] },
    } },
    { $sort: { bookingId: 1 } },
  ]).collation({ locale: 'en', numericOrdering: true });
  res.json(rows);
}));

module.exports = router;
