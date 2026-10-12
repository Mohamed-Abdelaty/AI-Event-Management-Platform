/**
 * seed_full.js
 * ============
 * Comprehensive seed script for the Event Registration platform.
 *
 * Creates:
 *   - 500 regular users  (user1 … user500,  password: 123456)
 *   - 20  venue owners   (venue-user1 … venue-user20, password: 123456)
 *   - 20  venues         (one per owner, platform-booked, status: approved)
 *   - 50  events         (different organizers, categories, venues)
 *   - Bookings           (random users booking 1-3 events each, 1-3 tickets)
 *   - Expired events     (~15 events in the past) with refunded bookings
 *   - Favorites          (each user favourites 1-4 random events)
 *   - Wallet top-ups     (every user starts with a random balance)
 *   - Payment records    (per booking)
 *   - Notifications      (booking confirmations, refunds, etc.)
 *   - Venue bookings     (events linked to venues through venue_bookings)
 *
 * Run from the backend/ directory:
 *   node seed_full.js
 */

'use strict';

const mysql   = require('mysql2/promise');
const bcrypt  = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// ─── DB CONFIG ────────────────────────────────────────────────────────────────
const DB = {
  host:     process.env.DB_HOST || 'localhost',
  user:     process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'event_registration_db',
  multipleStatements: false
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const PLAIN_PASSWORD  = '123456';
const USER_COUNT      = 500;
const VENUE_USER_COUNT = 20;
const VENUE_COUNT     = 20;
const EVENT_COUNT     = 50;

// ─── LOOKUP DATA ──────────────────────────────────────────────────────────────
const GOVERNORATES = [
  'Cairo','Alexandria','Giza','Luxor','Aswan','Hurghada',
  'Port Said','Ismailia','Suez','Mansoura','Tanta','Sharm El Sheikh',
  'Assiut','Sohag','Qena','Beni Suef','Fayoum','Zagazig','Damanhur','Minya'
];

const EVENT_CATEGORIES = [
  'Music','Technology','Art','Sports','Business','Education',
  'Health & Wellness','Food & Drink','Fashion','Comedy',
  'Film & Cinema','Gaming','Science','Travel','Charity',
  'Photography','Dance','Literature','Theater','Networking'
];

const EVENT_TITLES = [
  // Music
  'Cairo Jazz Night','Electronic Music Rave','Nile River Concert','Classical Orchestra Evening','Underground Hip-Hop Festival',
  // Technology
  'AI & Machine Learning Summit','Startup Pitch Competition','Blockchain Innovation Conference','Cloud Computing Workshop','Cybersecurity Bootcamp',
  // Art
  'Contemporary Art Exhibition','Street Art Festival','Digital Art Showcase','Sculpture Garden Tour','Photography Masters Class',
  // Sports
  'Marathon City Run','Beach Volleyball Tournament','Martial Arts Championship','Cycling Grand Prix','Swimming Open Water Race',
  // Business
  'Entrepreneurs Forum','Investment & Finance Summit','Marketing Strategy Workshop','Leadership Masterclass','Women in Business Conference',
  // Education
  'STEM Education Symposium','Language Learning Bootcamp','Academic Research Fair','Online Learning Expo','Children Science Camp',
  // Health & Wellness
  'Yoga & Meditation Retreat','Nutrition & Wellness Workshop','Mental Health Awareness Day','Fitness Challenge Weekend','Holistic Healing Fair',
  // Food & Drink
  'Street Food Festival','Wine & Cheese Evening','International Cuisine Night','Cooking Masterclass','Farm-to-Table Dinner',
  // Comedy & Entertainment
  'Stand-Up Comedy Night','Magic & Illusion Show','Escape Room Championship','Trivia Quiz Night','Improv Theater Evening',
  // Mixed / Other
  'Book Launch & Reading','Fashion Week Gala','Film Screening Under Stars','Gaming Convention','Charity Gala Dinner'
];

const VENUE_CATEGORIES = [
  'conference_hall','wedding_hall','outdoor_garden','rooftop','theater',
  'sports_hall','hotel_ballroom','art_gallery','beach_venue','private_villa',
  'conference_hall','wedding_hall','outdoor_garden','rooftop','theater',
  'sports_hall','hotel_ballroom','art_gallery','beach_venue','private_villa'
];

const VENUE_NAMES = [
  'Grand Cairo Conference Center','Alexandria Waterfront Hall','Giza Pyramid Ballroom',
  'Luxor Nile Rooftop','Aswan Sunrise Garden','Sharm El Sheikh Beach Venue',
  'Port Said Maritime Hall','Mansoura Elite Conference','Tanta Cultural Center',
  'Ismailia Garden Estate','Hurghada Coral Resort Hall','Zagazig Convention Hub',
  'Sohag Heritage Hall','Qena Classic Theater','Suez Bay Arena',
  'Assiut University Hall','Beni Suef Sports Complex','Fayoum Lakeside Venue',
  'Damanhur Royal Ballroom','Minya Pharaonic Garden'
];

const AMENITIES_POOL = [
  'WiFi','Parking','Catering','Air Conditioning','Stage','Sound System',
  'Projector','Green Room','Dressing Room','Security','Valet Parking',
  'Rooftop Access','Pool','Garden','Bar','VIP Lounge'
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN(arr, n) {
  const copy = [...arr];
  const result = [];
  for (let i = 0; i < Math.min(n, copy.length); i++) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

function fmtDate(d) {
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function futureDate(daysAhead, hour = 18) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hour, 0, 0, 0);
  return fmtDate(d);
}

function pastDate(daysAgo, hour = 18) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return fmtDate(d);
}

function recentPast(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - rand(1, daysAgo));
  d.setHours(rand(8, 22), rand(0, 59), rand(0, 59), 0);
  return fmtDate(d);
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('⏳ Connecting to database …');
  const db = await mysql.createConnection(DB);
  console.log('✅ Connected.\n');

  try {
    // ── 0A. Check if already seeded ───────────────────────────────────────
    const [existCheck] = await db.execute("SELECT COUNT(*) as cnt FROM users WHERE username = 'user1'");
    if (existCheck[0].cnt > 0) {
      console.log('⚠️  Detected existing seed data. Cleaning up first …');
      // Clean up in reverse dependency order
      await db.execute('SET FOREIGN_KEY_CHECKS = 0');
      await db.execute("DELETE FROM direct_chat_messages WHERE sender_id IN (SELECT id FROM users WHERE username REGEXP '^user[0-9]+$' OR username REGEXP '^venue-user[0-9]+$')");
      await db.execute("DELETE FROM direct_chats WHERE host_user_id IN (SELECT id FROM users WHERE username REGEXP '^user[0-9]+$' OR username REGEXP '^venue-user[0-9]+$')");
      await db.execute("DELETE FROM event_chat_messages WHERE user_id IN (SELECT id FROM users WHERE username REGEXP '^user[0-9]+$' OR username REGEXP '^venue-user[0-9]+$')");
      await db.execute("DELETE FROM event_chat_read_state WHERE user_id IN (SELECT id FROM users WHERE username REGEXP '^user[0-9]+$' OR username REGEXP '^venue-user[0-9]+$')");
      await db.execute("DELETE FROM favorites WHERE user_id IN (SELECT id FROM users WHERE username REGEXP '^user[0-9]+$' OR username REGEXP '^venue-user[0-9]+$')");
      await db.execute("DELETE FROM notifications WHERE user_id IN (SELECT id FROM users WHERE username REGEXP '^user[0-9]+$' OR username REGEXP '^venue-user[0-9]+$')");
      await db.execute("DELETE FROM wallet_transactions WHERE user_id IN (SELECT id FROM users WHERE username REGEXP '^user[0-9]+$' OR username REGEXP '^venue-user[0-9]+$')");
      await db.execute("DELETE FROM payments WHERE user_id IN (SELECT id FROM users WHERE username REGEXP '^user[0-9]+$' OR username REGEXP '^venue-user[0-9]+$')");
      await db.execute("DELETE FROM bookings WHERE user_id IN (SELECT id FROM users WHERE username REGEXP '^user[0-9]+$' OR username REGEXP '^venue-user[0-9]+$')");
      await db.execute("DELETE FROM venue_bookings WHERE host_id IN (SELECT id FROM users WHERE username REGEXP '^user[0-9]+$' OR username REGEXP '^venue-user[0-9]+$')");
      await db.execute("DELETE FROM events WHERE organizer_id IN (SELECT id FROM users WHERE username REGEXP '^user[0-9]+$' OR username REGEXP '^venue-user[0-9]+$')");
      await db.execute("DELETE FROM venues WHERE owner_id IN (SELECT id FROM users WHERE username REGEXP '^venue-user[0-9]+$')");
      await db.execute("DELETE FROM users WHERE username REGEXP '^user[0-9]+$' OR username REGEXP '^venue-user[0-9]+$'");
      await db.execute('SET FOREIGN_KEY_CHECKS = 1');
      console.log('  ✓ Cleanup done.\n');
    }

    // ── 0B. Hash the common password ──────────────────────────────────────
    console.log('🔐 Hashing password …');
    const hashedPw = await bcrypt.hash(PLAIN_PASSWORD, 10);

    // ════════════════════════════════════════════════════════════════════════
    // 1. REGULAR USERS  (user1 … user500)
    // ════════════════════════════════════════════════════════════════════════
    console.log(`👥 Creating ${USER_COUNT} regular users …`);
    const userIds = [];
    for (let i = 1; i <= USER_COUNT; i++) {
      const id        = uuidv4();
      const username  = `user${i}`;
      const email     = `user${i}@eventsplatform.com`;
      const fullName  = `User ${i}`;
      const walletBal = (rand(0, 50) * 100).toFixed(2); // 0 – 5000 EGP
      await db.execute(
        `INSERT INTO users
           (id, username, password, email, full_name, role, wallet_balance, frozen_balance, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, 'user', ?, 0.00, 1, NOW())`,
        [id, username, hashedPw, email, fullName, walletBal]
      );
      userIds.push(id);
    }
    console.log(`  ✓ ${USER_COUNT} users created.\n`);

    // ════════════════════════════════════════════════════════════════════════
    // 2. VENUE-OWNER USERS  (venue-user1 … venue-user20)
    // ════════════════════════════════════════════════════════════════════════
    console.log(`🏛️  Creating ${VENUE_USER_COUNT} venue-owner users …`);
    const venueOwnerIds = [];
    for (let i = 1; i <= VENUE_USER_COUNT; i++) {
      const id       = uuidv4();
      const username = `venue-user${i}`;
      const email    = `venue.user${i}@eventsplatform.com`;
      const fullName = `Venue Owner ${i}`;
      await db.execute(
        `INSERT INTO users
           (id, username, password, email, full_name, role, wallet_balance, frozen_balance, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, 'venue_owner', 0.00, 0.00, 1, NOW())`,
        [id, username, hashedPw, email, fullName]
      );
      venueOwnerIds.push(id);
    }
    console.log(`  ✓ ${VENUE_USER_COUNT} venue-owner users created.\n`);

    // ════════════════════════════════════════════════════════════════════════
    // 3. VENUES  (one per venue-owner)
    // ════════════════════════════════════════════════════════════════════════
    console.log(`🏟️  Creating ${VENUE_COUNT} venues …`);
    const venueIds = [];
    for (let i = 0; i < VENUE_COUNT; i++) {
      const ownerId     = venueOwnerIds[i];
      const gov         = GOVERNORATES[i];
      const category    = VENUE_CATEGORIES[i];
      const stdSeats    = rand(50, 200);
      const spcSeats    = rand(20, 80);
      const vipSeats    = rand(10, 40);
      const totalCap    = stdSeats + spcSeats + vipSeats;
      const pricePerDay = rand(2000, 15000);
      const pricePerHr  = Math.round(pricePerDay / 8);
      const amenities   = JSON.stringify(pickN(AMENITIES_POOL, rand(4, 8)));
      const images      = JSON.stringify([
        `https://picsum.photos/seed/venue${i+1}a/800/600`,
        `https://picsum.photos/seed/venue${i+1}b/800/600`
      ]);
      const lat = (25 + Math.random() * 6).toFixed(6);
      const lng = (29 + Math.random() * 5).toFixed(6);

      const [res] = await db.execute(
        `INSERT INTO venues
           (name, description, governorate, address, latitude, longitude, category,
            total_capacity, standard_seats, special_seats, vip_seats,
            price_per_day, price_per_hour, rating, total_reviews, min_hours,
            amenities, images, is_featured, is_available,
            owner_id, status, venue_type,
            contact_phone, contact_email, cancellation_policy, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          VENUE_NAMES[i],
          `A premier ${category.replace(/_/g,' ')} located in ${gov}. Perfect for all kinds of events.`,
          gov,
          `${rand(1,200)} ${pick(['El Nasr','Tahrir','El Haram','Mohamed Ali','Salah Salem'])} St, ${gov}`,
          lat, lng, category,
          totalCap, stdSeats, spcSeats, vipSeats,
          pricePerDay, pricePerHr,
          (rand(30, 50) / 10).toFixed(2), rand(5, 120), rand(4, 8),
          amenities, images,
          i < 5 ? 1 : 0,  // first 5 are featured
          1,               // is_available
          ownerId, 'approved', 'platform',
          `+2010${rand(10000000, 99999999)}`,
          `venue${i+1}@eventsplatform.com`,
          'Full refund if cancelled 7+ days before event. 50% refund within 3-7 days. No refund within 3 days.'
        ]
      );
      venueIds.push(res.insertId);
    }
    console.log(`  ✓ ${VENUE_COUNT} venues created.\n`);

    // ════════════════════════════════════════════════════════════════════════
    // 4. EVENTS  (50 events, ~15 past/expired, ~35 upcoming)
    // ════════════════════════════════════════════════════════════════════════
    console.log(`🎉 Creating ${EVENT_COUNT} events …`);
    const eventIds     = [];
    const eventDetails = []; // { id, organizerId, priceStd, priceSpc, priceVip, maxSeats, stdSeats, spcSeats, vipSeats, isExpired, title }

    const PAST_EVENTS  = 15;  // events in the past (expired)
    const FUTURE_EVENTS = EVENT_COUNT - PAST_EVENTS;

    for (let i = 0; i < EVENT_COUNT; i++) {
      const eventId      = uuidv4();
      const isExpired    = i < PAST_EVENTS;
      // Each event gets a UNIQUE user as its organizer (user1 to user50)
      const organizerId  = userIds[i];
      const category     = EVENT_CATEGORIES[i % EVENT_CATEGORIES.length];
      const title        = EVENT_TITLES[i] || `${category} Event ${i + 1}`;
      const gov          = pick(GOVERNORATES);

      const stdSeats = rand(30, 150);
      const spcSeats = rand(10, 60);
      const vipSeats = rand(5, 30);
      const maxSeats = stdSeats + spcSeats + vipSeats;

      const priceStd = rand(50, 500);
      const priceSpc = rand(200, 800);
      const priceVip = rand(500, 1500);

      const eventDateStr = isExpired
        ? pastDate(rand(15, 180), rand(14, 21))
        : futureDate(rand(5, 300), rand(10, 21));

      const regDeadline = isExpired
        ? pastDate(rand(16, 185), 23)
        : futureDate(rand(1, 4), 23);

      const lifecycle = isExpired ? 'expired' : 'active';
      const bookingDate = isExpired ? pastDate(rand(20, 200)) : recentPast(60);

      // Venue types distribution:
      // ~68% (first 34) book from platform venue owners
      // ~16% (next 8) have external/host-owned venues
      // ~16% (last 8) are online events
      let venueType = 'platform_booked';
      let locationType = 'physical';
      let venueId = null;
      let venueBookingId = null;
      let venueAddress = '';

      if (i < 34) {
        // Book through registered platform venues
        venueType = 'platform_booked';
        locationType = 'physical';
        const venueIndex = i % VENUE_COUNT;
        venueId = venueIds[venueIndex];
        const venueOwnerId = venueOwnerIds[venueIndex];
        const venuePricePerDay = rand(2000, 15000);
        venueAddress = `${VENUE_NAMES[venueIndex]}, ${gov}`;

        const [vbRes] = await db.execute(
          `INSERT INTO venue_bookings
             (venue_id, event_id, host_id,
              event_date, total_price, status, payment_status,
              responded_at, booked_at)
           VALUES (?, NULL, ?, ?, ?, ?, ?, NOW(), ?)`,
          [
            venueId, organizerId,
            eventDateStr.slice(0, 10),
            venuePricePerDay,
            isExpired ? 'confirmed' : 'accepted',
            'paid',
            bookingDate
          ]
        );
        venueBookingId = vbRes.insertId;

        // Venue owner wallet credit for the venue booking
        await db.execute(
          `INSERT INTO wallet_transactions
             (transaction_id, user_id, amount, type, source, description,
              related_venue_booking_id, status, created_at)
           VALUES (?, ?, ?, 'credit', 'venue-booking', ?, ?, ?, ?)`,
          [
            uuidv4(), venueOwnerId, venuePricePerDay,
            `Venue booking payment for event: ${title}`,
            venueBookingId,
            isExpired ? 'available' : 'held',
            bookingDate
          ]
        );

        // Organiser wallet debit for venue booking
        await db.execute(
          `INSERT INTO wallet_transactions
             (transaction_id, user_id, amount, type, source, description,
              related_venue_booking_id, status, created_at)
           VALUES (?, ?, ?, 'debit', 'venue-booking', ?, ?, 'available', ?)`,
          [
            uuidv4(), organizerId, venuePricePerDay,
            `Venue rental payment: ${VENUE_NAMES[venueIndex]}`,
            venueBookingId, bookingDate
          ]
        );

        // Create Direct Chat between Event Host and Venue Owner
        const directChatId = uuidv4();
        await db.execute(
          `INSERT INTO direct_chats (id, venue_booking_id, host_user_id, venue_owner_user_id, created_at)
           VALUES (?, ?, ?, ?, ?)`,
          [directChatId, venueBookingId, organizerId, venueOwnerId, bookingDate]
        );

        // Seed realistic direct chat dialogue between Host and Venue Owner
        const hostQuestions = [
          `Hello! We are excited to host "${title}" at your venue. Could you please confirm if audiovisual equipment is included in the package?`,
          `Hi there! For our upcoming event "${title}", when would our setup team be allowed access to the hall?`,
          `Greetings! Could we arrange a short walkthrough of the venue before the event date?`,
          `Hello! We would like to confirm the parking arrangements for our VIP guests and speakers.`
        ];
        const ownerReplies = [
          `Welcome! Yes, high-definition projectors, sound systems, and wireless microphones are fully prepared and included.`,
          `Hello! You are welcome to begin stage and audio setup 2 hours prior to the official start time.`,
          `Certainly! We would be glad to welcome your organizing committee for a walkthrough any day this week.`,
          `Confirmed! We have reserved front-gate VIP parking spaces specifically for your speakers.`
        ];

        const hostQ = hostQuestions[i % hostQuestions.length];
        const ownerR = ownerReplies[i % ownerReplies.length];

        await db.execute(
          `INSERT INTO direct_chat_messages (chat_id, sender_id, message, created_at)
           VALUES (?, ?, ?, ?)`,
          [directChatId, organizerId, hostQ, bookingDate]
        );

        await db.execute(
          `INSERT INTO direct_chat_messages (chat_id, sender_id, message, created_at)
           VALUES (?, ?, ?, ?)`,
          [directChatId, venueOwnerId, ownerR, recentPast(10)]
        );
      } else if (i < 42) {
        // Host owned external venue
        venueType = 'host_owned';
        locationType = 'physical';
        venueAddress = `${rand(10, 150)} Nile Corniche Hall, ${gov}`;
      } else {
        // Online event
        venueType = 'host_owned';
        locationType = 'online';
        venueAddress = 'Online via Zoom / Microsoft Teams Meeting';
      }

      // Now create event
      const lat = (25 + Math.random() * 6).toFixed(6);
      const lng = (29 + Math.random() * 5).toFixed(6);

      await db.execute(
        `INSERT INTO events
           (id, title, description, event_date, location, venue_address,
            organizer_id, max_seats, available_seats,
            standard_seats, special_seats, vip_seats,
            event_type, host_name, host_email, host_phone, host_organization,
            oc_name, oc_email, oc_phone,
            lead_speaker, speaker_topic, speaker_bio,
            price_standard, price_special, price_vip, pricing_notes,
            logistics, event_status, lifecycle_status, payment_status,
            image_url, location_type, venue_type, venue_id, venue_booking_id,
            governorate, latitude, longitude,
            registration_deadline, age_restriction, terms_conditions, event_agenda,
            listing_fee, ai_marketing_requested,
            expired_at, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())`,
        [
          eventId, title,
          `Join us for an unforgettable ${category.toLowerCase()} experience ${locationType === 'online' ? 'online' : 'in ' + gov}. This event brings together enthusiasts from across Egypt for an extraordinary experience, learning, and networking.`,
          eventDateStr,
          locationType === 'online' ? 'Online' : gov,
          venueAddress,
          organizerId, maxSeats, maxSeats,
          stdSeats, spcSeats, vipSeats,
          category,
          `User ${i + 1}`, `user${i + 1}@eventsplatform.com`, `+2011${rand(10000000, 99999999)}`,
          `${category} Society`,
          `OC ${i + 1}`, `oc${i + 1}@eventsplatform.com`, `+2012${rand(10000000, 99999999)}`,
          `Dr. Keynote Speaker ${i + 1}`,
          `Innovative Horizons in ${category}`,
          `Recognized thought leader in ${category} with global industry expertise.`,
          priceStd, priceSpc, priceVip,
          `Standard: ${priceStd} EGP | Special: ${priceSpc} EGP | VIP: ${priceVip} EGP`,
          locationType === 'online' ? 'Meeting link will be shared via chat and email 2 hours prior.' : 'Doors open 1 hour before start time. Badges provided at entrance.',
          'approved', lifecycle, 'paid',
          `https://picsum.photos/seed/event${i+1}/1200/600`,
          locationType, venueType,
          venueId, venueBookingId,
          gov, lat, lng,
          regDeadline,
          i % 5 === 0 ? '18+' : null,
          'By attending this event, you agree to our platform terms and conditions.',
          `09:00 Check-in & Coffee | 10:00 Keynote Address | 12:00 Interactive Session | 14:00 Networking & Closing`,
          rand(100, 500),
          i % 4 === 0 ? 1 : 0,
          isExpired ? eventDateStr : null
        ]
      );

      if (venueBookingId) {
        await db.execute(
          'UPDATE venue_bookings SET event_id = ? WHERE id = ?',
          [eventId, venueBookingId]
        );
      }

      eventIds.push(eventId);
      eventDetails.push({
        id: eventId,
        organizerId,
        priceStd, priceSpc, priceVip,
        maxSeats, stdSeats, spcSeats, vipSeats,
        isExpired,
        title
      });
    }
    console.log(`  ✓ ${EVENT_COUNT} events created.\n`);

    // ════════════════════════════════════════════════════════════════════════
    // 5. BOOKINGS  (random users, random events, 1-3 tickets each)
    // ════════════════════════════════════════════════════════════════════════
    console.log('🎫 Creating bookings …');

    // Track per-event seat usage
    const seatUsage = {}; // eventId -> { Standard: count, Special: count, Vip: count }
    eventDetails.forEach(e => {
      seatUsage[e.id] = { Standard: 0, Special: 0, Vip: 0 };
    });

    const bookingRecords = []; // for later reference
    const usedFavoritePairs = new Set();

    // Each user books a random number of events (0-4)
    // We iterate a subset of users to keep data reasonable but still varied
    const BOOKING_USERS = Math.min(USER_COUNT, 400); // first 400 users participate in bookings

    for (let u = 0; u < BOOKING_USERS; u++) {
      const userId = userIds[u];
      const numBookings = rand(0, 4);
      if (numBookings === 0) continue;

      const eventsToBook = pickN(eventIds, numBookings);

      for (const eventId of eventsToBook) {
        const ev = eventDetails.find(e => e.id === eventId);
        if (!ev) continue;

        // Pick ticket type based on availability
        const types = ['Standard','Special','Vip'];
        const ticketType = pick(types);
        const maxForType = ticketType === 'Standard' ? ev.stdSeats
                         : ticketType === 'Special' ? ev.spcSeats
                         : ev.vipSeats;
        const used = seatUsage[eventId][ticketType];
        if (used >= maxForType) continue; // no seats left for this type

        const numTickets = Math.min(rand(1, 3), maxForType - used);
        const price = ticketType === 'Standard' ? ev.priceStd
                    : ticketType === 'Special'  ? ev.priceSpc
                    : ev.priceVip;
        const totalPaid = price * numTickets;

        const bookingId     = uuidv4();
        const bookingStatus = ev.isExpired
          ? (Math.random() < 0.15 ? 'cancelled' : 'confirmed')
          : (Math.random() < 0.05 ? 'cancelled' : 'confirmed');
        const bookingDate   = ev.isExpired
          ? pastDate(rand(16, 180))
          : recentPast(60);

        // Build seat numbers array
        const startSeat = used + 1;
        const seatNums  = Array.from({ length: numTickets }, (_, k) => startSeat + k);
        const seatNumsStr = seatNums.join(',');

        await db.execute(
          `INSERT INTO bookings
             (id, event_id, user_id, seat_number, seat_numbers, status,
              ticket_type, amount_paid, payment_method, wallet_amount_used,
              attended, booking_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            bookingId, eventId, userId,
            numTickets, seatNumsStr,
            bookingStatus, ticketType,
            totalPaid,
            pick(['wallet','card','split']),
            Math.random() < 0.4 ? (totalPaid * 0.5).toFixed(2) : 0,
            ev.isExpired && bookingStatus === 'confirmed' ? (Math.random() < 0.7 ? 1 : 0) : 0,
            bookingDate
          ]
        );

        if (bookingStatus !== 'cancelled') {
          seatUsage[eventId][ticketType] += numTickets;
        }

        // Payment record
        const paymentId = uuidv4();
        const payStatus = bookingStatus === 'cancelled' ? 'refunded' : 'completed';
        await db.execute(
          `INSERT INTO payments
             (id, user_id, event_id, amount, payment_method, status, transaction_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            paymentId, userId, eventId, totalPaid,
            pick(['wallet','card']),
            payStatus,
            `TXN-${Date.now()}-${rand(1000,9999)}`,
            bookingDate
          ]
        );

        // Wallet transaction for the user (debit on booking)
        await db.execute(
          `INSERT INTO wallet_transactions
             (transaction_id, user_id, amount, type, source, description,
              related_event_id, related_booking_id, status, created_at)
           VALUES (?, ?, ?, 'debit', 'payment', ?, ?, ?, 'available', ?)`,
          [
            uuidv4(), userId, totalPaid,
            `Ticket purchase: ${ev.title} (${ticketType} x${numTickets})`,
            eventId, bookingId, bookingDate
          ]
        );

        // Refund for cancelled bookings on expired events
        if (bookingStatus === 'cancelled' && ev.isExpired) {
          const refundDate = recentPast(30);
          await db.execute(
            `INSERT INTO wallet_transactions
               (transaction_id, user_id, amount, type, source, description,
                related_event_id, related_booking_id, status, created_at)
             VALUES (?, ?, ?, 'credit', 'refund', ?, ?, ?, 'available', ?)`,
            [
              uuidv4(), userId, totalPaid,
              `Refund for cancelled booking: ${ev.title}`,
              eventId, bookingId, refundDate
            ]
          );

          // Notification for refund
          await db.execute(
            `INSERT INTO notifications
               (id, user_id, title, message, type, is_read, created_at)
             VALUES (?, ?, ?, ?, 'success', ?, ?)`,
            [
              uuidv4(), userId,
              'Refund Processed',
              `Your refund of ${totalPaid} EGP for "${ev.title}" has been processed and added to your wallet.`,
              Math.random() < 0.5 ? 1 : 0,
              refundDate
            ]
          );
        }

        // Booking confirmation notification
        await db.execute(
          `INSERT INTO notifications
             (id, user_id, title, message, type, is_read, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            uuidv4(), userId,
            bookingStatus === 'confirmed' ? 'Booking Confirmed!' : 'Booking Cancelled',
            bookingStatus === 'confirmed'
              ? `Your booking for "${ev.title}" (${ticketType} x${numTickets}) has been confirmed. See you there!`
              : `Your booking for "${ev.title}" has been cancelled. A refund will be processed shortly.`,
            bookingStatus === 'confirmed' ? 'success' : 'warning',
            Math.random() < 0.6 ? 1 : 0,
            bookingDate
          ]
        );

        // Organizer gets a notification about a new booking
        if (bookingStatus === 'confirmed') {
          await db.execute(
            `INSERT INTO notifications
               (id, user_id, title, message, type, is_read, created_at)
             VALUES (?, ?, ?, ?, 'info', ?, ?)`,
            [
              uuidv4(), ev.organizerId,
              'New Booking Received',
              `A new ${ticketType} ticket booking was made for your event "${ev.title}".`,
              Math.random() < 0.7 ? 1 : 0,
              bookingDate
            ]
          );
        }

        bookingRecords.push({ bookingId, userId, eventId, bookingStatus, totalPaid, bookingDate });
      }
    }
    console.log(`  ✓ ${bookingRecords.length} bookings created.\n`);

    // Update available_seats for each event based on confirmed bookings
    console.log('📊 Updating available seat counts …');
    for (const ev of eventDetails) {
      const used = seatUsage[ev.id];
      const totalUsed = (used.Standard || 0) + (used.Special || 0) + (used.Vip || 0);
      const remaining = Math.max(ev.maxSeats - totalUsed, 0);
      await db.execute(
        'UPDATE events SET available_seats = ? WHERE id = ?',
        [remaining, ev.id]
      );
    }
    console.log('  ✓ Available seats updated.\n');

    // ════════════════════════════════════════════════════════════════════════
    // 5B. EVENT CHAT MESSAGES (host announcements & attendees chatting)
    // ════════════════════════════════════════════════════════════════════════
    console.log('💬 Seeding event chat messages …');
    // Ensure table exists
    await db.execute(
      `CREATE TABLE IF NOT EXISTS event_chat_messages (
         id INT AUTO_INCREMENT PRIMARY KEY,
         event_id VARCHAR(36) NOT NULL,
         user_id VARCHAR(36) NOT NULL,
         username VARCHAR(255) NOT NULL,
         message TEXT NOT NULL,
         is_host BOOLEAN DEFAULT FALSE,
         is_read BOOLEAN DEFAULT FALSE,
         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
         INDEX idx_chat_event (event_id),
         INDEX idx_chat_user (user_id)
       )`
    );

    const HOST_MESSAGES = [
      'Welcome everyone to the event! Feel free to ask any questions here.',
      'A quick reminder: Please make sure to arrive 15 minutes before opening.',
      'We have finalized the agenda and looking forward to meeting all of you!',
      'All presentation materials and resources will be shared here after the sessions.',
      'Feel free to network and introduce yourselves in this chat!'
    ];

    const ATTENDEE_MESSAGES = [
      'Hi everyone! Looking forward to this event.',
      'Is there parking available on site?',
      'Excited to be attending! Is there a dress code for the evening?',
      'Thanks for organizing this! Great initiative.',
      'Will there be certificates provided after attendance?',
      'Hello from Cairo! Looking forward to meeting everyone.',
      'Can anyone recommend the best route to get there by public transport?'
    ];

    let chatMessageCount = 0;
    // Map of userId -> user index to get username
    const userIndexMap = new Map();
    userIds.forEach((id, idx) => userIndexMap.set(id, idx + 1));

    for (const ev of eventDetails) {
      const confirmedAttendees = bookingRecords.filter(
        b => b.eventId === ev.id && b.bookingStatus === 'confirmed'
      );

      // 1. Host welcome announcement
      const hostIndex = userIndexMap.get(ev.organizerId) || 1;
      const hostMsg = pick(HOST_MESSAGES);
      await db.execute(
        `INSERT INTO event_chat_messages
           (event_id, user_id, username, message, is_host, is_read, created_at)
         VALUES (?, ?, ?, ?, 1, 0, ?)`,
        [ev.id, ev.organizerId, `user${hostIndex}`, hostMsg, recentPast(20)]
      );
      chatMessageCount++;

      // 2. Chat messages from 3 to 7 attendees
      const sampleAttendees = pickN(confirmedAttendees, Math.min(confirmedAttendees.length, rand(3, 7)));
      for (const att of sampleAttendees) {
        const attIndex = userIndexMap.get(att.userId) || rand(1, USER_COUNT);
        const msg = pick(ATTENDEE_MESSAGES);
        await db.execute(
          `INSERT INTO event_chat_messages
             (event_id, user_id, username, message, is_host, is_read, created_at)
           VALUES (?, ?, ?, ?, 0, 0, ?)`,
          [ev.id, att.userId, `user${attIndex}`, msg, recentPast(15)]
        );
        chatMessageCount++;
      }
    }
    console.log(`  ✓ ${chatMessageCount} chat messages seeded across events.\n`);

    // ════════════════════════════════════════════════════════════════════════
    // 6. FAVORITES  (each user favourites 1-4 random events)
    // ════════════════════════════════════════════════════════════════════════
    console.log('❤️  Creating favorites …');
    let favCount = 0;
    for (let u = 0; u < USER_COUNT; u++) {
      const userId    = userIds[u];
      const numFavs   = rand(1, 4);
      const favEvents = pickN(eventIds, numFavs);

      for (const eventId of favEvents) {
        const key = `${userId}:${eventId}`;
        if (usedFavoritePairs.has(key)) continue;
        usedFavoritePairs.add(key);
        try {
          await db.execute(
            `INSERT IGNORE INTO favorites (id, user_id, event_id, created_at)
             VALUES (?, ?, ?, ?)`,
            [uuidv4(), userId, eventId, recentPast(90)]
          );
          favCount++;
        } catch (_) { /* ignore duplicate */ }
      }
    }
    console.log(`  ✓ ${favCount} favorites created.\n`);

    // ════════════════════════════════════════════════════════════════════════
    // 7. WALLET TOP-UPS  (simulate initial wallet funding for users)
    // ════════════════════════════════════════════════════════════════════════
    console.log('💰 Creating wallet top-up transactions …');
    for (let u = 0; u < USER_COUNT; u++) {
      const userId = userIds[u];
      const topUp  = rand(500, 5000);
      await db.execute(
        `INSERT INTO wallet_transactions
           (transaction_id, user_id, amount, type, source, description,
            status, created_at)
         VALUES (?, ?, ?, 'credit', 'top-up', 'Initial wallet top-up', 'available', ?)`,
        [uuidv4(), userId, topUp, pastDate(rand(30, 365))]
      );
    }
    console.log(`  ✓ ${USER_COUNT} top-up transactions created.\n`);

    // ════════════════════════════════════════════════════════════════════════
    // 8. ORGANIZER PAYOUTS  (for expired events)
    // ════════════════════════════════════════════════════════════════════════
    console.log('💸 Creating organizer payouts for past events …');
    let payoutCount = 0;
    for (const ev of eventDetails.filter(e => e.isExpired)) {
      const payoutDate = recentPast(14);
      const confirmedBookings = bookingRecords.filter(
        b => b.eventId === ev.id && b.bookingStatus === 'confirmed'
      );
      if (confirmedBookings.length === 0) continue;
      const totalRevenue = confirmedBookings.reduce((sum, b) => sum + b.totalPaid, 0);
      if (totalRevenue <= 0) continue;

      await db.execute(
        `INSERT INTO wallet_transactions
           (transaction_id, user_id, amount, type, source, description,
            related_event_id, status, created_at)
         VALUES (?, ?, ?, 'credit', 'event-payout', ?, ?, 'available', ?)`,
        [
          uuidv4(), ev.organizerId, totalRevenue,
          `Event revenue payout: ${ev.title}`,
          ev.id, payoutDate
        ]
      );
      payoutCount++;
    }
    console.log(`  ✓ ${payoutCount} payout transactions created.\n`);

    // ════════════════════════════════════════════════════════════════════════
    // 9. EXTRA NOTIFICATIONS  (general platform notifications)
    // ════════════════════════════════════════════════════════════════════════
    console.log('🔔 Creating extra notifications …');
    const notifMessages = [
      { title: 'Welcome to EventsPlatform!',    message: 'Thank you for joining. Explore amazing events near you!', type: 'info' },
      { title: 'New Event Near You',            message: 'Check out the latest events in your area.', type: 'info' },
      { title: 'Upcoming Event Reminder',        message: 'Your booked event is happening soon. Don\'t forget!', type: 'warning' },
      { title: 'Special Offer Available',        message: 'Get 20% off your next VIP ticket booking!', type: 'success' },
      { title: 'Profile Incomplete',             message: 'Complete your profile to get personalized event recommendations.', type: 'warning' },
    ];

    for (let u = 0; u < Math.min(USER_COUNT, 200); u++) {
      const userId = userIds[u];
      const msg    = pick(notifMessages);
      await db.execute(
        `INSERT INTO notifications
           (id, user_id, title, message, type, is_read, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(), userId, msg.title, msg.message, msg.type,
          Math.random() < 0.5 ? 1 : 0,
          recentPast(60)
        ]
      );
    }
    console.log('  ✓ Extra notifications created.\n');

    // ════════════════════════════════════════════════════════════════════════
    // DONE
    // ════════════════════════════════════════════════════════════════════════
    console.log('═══════════════════════════════════════════');
    console.log('✅  SEED COMPLETE! Summary:');
    console.log(`    Regular users    : ${USER_COUNT}      (user1 … user${USER_COUNT})`);
    console.log(`    Venue owners     : ${VENUE_USER_COUNT}       (venue-user1 … venue-user${VENUE_USER_COUNT})`);
    console.log(`    Venues           : ${VENUE_COUNT}`);
    console.log(`    Events           : ${EVENT_COUNT}  (${PAST_EVENTS} past, ${FUTURE_EVENTS} upcoming)`);
    console.log(`    Bookings         : ${bookingRecords.length}`);
    console.log(`    Favorites        : ${favCount}`);
    console.log(`    All passwords    : ${PLAIN_PASSWORD}`);
    console.log('═══════════════════════════════════════════\n');

  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    await db.end();
  }
}

main();
