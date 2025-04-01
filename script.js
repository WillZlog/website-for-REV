document.addEventListener('DOMContentLoaded', function () {
    // Global variable to store availability data
    let availability = {};

    // URL of your deployed Apps Script web app (same URL is used for GET and POST)
    const appsScriptURL = "https://script.google.com/macros/s/AKfycbwqNQ5uhPNrsPaN_8j-TFoNqRq5qHjosSgKUpvcrFhA--m1ijEmWbJpbSlpL3RVefR2/exec";

    // -----------------------------
    // 1. Load Availability Data from Apps Script (GET)
    // -----------------------------
    fetch(appsScriptURL)
        .then(response => response.json())
        .then(data => {
            // The data returned from doGet should be an array of objects
            // Example object: { tutor: "Ethan", date: "2025-04-01", time: "10:00 AM - 11:00 AM", status: "" }
            data.forEach(row => {
                // Skip booked slots (assumes a "booked" status; adjust as needed)
                if (row.status && row.status.toLowerCase() === "booked") return;
                let tutor = row.tutor.toLowerCase().trim();
                let date = row.date.trim();
                let time = row.time.trim();
                if (!availability[tutor]) {
                    availability[tutor] = {};
                }
                if (!availability[tutor][date]) {
                    availability[tutor][date] = [];
                }
                availability[tutor][date].push(time);
            });
            console.log("Loaded availability:", availability);
        })
        .catch(err => console.error("Error loading availability:", err));

    // -----------------------------
    // 2. Tutor Tabs Functionality
    // -----------------------------
    const tablinks = document.querySelectorAll('.tablink');
    if (tablinks.length > 0) {
        tablinks.forEach(tab => {
            tab.addEventListener('click', function () {
                tablinks.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
            });
        });
    }

    // -----------------------------
    // 3. Calendar Modal & Booking UI
    // -----------------------------
    const calendarGrid = document.querySelector('.calendar-grid');
    const calendarModal = document.getElementById('calendarModal');
    const calendarDetails = document.getElementById('calendarDetails');
    const calendarClose = calendarModal ? calendarModal.querySelector('.calendar-close') : null;
    const bookingConfirmation = document.getElementById('bookingConfirmation');

    // When a user clicks a calendar cell...
    if (calendarGrid && calendarModal && calendarDetails) {
        calendarGrid.addEventListener('click', function (e) {
            const cell = e.target.closest('.calendar-cell');
            if (!cell || cell.classList.contains('empty')) return;
            const selectedDate = cell.getAttribute('data-date');
            const activeTab = document.querySelector('.tablink.active');
            const activeTutor = activeTab ? activeTab.getAttribute('data-tab') : null;
            // Look up available times for that tutor on that date
            let times = (activeTutor && availability[activeTutor] && availability[activeTutor][selectedDate]) || [];
            let html = `<h3>Available Times for ${activeTutor ? (activeTutor.charAt(0).toUpperCase() + activeTutor.slice(1)) : ""} on ${selectedDate}</h3>`;
            if (times.length > 0) {
                html += `<div class="available-times-container">`;
                times.forEach(time => {
                    html += `<div class="available-time" data-date="${selectedDate}" data-time="${time}" data-tutor="${activeTutor}">
                      ${time}<span class="book-text">Book Now</span>
                     </div>`;
                });
                html += `</div>`;
            } else {
                html += "<p>No available times on this date.</p>";
            }
            calendarDetails.innerHTML = html;
            calendarModal.style.display = 'block';
        });
    }

    // When a user clicks an available time card, send a POST to book it
    if (calendarDetails) {
        calendarDetails.addEventListener('click', function (e) {
            const card = e.target.closest('.available-time');
            if (card) {
                const date = card.getAttribute('data-date');
                const time = card.getAttribute('data-time');
                const tutor = card.getAttribute('data-tutor');
                // -----------------------------
                // 4. Book Slot via POST to Apps Script
                // -----------------------------
                fetch(appsScriptURL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tutor, date, time })
                })
                    .then(response => response.json())
                    .then(result => {
                        if (result.success) {
                            // Remove the booked slot from the UI and update the availability object
                            card.style.display = 'none';
                            bookingConfirmation.textContent = `You have booked ${tutor ? (tutor.charAt(0).toUpperCase() + tutor.slice(1)) : ""}'s session on ${date} at ${time}.`;
                            bookingConfirmation.classList.remove('hidden');
                            setTimeout(() => {
                                bookingConfirmation.classList.add('hidden');
                            }, 5000);
                            if (availability[tutor] && availability[tutor][date]) {
                                availability[tutor][date] = availability[tutor][date].filter(t => t !== time);
                            }
                            if (!calendarDetails.querySelector('.available-time')) {
                                calendarModal.style.display = 'none';
                            }
                        } else {
                            alert("Booking failed: " + result.message);
                        }
                    })
                    .catch(err => alert("Error booking slot: " + err));
            }
        });
    }

    // Modal close handlers
    if (calendarClose) {
        calendarClose.addEventListener('click', function () {
            calendarModal.style.display = 'none';
        });
    }
    window.addEventListener('click', function (e) {
        if (calendarModal && e.target === calendarModal) {
            calendarModal.style.display = 'none';
        }
    });
});