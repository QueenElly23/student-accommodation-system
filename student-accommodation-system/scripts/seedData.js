// Pure data generator (no database needed). The first 5 documents of every
// collection are exactly the ones from the mid-semester case document; the
// remaining 25 are added so every collection holds 30 records.
const pad = (n, w = 3) => String(n).padStart(w, '0');
const N = 30;

// ---------- students ----------
const ORIGINAL_STUDENTS = [
  { fullName: 'Amina Nankya',   gender: 'Female', institution: 'City University', course: 'IT' },
  { fullName: 'Brian Okello',   gender: 'Male',   institution: 'City University', course: 'Business' },
  { fullName: 'Diana Namusoke', gender: 'Female', institution: 'Central College', course: 'Nursing' },
  { fullName: 'David Kato',     gender: 'Male',   institution: 'Central College', course: 'Accounting' },
  { fullName: 'Sarah Achieng',  gender: 'Female', institution: 'City University', course: 'Education' },
];
const EXTRA_STUDENTS = [
  ['Grace Nabirye', 'Female'], ['Isaac Mukasa', 'Male'], ['Esther Akello', 'Female'], ['Peter Ochieng', 'Male'],
  ['Patricia Nalubega', 'Female'], ['Moses Ssekandi', 'Male'], ['Joan Atuhaire', 'Female'], ['Joseph Byaruhanga', 'Male'],
  ['Racheal Nakitende', 'Female'], ['Emmanuel Opio', 'Male'], ['Faith Namatovu', 'Female'], ['Daniel Tumwine', 'Male'],
  ['Mercy Auma', 'Female'], ['Samuel Kiggundu', 'Male'], ['Irene Kyomuhendo', 'Female'], ['Allan Mugerwa', 'Male'],
  ['Linda Nansubuga', 'Female'], ['Ronald Wasswa', 'Male'], ['Prossy Nabukenya', 'Female'], ['Kevin Ssenyonjo', 'Male'],
  ['Winnie Achan', 'Female'], ['Henry Lubega', 'Male'], ['Cissy Nakalema', 'Female'], ['Patrick Odongo', 'Male'],
  ['Timothy Kizza', 'Male'],
];
const INSTITUTIONS = ['City University', 'Central College', 'Bugema University', 'Makerere University', 'Kyambogo University'];
const COURSES = ['IT', 'Business', 'Nursing', 'Accounting', 'Education', 'Engineering', 'Law', 'Agriculture', 'Social Work', 'Computer Science'];

const students = Array.from({ length: N }, (_, k) => {
  const i = k + 1;
  const base = k < 5
    ? ORIGINAL_STUDENTS[k]
    : { fullName: EXTRA_STUDENTS[k - 5][0], gender: EXTRA_STUDENTS[k - 5][1],
        institution: INSTITUTIONS[i % INSTITUTIONS.length], course: COURSES[i % COURSES.length] };
  return { studentId: 'ST' + pad(i), ...base, phone: '0701' + pad(i, 6) };
});

// ---------- hostels ----------
const ORIGINAL_HOSTELS = [
  { hostelName: 'Green View Hostel', location: 'Kikoni',    ownerName: 'M. Ssemanda' },
  { hostelName: 'Pearl Residence',   location: 'Wandegeya', ownerName: 'A. Nakato' },
  { hostelName: 'Campus Comfort',    location: 'Kavule',    ownerName: 'J. Mugisha' },
  { hostelName: 'Sunrise Hostel',    location: 'Bwaise',    ownerName: 'R. Atim' },
  { hostelName: 'Hilltop Rooms',     location: 'Makerere',  ownerName: 'P. Lwanga' },
];
const HOSTEL_NAMES = ['Royal Gardens Hostel', 'Lake View Residence', 'Unity Hostel', 'Elite Courts', 'Victory Hostel',
  'Mountain View Hostel', 'Pioneer Rooms', 'Golden Gate Hostel', 'Silver Springs Hostel', 'Cornerstone Residence',
  'Nile Breeze Hostel', 'Emerald Hostel', 'Harmony Rooms', 'Savannah Lodge', 'Crown Heights Hostel',
  'Blue Haven Hostel', 'Palm Court Residence', 'Liberty Hostel', 'Horizon Rooms', 'Grace Residence',
  'Kampala Scholars Inn', 'Tulip Hostel', 'Summit Hostel', 'Oasis Residence', 'Legacy Hostel'];
