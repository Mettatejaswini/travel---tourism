
"use strict";

// =====================================
// WANDERWORLD - FRONTEND JAVASCRIPT
// =====================================

const API_URL = "http://localhost:3000/api";

// Get HTML elements
const destinationList = document.getElementById("destination-list");
const destinationSelect = document.getElementById("destination_id");
const bookingForm = document.getElementById("booking-form");
const contactForm = document.getElementById("contact-form");

const bookingMessage = document.getElementById("booking-message");
const contactStatus = document.getElementById("contact-status");

const publicBookingsBody = document.getElementById("public-bookings-body");
const publicBookingsMessage = document.getElementById(
    "public-bookings-message"
);
const refreshBookingsButton = document.getElementById(
    "refresh-public-bookings"
);

// =====================================
// SEND REQUESTS TO BACKEND
// =====================================

async function sendRequest(url, options = {}) {
    let response;

    try {
        response = await fetch(url, options);
    } catch (error) {
        throw new Error(
            "Cannot connect to the backend. Please run node server.js."
        );
    }

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            result.error || "Request failed. Please try again."
        );
    }

    return result;
}

// =====================================
// LOAD DESTINATIONS
// =====================================

async function loadDestinations() {
    if (!destinationList || !destinationSelect) {
        console.error("Destination HTML elements are missing.");
        return;
    }

    destinationList.textContent = "Loading destinations...";

    try {
        const destinations = await sendRequest(
            `${API_URL}/destinations`
        );

        destinationList.replaceChildren();

        destinationSelect.replaceChildren();

        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = "Select a destination";
        destinationSelect.appendChild(defaultOption);

        if (!Array.isArray(destinations) || destinations.length === 0) {
            destinationList.textContent =
                "No destinations available. Please check your Supabase data.";
            return;
        }

        destinations.forEach(function (destination) {
            // Create destination card
            const card = document.createElement("article");
            card.className = "destination-card";

            // Destination image
            if (destination.image_url) {
                const image = document.createElement("img");
                image.src = destination.image_url;
                image.alt = destination.name || "Travel destination";
                image.loading = "lazy";

                image.onerror = function () {
                    image.style.display = "none";
                };

                card.appendChild(image);
            }

            // Destination name
            const title = document.createElement("h3");
            title.textContent = destination.name || "Destination";

            // Description
            const description = document.createElement("p");
            description.textContent = destination.description || "";

            // Price
            const price = document.createElement("p");
            price.className = "price";

            const amount = Number(destination.price_per_person || 0);

            price.textContent =
                "₹" + amount.toLocaleString("en-IN") + " per person";

            // Duration
            const duration = document.createElement("p");
            duration.textContent =
                `${destination.duration_days || 1} days`;

            // Book Now button
            const bookButton = document.createElement("button");
            bookButton.type = "button";
            bookButton.className = "btn book-button";
            bookButton.textContent = "Book Now";
            bookButton.dataset.id = destination.id;

            card.append(
                title,
                description,
                price,
                duration,
                bookButton
            );

            destinationList.appendChild(card);

            // Add destination to booking dropdown
            const option = document.createElement("option");
            option.value = destination.id;
            option.textContent = destination.name || "Destination";

            destinationSelect.appendChild(option);
        });
    } catch (error) {
        console.error("Destination loading error:", error);
        destinationList.textContent = error.message;
    }
}

// =====================================
// BOOK NOW BUTTON
// =====================================

if (destinationList) {
    destinationList.addEventListener("click", function (event) {
        const button = event.target.closest(".book-button");

        if (!button) {
            return;
        }

        if (destinationSelect) {
            destinationSelect.value = button.dataset.id;
        }

        const bookingSection = document.getElementById("booking");

        if (bookingSection) {
            bookingSection.scrollIntoView({
                behavior: "smooth"
            });
        }
    });
}

// =====================================
// BOOKING CONFIRMATION BOX
// =====================================

let confirmationBox = document.getElementById("booking-confirmation");

if (!confirmationBox && bookingForm) {
    confirmationBox = document.createElement("div");
    confirmationBox.id = "booking-confirmation";
    confirmationBox.className = "booking-confirmation";
    confirmationBox.hidden = true;

    bookingForm.insertAdjacentElement("afterend", confirmationBox);
}

function showBookingConfirmation(details) {
    if (!confirmationBox) {
        return;
    }

    confirmationBox.replaceChildren();
    confirmationBox.hidden = false;

    const heading = document.createElement("h3");
    heading.textContent = "Booking Submitted!";
    confirmationBox.appendChild(heading);

    const intro = document.createElement("p");
    intro.textContent =
        "Thank you for choosing WanderWorld. Your booking has been saved.";
    confirmationBox.appendChild(intro);

    const fields = [
        ["Booking Reference", details.id],
        ["Customer Name", details.customer_name],
        ["Email", details.email],
        ["Destination", details.destination],
        ["Travel Date", details.travel_date],
        ["Number of Travelers", details.travelers],
        ["Status", details.status || "Pending"]
    ];

    fields.forEach(function (item) {
        const label = item[0];
        const value = item[1];

        const row = document.createElement("p");
        const strong = document.createElement("strong");

        strong.textContent = label + ": ";

        row.appendChild(strong);
        row.appendChild(
            document.createTextNode(String(value ?? "Not available"))
        );

        confirmationBox.appendChild(row);
    });

    confirmationBox.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}

