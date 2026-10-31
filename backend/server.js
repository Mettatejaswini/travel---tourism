
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 3000;

// =====================================
// SUPABASE CONNECTION
// =====================================

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
    console.error(
        "ERROR: SUPABASE_URL or SUPABASE_SECRET_KEY is missing from .env"
    );
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseSecretKey);

// =====================================
// MIDDLEWARE
// =====================================

app.use(cors());
app.use(express.json({ limit: "20kb" }));

// =====================================
// HELPER FUNCTIONS
// =====================================

function isValidEmail(email) {
    return (
        typeof email === "string" &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    );
}

function isValidText(value, maxLength = 1000) {
    return (
        typeof value === "string" &&
        value.trim().length > 0 &&
        value.trim().length <= maxLength
    );
}

function isValidDate(value) {
    if (typeof value !== "string") return false;

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return false;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    const date = new Date(Date.UTC(year, month - 1, day));

    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day
    );
}

// =====================================
// HOME / HEALTH CHECK
// =====================================

app.get("/", (req, res) => {
    res.send("Welcome to the WanderWorld Travel & Tourism API!");
});

app.get("/api/health", (req, res) => {
    res.json({
        status: "success",
        message: "WanderWorld backend is running!"
    });
});

// =====================================
// GET ALL ACTIVE DESTINATIONS
// =====================================

app.get("/api/destinations", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("destinations")
            .select("*")
            .eq("is_active", true)
            .order("name", { ascending: true });

        if (error) throw error;

        res.json(data || []);
    } catch (error) {
        console.error("Destinations error:", error.message);

        res.status(500).json({
            error: "Unable to load destinations."
        });
    }
});

// =====================================
// CREATE A NEW BOOKING
// =====================================

app.post("/api/bookings", async (req, res) => {
    try {
        const {
            destination_id,
            customer_name,
            email,
            phone,
            travel_date,
            travelers,
            special_requests
        } = req.body;

        if (!isValidText(destination_id, 100)) {
            return res.status(400).json({
                error: "Please select a destination."
            });
        }

        if (!isValidText(customer_name, 100)) {
            return res.status(400).json({
                error: "Please enter your name."
            });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({
                error: "Please enter a valid email address."
            });
        }

        if (!isValidText(phone, 20)) {
            return res.status(400).json({
                error: "Please enter your phone number."
            });
        }

        if (!isValidDate(travel_date)) {
            return res.status(400).json({
                error: "Please enter a valid travel date."
            });
        }

        const today = new Date();
        const todayString =
            today.getFullYear() + "-" +
            String(today.getMonth() + 1).padStart(2, "0") + "-" +
            String(today.getDate()).padStart(2, "0");

        if (travel_date < todayString) {
            return res.status(400).json({
                error: "Travel date cannot be in the past."
            });
        }

        if (
            !Number.isInteger(travelers) ||
            travelers < 1 ||
            travelers > 50
        ) {
            return res.status(400).json({
                error: "Number of travelers must be between 1 and 50."
            });
        }

        if (
            special_requests !== undefined &&
            special_requests !== "" &&
            (
                typeof special_requests !== "string" ||
                special_requests.length > 1000
            )
        ) {
            return res.status(400).json({
                error: "Special requests must be 1000 characters or fewer."
            });
        }

        // Check that the destination exists and is active
        const { data: destination, error: destinationError } =
            await supabase
                .from("destinations")
                .select("id, name")
                .eq("id", destination_id)
                .eq("is_active", true)
                .maybeSingle();

        if (destinationError) throw destinationError;

        if (!destination) {
            return res.status(400).json({
                error: "The selected destination does not exist or is unavailable."
            });
        }

        // Save the booking in Supabase
        const { data: booking, error: bookingError } = await supabase
            .from("bookings")
            .insert([
                {
                    destination_id,
                    customer_name: customer_name.trim(),
                    email: email.trim(),
                    phone: phone.trim(),
                    travel_date,
                    travelers,
                    special_requests:
                        typeof special_requests === "string"
                            ? special_requests.trim()
                            : "",
                    status: "Pending"
                }
            ])
            .select("id, travel_date, travelers, status")
            .single();

        if (bookingError) throw bookingError;

        res.status(201).json({
            message: "Booking submitted successfully.",
            booking: {
                id: booking.id,
                travel_date: booking.travel_date,
                travelers: booking.travelers,
                status: booking.status || "Pending"
            }
        });
    } catch (error) {
        console.error("Booking error:", error.message);

        res.status(500).json({
            error: "Unable to create booking. Please check the server and database."
        });
    }
});

// =====================================
// PUBLIC BOOKINGS
// Shows only safe booking information
// =====================================

app.get("/api/public-bookings", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("bookings")
            .select(`
                travel_date,
                travelers,
                status,
                destinations(name)
            `)
            .order("created_at", { ascending: false });

        if (error) throw error;

        const publicBookings = (data || []).map((booking) => ({
            destination:
                booking.destinations?.name || "Unknown destination",
            travel_date: booking.travel_date,
            travelers: booking.travelers,
            status: booking.status || "Pending"
        }));

        res.json(publicBookings);
    } catch (error) {
        console.error("Public bookings error:", error.message);

        res.status(500).json({
            error: "Unable to load public bookings. Check your Supabase tables and destination relationship."
        });
    }
});

// =====================================
// CONTACT FORM
// =====================================

app.post("/api/contact", async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        if (!isValidText(name, 100)) {
            return res.status(400).json({
                error: "Please enter your name."
            });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({
                error: "Please enter a valid email address."
            });
        }

        if (!isValidText(subject, 150)) {
            return res.status(400).json({
                error: "Please enter a subject."
            });
        }

        if (!isValidText(message, 2000)) {
            return res.status(400).json({
                error: "Please enter a message."
            });
        }

        const { error } = await supabase
            .from("contact_messages")
            .insert([
                {
                    name: name.trim(),
                    email: email.trim(),
                    subject: subject.trim(),
                    message: message.trim()
                }
            ]);

        if (error) throw error;

        res.status(201).json({
            message: "Your contact message was sent successfully."
        });
    } catch (error) {
        console.error("Contact error:", error.message);

        res.status(500).json({
            error: "Unable to send your message. Please try again."
        });
    }
});

// =====================================
// UNKNOWN API ROUTES
// =====================================

app.use("/api", (req, res) => {
    res.status(404).json({
        error: "API endpoint not found."
    });
});

// =====================================
// START SERVER
// =====================================

app.listen(PORT, () => {
    console.log(
        `WanderWorld backend running at http://localhost:${PORT}`
    );
});
