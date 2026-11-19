# Student Accommodation Management System (MongoDB)

**Student:** Mirembe Queen Elizabeth · **Reg No:** 25/BIT/BU/R/1010 · Bugema University, School of Computing

A full-stack implementation of the mid-semester case: a MongoDB database (5 collections), a Node.js/Express REST API, and a browser front end that performs all **CRUD** operations. Every collection is loaded with **30 documents** (150 in total).

| Layer | Technology |
|---|---|
| Database | MongoDB (database `studentAccommodationDB`) |
| Back end | Node.js + Express + Mongoose |
| Front end | HTML + CSS + JavaScript (served by Express) |

---

## STEP-BY-STEP IMPLEMENTATION

### Step 1: Install the software
1. **Node.js 18 or newer** – https://nodejs.org (choose LTS). Check: `node -v` and `npm -v`.
2. **MongoDB Community Server** – https://www.mongodb.com/try/download/community (install as a service; MongoDB Compass is optional but useful for screenshots).
   *No local install? Use a free MongoDB Atlas cluster and paste its connection string in Step 4.*
3. **MongoDB Shell (mongosh)** – https://www.mongodb.com/try/download/shell
4. A code editor (VS Code).

### Step 2: Make sure MongoDB is running
- Windows: it starts as a service. Check with `mongosh` — you should see a `test>` prompt.
- macOS (Homebrew): `brew services start mongodb-community`
- Linux: `sudo systemctl start mongod`

### Step 3: Open the project and install dependencies
```bash
cd student-accommodation-system
npm install
```
This installs `express`, `mongoose` and `dotenv` into `node_modules`.

### Step 4: Configure the connection
The file `.env` already contains the defaults:
```
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/studentAccommodationDB
```
For Atlas, replace `MONGO_URI` with your Atlas connection string (ending in `/studentAccommodationDB`).

### Step 5: Load the 30 sample records per collection
```bash
npm run seed
```
Expected output:
```
  students  -> 30 documents inserted
  hostels   -> 30 documents inserted
  rooms     -> 30 documents inserted
  bookings  -> 30 documents inserted
  payments  -> 30 documents inserted
Seeding complete: 30 documents in each of the 5 collections (150 total).
```
The first 5 documents in every collection are exactly those in your case document; the other 25 were added. (Running the seed again resets the data.)
> Note: room `R003` is `Booked` here because booking `B004` for it is *Confirmed*; the seed keeps room status consistent with confirmed bookings.

### Step 6: Start the server
```bash
npm start
```
You should see `MongoDB connected` and `Server running at http://localhost:3000`.

### Step 7: Open the application
Go to **http://localhost:3000** in your browser.

### Step 8: Demonstrate every CRUD operation (take screenshots for your report)
| Operation | How to demonstrate it |
|---|---|
| **Create** | Open *Students* > **+ Add Student**, fill the form, **Create**. The ID (e.g. `ST031`) is auto-generated. Total becomes 31. |
| **Read** | Browse any tab; use the search box, status filters, "Max rent" filter on *Rooms*, and pagination. The *Dashboard* shows a joined report across all five collections. |
| **Update** | Click **Edit** on a record, change a value, **Save changes**. Confirm a booking and watch the room turn `Booked`. |
| **Delete** | Click **Delete** and confirm. |

### Step 9: Prove robustness (what to show your lecturer)
- **30 records per collection** – check the record counts on each tab (and `db.<collection>.countDocuments()` in mongosh).
- **Validation** – try phone `123` or a negative rent: the API rejects it with a clear message.
- **Referential integrity** – booking a student/room that does not exist is rejected; deleting a hostel that still has rooms (or a student with bookings) is blocked with HTTP 409.
- **No double-booking** – confirming a second booking for an already booked room is rejected.
- **Duplicate protection** – business IDs are unique (unique indexes).
- **Search/pagination** across all 30 records, plus **aggregation** on the dashboard.

### Step 10: Verify directly in MongoDB (more screenshots)
```bash
mongosh studentAccommodationDB scripts/mongosh-queries.js
```
or interactively:
```js
use studentAccommodationDB
show collections
db.students.countDocuments()                 // 30
db.rooms.find({status: "Available"})
db.rooms.find({monthlyRent: {$lte: 200000}})
db.bookings.find({status: "Confirmed"})
db.payments.find({status: "Unpaid"})
db.hostels.find({}, {hostelName: 1, location: 1, _id: 0})
```
These are the queries from Section 6 of your case document.

---

## Project structure
```
student-accommodation-system/
├── server.js              # Express app + error handling
├── config/db.js           # MongoDB connection
├── models/index.js        # 5 Mongoose schemas (validation, indexes)
├── routes/crud.js         # Reusable CRUD router (search, filter, paginate)
├── routes/index.js        # Resources, business rules, stats, joined report
├── scripts/seedData.js    # 30 records per collection
├── scripts/seed.js        # Loads the data into MongoDB
├── scripts/mongosh-queries.js
└── public/                # Front end (index.html, style.css, app.js)
```

## REST API
Each resource (`students`, `hostels`, `rooms`, `bookings`, `payments`) supports:

| Method | URL | Action |
|---|---|---|
| GET | `/api/rooms?status=Available&max_monthlyRent=200000&q=single&page=1&limit=10` | List / search / filter |
| GET | `/api/rooms/R001` | Read one |
| POST | `/api/rooms` | Create |
| PUT | `/api/rooms/R001` | Update |
| DELETE | `/api/rooms/R001` | Delete |
| GET | `/api/stats` | Dashboard totals (aggregation) |
| GET | `/api/reports/bookings` | Joined report using `$lookup` |

Quick test with curl:
```bash
curl -X POST http://localhost:3000/api/students -H "Content-Type: application/json" \
  -d '{"fullName":"Test Student","gender":"Female","institution":"Bugema University","course":"IT","phone":"0700123456"}'
curl http://localhost:3000/api/students/ST031
curl -X PUT http://localhost:3000/api/students/ST031 -H "Content-Type: application/json" -d '{"course":"Law"}'
curl -X DELETE http://localhost:3000/api/students/ST031
```

## Troubleshooting
| Problem | Fix |
|---|---|
| `Could not connect to MongoDB` | MongoDB is not running (Step 2) or `MONGO_URI` is wrong. |
| `npm: command not found` | Install Node.js (Step 1) and reopen the terminal. |
| Port 3000 already in use | Change `PORT` in `.env`. |
| Page shows no data | Run `npm run seed`, then refresh. |