// =====================================
// SUBMIT BOOKING
// =====================================

if (bookingForm) {
    bookingForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const submitButton = bookingForm.querySelector(
            'button[type="submit"]'
        );

        if (bookingMessage) {
            bookingMessage.textContent = "Submitting your booking...";
        }

        if (submitButton) {
            submitButton.disabled = true;
        }

        if (confirmationBox) {
            confirmationBox.hidden = true;
        }

        try {
            const booking = Object.fromEntries(
                new FormData(bookingForm).entries()
            );

            booking.travelers = Number(booking.travelers);

            const selectedOption =
                destinationSelect &&
                destinationSelect.selectedIndex >= 0
                    ? destinationSelect.options[
                        destinationSelect.selectedIndex
                    ]
                    : null;

            const destinationName = selectedOption
                ? selectedOption.textContent
                : "Selected destination";

            const result = await sendRequest(
                `${API_URL}/bookings`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(booking)
                }
            );

            const savedBooking = result.booking || {};

            if (bookingMessage) {
                bookingMessage.textContent =
                    "Your booking was submitted successfully!";
            }

            showBookingConfirmation({
                id: savedBooking.id,
                customer_name: booking.customer_name,
                email: booking.email,
                destination: destinationName,
                travel_date: booking.travel_date,
                travelers: booking.travelers,
                status: savedBooking.status || "Pending"
            });

            bookingForm.reset();

            // Reload the public list after a booking
            await loadPublicBookings();
        } catch (error) {
            console.error("Booking submission error:", error);

            if (bookingMessage) {
                bookingMessage.textContent = error.message;
            }
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
            }
        }
    });
}

// =====================================
// SUBMIT CONTACT MESSAGE
// =====================================

if (contactForm) {
    contactForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const submitButton = contactForm.querySelector(
            'button[type="submit"]'
        );

        if (contactStatus) {
            contactStatus.textContent = "Sending your message...";
        }

        if (submitButton) {
            submitButton.disabled = true;
        }

        try {
            const contact = Object.fromEntries(
                new FormData(contactForm).entries()
            );

            await sendRequest(`${API_URL}/contact`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(contact)
            });

            if (contactStatus) {
                contactStatus.textContent =
                    "Your message was sent successfully!";
            }

            contactForm.reset();
        } catch (error) {
            console.error("Contact form error:", error);

            if (contactStatus) {
                contactStatus.textContent = error.message;
            }
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
            }
        }
    });
}

// =====================================
// LOAD PUBLIC BOOKINGS
// =====================================

async function loadPublicBookings() {
    if (!publicBookingsBody || !publicBookingsMessage) {
        console.warn(
            "Public bookings elements were not found in index.html."
        );
        return;
    }

    publicBookingsBody.replaceChildren();
    publicBookingsMessage.textContent = "Loading bookings...";

    if (refreshBookingsButton) {
        refreshBookingsButton.disabled = true;
    }

    try {
        const bookings = await sendRequest(
            `${API_URL}/public-bookings`
        );

        if (!Array.isArray(bookings) || bookings.length === 0) {
            publicBookingsMessage.textContent =
                "No bookings available yet.";

            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 4;
            cell.textContent = "No travel bookings to display.";

            row.appendChild(cell);
            publicBookingsBody.appendChild(row);

            return;
        }

        bookings.forEach(function (booking) {
            const row = document.createElement("tr");

            const values = [
                booking.destination || "Unknown destination",
                booking.travel_date || "Not specified",
                booking.travelers ?? "Not specified",
                booking.status || "Pending"
            ];

            values.forEach(function (value) {
                const cell = document.createElement("td");
                cell.textContent = String(value);
                row.appendChild(cell);
            });

            publicBookingsBody.appendChild(row);
        });

        publicBookingsMessage.textContent =
            `Showing ${bookings.length} public booking(s).`;
    } catch (error) {
        console.error("Public bookings loading error:", error);

        publicBookingsMessage.textContent =
            "Could not load bookings. " + error.message;

        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 4;
        cell.textContent =
            "Unable to load bookings. Please try again.";

        row.appendChild(cell);
        publicBookingsBody.appendChild(row);
    } finally {
        if (refreshBookingsButton) {
            refreshBookingsButton.disabled = false;
        }
    }
}

// Refresh button
if (refreshBookingsButton) {
    refreshBookingsButton.addEventListener(
        "click",
        loadPublicBookings
    );
}

// =====================================
// PREVENT PAST TRAVEL DATES
// =====================================

const travelDateInput = document.getElementById("travel_date");

if (travelDateInput) {
    const now = new Date();

    const localToday = new Date(
        now.getTime() - now.getTimezoneOffset() * 60000
    )
        .toISOString()
        .split("T")[0];

    travelDateInput.min = localToday;
}

// =====================================
// INITIAL PAGE LOAD
// =====================================

loadDestinations();
loadPublicBookings();
