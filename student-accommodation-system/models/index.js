const mongoose = require('mongoose');
const { Schema } = mongoose;

const opts = { timestamps: true, versionKey: false };

// Helper for the business ID fields (studentId, hostelId, ...)
const businessId = (regex, label) => ({
  type: String,
  required: [true, `${label} is required`],
  unique: true,
  trim: true,
  match: [regex, `${label} format is invalid`],
});

const Student = mongoose.model('Student', new Schema({
  studentId:   businessId(/^ST\d{3,}$/, 'studentId'),
  fullName:    { type: String, required: [true, 'Full name is required'], trim: true, minlength: 3 },
  gender:      { type: String, required: [true, 'Gender is required'], enum: ['Male', 'Female', 'Other'] },
  institution: { type: String, required: [true, 'Institution is required'], trim: true },
  course:      { type: String, required: [true, 'Course is required'], trim: true },
  phone:       { type: String, required: [true, 'Phone is required'], trim: true,
                 match: [/^0\d{9}$/, 'Phone must be 10 digits starting with 0'] },
}, opts), 'students');

const Hostel = mongoose.model('Hostel', new Schema({
  hostelId:   businessId(/^H\d{3,}$/, 'hostelId'),
  hostelName: { type: String, required: [true, 'Hostel name is required'], trim: true },
  location:   { type: String, required: [true, 'Location is required'], trim: true },
  contact:    { type: String, required: [true, 'Contact is required'], trim: true,
                match: [/^0\d{9}$/, 'Contact must be 10 digits starting with 0'] },
  ownerName:  { type: String, required: [true, 'Owner name is required'], trim: true },
}, opts), 'hostels');

const Room = mongoose.model('Room', new Schema({
  roomId:      businessId(/^R\d{3,}$/, 'roomId'),
  hostelId:    { type: String, required: [true, 'hostelId is required'], index: true },
  roomNumber:  { type: String, required: [true, 'Room number is required'], trim: true },
  roomType:    { type: String, required: [true, 'Room type is required'], enum: ['Single', 'Shared', 'Double'] },
  monthlyRent: { type: Number, required: [true, 'Monthly rent is required'], min: [0, 'Rent cannot be negative'], index: true },
  status:      { type: String, enum: ['Available', 'Booked', 'Maintenance'], default: 'Available', index: true },
}, opts), 'rooms');

const Booking = mongoose.model('Booking', new Schema({
  bookingId:   businessId(/^B\d{3,}$/, 'bookingId'),
  studentId:   { type: String, required: [true, 'studentId is required'], index: true },
  roomId:      { type: String, required: [true, 'roomId is required'], index: true },
  bookingDate: { type: Date, required: [true, 'Booking date is required'] },
  status:      { type: String, enum: ['Pending', 'Confirmed', 'Cancelled'], default: 'Pending', index: true },
}, opts), 'bookings');

const Payment = mongoose.model('Payment', new Schema({
  paymentId:   businessId(/^P\d{3,}$/, 'paymentId'),
  bookingId:   { type: String, required: [true, 'bookingId is required'], index: true },
  studentId:   { type: String, required: [true, 'studentId is required'] },
  amount:      { type: Number, required: [true, 'Amount is required'], min: [0, 'Amount cannot be negative'] },
  paymentDate: { type: Date, required: [true, 'Payment date is required'] },
  status:      { type: String, enum: ['Paid', 'Partial', 'Unpaid'], default: 'Unpaid', index: true },
}, opts), 'payments');

module.exports = { Student, Hostel, Room, Booking, Payment };
