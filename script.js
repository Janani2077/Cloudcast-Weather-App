const API_URL =
"https://jhe07nps61.execute-api.ap-south-1.amazonaws.com/weather";

const USER_ID = "user1";

// ========================================
// LOAD USER PREFERENCES
// ========================================

async function loadPreferences() {

```
console.log("Loading user preferences...");

try {

    const response = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            action: "getPreferences",
            userId: USER_ID
        })
    });

    console.log(
        "Preferences response status:",
        response.status
    );

    const data = await response.json();

    console.log(
        "Preferences API response:",
        data
    );

    if (!response.ok) {
        throw new Error(
            data.error || "Unable to load preferences"
        );
    }

    const preferences = data.preferences;


    // Load city
    document.getElementById("city").value =
        preferences.city || "";


    // Load temperature unit
    document.getElementById("unit").value =
        preferences.unit || "C";


    // Load alerts setting
    document.getElementById("alerts").checked =
        preferences.alerts === true;


    // Load email
    document.getElementById("email").value =
        preferences.email || "";


    // Load notification times
    const notificationContainer =
        document.getElementById("notificationTimes");

    notificationContainer.innerHTML = "";


    const notificationTimes =
        preferences.notificationTimes || [];


    if (notificationTimes.length === 0) {

        addNotificationTime();

    } else {

        notificationTimes.forEach(function(time) {

            addNotificationTime(time);

        });
    }


    console.log(
        "Preferences loaded successfully."
    );

} catch (error) {

    console.error(
        "Preference loading error:",
        error
    );


    // Keep one empty time field available
    const container =
        document.getElementById("notificationTimes");


    if (
        container &&
        container.children.length === 0
    ) {

        addNotificationTime();

    }
}
```

}

// ========================================
// ADD NOTIFICATION TIME
// ========================================

function addNotificationTime(value = "") {

```
console.log(
    "Add Another Time button clicked"
);


const container =
    document.getElementById("notificationTimes");


if (!container) {

    console.error(
        "notificationTimes element not found."
    );

    return;
}


const row =
    document.createElement("div");

row.className = "time-row";


// Time input
const input =
    document.createElement("input");

input.type = "time";
input.className = "notification-time";
input.value = value;


// Remove button
const removeButton =
    document.createElement("button");

removeButton.type = "button";
removeButton.textContent = "❌ Remove";


removeButton.onclick = function() {

    row.remove();

};


row.appendChild(input);
row.appendChild(removeButton);

container.appendChild(row);
```

}

// ========================================
// GET WEATHER
// ========================================

function getWeather() {

```
console.log(
    "Get My Weather button clicked"
);


if (!navigator.geolocation) {

    document.getElementById("weather").innerHTML =
        "<p>Geolocation is not supported by your browser.</p>";

    return;
}


document.getElementById("weather").innerHTML =
    "<p>📍 Detecting your location...</p>";


navigator.geolocation.getCurrentPosition(

    async function(position) {

        const latitude =
            position.coords.latitude;

        const longitude =
            position.coords.longitude;


        console.log(
            "Latitude:",
            latitude
        );

        console.log(
            "Longitude:",
            longitude
        );


        document.getElementById("weather").innerHTML =
            "<p>🌤️ Getting weather information...</p>";


        try {

            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    latitude: latitude,
                    longitude: longitude
                })
            });


            console.log(
                "Weather response status:",
                response.status
            );


            const data =
                await response.json();


            console.log(
                "Weather API response:",
                data
            );


            if (!response.ok) {

                throw new Error(
                    data.error ||
                    "Unable to get weather"
                );
            }


            // Get selected temperature unit
            const selectedUnit =
                document.getElementById("unit").value;


            const temperatureCelsius =
                Number(data.temperature);


            let temperature;
            let unitSymbol;


            if (selectedUnit === "F") {

                temperature =
                    (temperatureCelsius * 9 / 5) + 32;

                temperature =
                    temperature.toFixed(1);

                unitSymbol = "°F";

            } else {

                temperature =
                    temperatureCelsius.toFixed(1);

                unitSymbol = "°C";
            }


            document.getElementById(
                "weather"
            ).innerHTML =

                "<h2>📍 " +
                data.location +
                "</h2>" +

                "<p>🌡️ Temperature: " +
                temperature +
                unitSymbol +
                "</p>" +

                "<p>💧 Humidity: " +
                data.humidity +
                "%</p>" +

                "<p>🌧️ Weather: " +
                data.weather +
                "</p>" +

                "<p>💨 Wind Speed: " +
                data.wind_speed +
                " m/s</p>";


        } catch (error) {

            console.error(
                "Weather error:",
                error
            );


            document.getElementById(
                "weather"
            ).innerHTML =

                "<p>❌ Unable to retrieve weather.</p>" +
                "<p>" +
                error.message +
                "</p>";
        }
    },


    function(error) {

        console.error(
            "Location error:",
            error
        );


        document.getElementById(
            "weather"
        ).innerHTML =

            "<p>❌ Unable to access your location.</p>" +
            "<p>Please allow location access in your browser.</p>";
    }
);
```

}

// ========================================
// SAVE USER PREFERENCES
// ========================================

async function savePreferences() {

```
console.log(
    "Save Preferences button clicked"
);


const city =
    document.getElementById("city").value.trim();


const unit =
    document.getElementById("unit").value;


const alerts =
    document.getElementById("alerts").checked;


const email =
    document.getElementById("email").value.trim();


const message =
    document.getElementById(
        "preferenceMessage"
    );


// ========================================
// GET NOTIFICATION TIMES
// ========================================

const timeInputs =
    document.querySelectorAll(
        ".notification-time"
    );


const notificationTimes = [];


timeInputs.forEach(function(input) {

    if (input.value !== "") {

        notificationTimes.push(
            input.value
        );

    }
});


// ========================================
// GET USER TIMEZONE
// ========================================

const timezone =
    Intl.DateTimeFormat()
        .resolvedOptions()
        .timeZone;


console.log(
    "Notification times:",
    notificationTimes
);


console.log(
    "Timezone:",
    timezone
);


// ========================================
// VALIDATION
// ========================================

if (city === "") {

    message.innerHTML =
        "<p>❌ Please enter your preferred city.</p>";

    return;
}


if (alerts && email === "") {

    message.innerHTML =
        "<p>❌ Please enter an email for weather alerts.</p>";

    return;
}


if (
    alerts &&
    notificationTimes.length === 0
) {

    message.innerHTML =
        "<p>❌ Please select at least one notification time.</p>";

    return;
}


message.innerHTML =
    "<p>💾 Saving preferences...</p>";


// ========================================
// SAVE TO AWS
// ========================================

try {

    const response = await fetch(API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({

            userId: USER_ID,

            city: city,

            unit: unit,

            alerts: alerts,

            email: email,

            notificationTimes:
                notificationTimes,

            timezone: timezone

        })
    });


    console.log(
        "Preference response status:",
        response.status
    );


    const data =
        await response.json();


    console.log(
        "Preference API response:",
        data
    );


    if (!response.ok) {

        throw new Error(
            data.error ||
            "Unable to save preferences"
        );
    }


    message.innerHTML =
        "<p>✅ Preferences saved successfully!</p>";


} catch (error) {

    console.error(
        "Preference error:",
        error
    );


    message.innerHTML =
        "<p>❌ Unable to save preferences.</p>" +
        "<p>" +
        error.message +
        "</p>";
}
```

}

// ========================================
// LOAD PREFERENCES WHEN PAGE OPENS
// ========================================

window.addEventListener(
"DOMContentLoaded",
loadPreferences
);