const LOCATIONS = ['Kikoni', 'Wandegeya', 'Kavule', 'Bwaise', 'Makerere', 'Kasubi', 'Nakulabye', 'Mulago', 'Ntinda',
  'Kyambogo', 'Kamwokya', 'Kawempe', 'Kyebando'];
const INITIALS = ['M.', 'A.', 'J.', 'R.', 'P.', 'S.', 'K.', 'B.', 'D.'];
const SURNAMES = ['Ssemanda', 'Nakato', 'Mugisha', 'Atim', 'Lwanga', 'Kintu', 'Namukasa', 'Okurut', 'Tendo', 'Babirye',
  'Mwesigwa', 'Nankunda'];

const hostels = Array.from({ length: N }, (_, k) => {
  const i = k + 1;
  const base = k < 5
    ? ORIGINAL_HOSTELS[k]
    : { hostelName: HOSTEL_NAMES[k - 5], location: LOCATIONS[i % LOCATIONS.length],
        ownerName: `${INITIALS[i % INITIALS.length]} ${SURNAMES[i % SURNAMES.length]}` };
  return { hostelId: 'H' + pad(i), ...base, contact: '0702' + pad(i, 6) };
});

// ---------- rooms ----------
const ORIGINAL_ROOMS = [
  { roomType: 'Single', monthlyRent: 250000 }, { roomType: 'Shared', monthlyRent: 180000 },
  { roomType: 'Single', monthlyRent: 230000 }, { roomType: 'Shared', monthlyRent: 150000 },
  { roomType: 'Single', monthlyRent: 270000 },
];
const TYPES = ['Single', 'Shared', 'Double'];
const RENTS = [120000, 150000, 180000, 200000, 230000, 250000, 270000, 300000, 320000];

const rooms = Array.from({ length: N }, (_, k) => {
  const i = k + 1;
  const base = k < 5 ? ORIGINAL_ROOMS[k] : { roomType: TYPES[i % 3], monthlyRent: RENTS[i % RENTS.length] };
  return {
    roomId: 'R' + pad(i), hostelId: 'H' + pad(i),
    roomNumber: String.fromCharCode(65 + (k % 26)) + pad(i, 2),
    ...base, status: 'Available', // recalculated below from the bookings
  };
});

// ---------- bookings ----------
const FIRST_FIVE_ROOMS = ['R002', 'R005', 'R001', 'R003', 'R004']; // as in the case document
const BOOKING_STATUS = ['Confirmed', 'Confirmed', 'Pending', 'Confirmed', 'Cancelled'];

const bookings = Array.from({ length: N }, (_, k) => {
  const i = k + 1;
  return {
    bookingId: 'B' + pad(i), studentId: 'ST' + pad(i),
    roomId: k < 5 ? FIRST_FIVE_ROOMS[k] : 'R' + pad(i),
    bookingDate: new Date(Date.UTC(2026, 8, i)),
    status: BOOKING_STATUS[k % 5],
  };
});

// A room with a Confirmed booking is "Booked"
const confirmed = new Set(bookings.filter((b) => b.status === 'Confirmed').map((b) => b.roomId));
rooms.forEach((r) => { r.status = confirmed.has(r.roomId) ? 'Booked' : 'Available'; });

// ---------- payments ----------
const rentOf = Object.fromEntries(rooms.map((r) => [r.roomId, r.monthlyRent]));
const payments = bookings.map((b, k) => {
  const rent = rentOf[b.roomId];
  const status = { Confirmed: 'Paid', Pending: 'Partial', Cancelled: 'Unpaid' }[b.status];
  const amount = status === 'Paid' ? rent : status === 'Partial' ? Math.round((rent * 0.4) / 10000) * 10000 : 0;
  return { paymentId: 'P' + pad(k + 1), bookingId: b.bookingId, studentId: b.studentId,
           amount, paymentDate: b.bookingDate, status };
});

module.exports = { students, hostels, rooms, bookings, payments };
