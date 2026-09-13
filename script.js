const API_URL =
    "https://jhe07nps61.execute-api.ap-south-1.amazonaws.com/weather";


// ========================================
// AMAZON COGNITO CONFIGURATION
// ========================================

const COGNITO_DOMAIN =
    "https://ap-south-1qdftxif2p.auth.ap-south-1.amazoncognito.com";

const COGNITO_CLIENT_ID =
    "6dt2rm01l39q773itr7p00la48";

const COGNITO_REDIRECT_URI =
    "http://127.0.0.1:5500/index.html";


// ========================================
// USER ID
// ========================================

let USER_ID = null;

let ID_TOKEN = null;

let ACCESS_TOKEN = null;


// ========================================
// COGNITO TOKEN STORAGE
// ========================================

function getStoredTokens() {

    const idToken =
        localStorage.getItem(
            "cloudcast_id_token"
        );

    const accessToken =
        localStorage.getItem(
            "cloudcast_access_token"
        );

    if (!idToken) {

        return null;

    }

    return {

        idToken: idToken,

        accessToken: accessToken

    };

}


// ========================================
// BASE64URL DECODER
// ========================================

function base64UrlDecode(value) {

    let base64 =
        value
            .replace(/-/g, "+")
            .replace(/_/g, "/");

    while (base64.length % 4 !== 0) {

        base64 += "=";

    }

    const binary =
        atob(base64);

    let result = "";

    for (
        let i = 0;
        i < binary.length;
        i++
    ) {

        result += String.fromCharCode(
            binary.charCodeAt(i)
        );

    }

    return result;

}


// ========================================
// DECODE JWT
// ========================================

function decodeJwt(token) {

    try {

        const parts =
            token.split(".");

        if (parts.length !== 3) {

            throw new Error(
                "Invalid ID token."
            );

        }

        const payload =
            base64UrlDecode(parts[1]);

        return JSON.parse(payload);

    } catch (error) {

        console.error(
            "JWT decode error:",
            error
        );

        return null;

    }

}


// ========================================
// LOGIN WITH COGNITO
// ========================================

async function loginWithCognito() {

    console.log(
        "Opening Cognito Managed Login..."
    );


    const state =
        crypto.randomUUID();


    const codeVerifier =
        generateRandomString(64);


    const hashedVerifier =
        await sha256(codeVerifier);

    const codeChallenge =
        arrayBufferToBase64Url(
            hashedVerifier
        );


    localStorage.setItem(
        "cloudcast_oauth_state",
        state
    );


    localStorage.setItem(
        "cloudcast_code_verifier",
        codeVerifier
    );


    const authorizeUrl =
        COGNITO_DOMAIN +
        "/oauth2/authorize" +
        "?client_id=" +
        encodeURIComponent(
            COGNITO_CLIENT_ID
        ) +
        "&response_type=code" +
        "&scope=" +
        encodeURIComponent(
            "openid email"
        ) +
        "&redirect_uri=" +
        encodeURIComponent(
            COGNITO_REDIRECT_URI
        ) +
        "&state=" +
        encodeURIComponent(
            state
        ) +
        "&code_challenge=" +
        encodeURIComponent(
            codeChallenge
        ) +
        "&code_challenge_method=S256";


    window.location.href =
        authorizeUrl;

}


// ========================================
// CREATE PKCE CODE VERIFIER
// ========================================

function generateRandomString(
    length = 64
) {

    const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

    const randomValues =
        new Uint8Array(length);

    crypto.getRandomValues(
        randomValues
    );

    let result = "";

    for (
        let i = 0;
        i < randomValues.length;
        i++
    ) {

        result +=
            characters[
                randomValues[i] %
                characters.length
            ];

    }

    return result;

}


// ========================================
// SHA256
// ========================================

async function sha256(value) {

    const data =
        new TextEncoder().encode(
            value
        );

    return await crypto.subtle.digest(
        "SHA-256",
        data
    );

}


// ========================================
// ARRAY BUFFER TO BASE64URL
// ========================================

function arrayBufferToBase64Url(
    buffer
) {

    const bytes =
        new Uint8Array(buffer);

    let binary = "";

    bytes.forEach(
        function(byte) {

            binary += String.fromCharCode(
                byte
            );

        }
    );

    return btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");

}


// ========================================
// HANDLE COGNITO CALLBACK
// ========================================

async function handleCognitoCallback() {

    const urlParams =
        new URLSearchParams(
            window.location.search
        );

    const code =
        urlParams.get("code");

    const state =
        urlParams.get("state");


    if (!code) {

        return false;

    }


    const savedState =
        localStorage.getItem(
            "cloudcast_oauth_state"
        );


    if (
        !savedState ||
        state !== savedState
    ) {

        console.error(
            "Cognito state validation failed."
        );

        alert(
            "Login failed. Invalid authentication state."
        );

        return false;

    }


    try {

        const codeVerifier =
            localStorage.getItem(
                "cloudcast_code_verifier"
            );


        if (!codeVerifier) {

            throw new Error(
                "PKCE code verifier is missing."
            );

        }


        const tokenResponse =
            await fetch(
                COGNITO_DOMAIN +
                "/oauth2/token",
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/x-www-form-urlencoded"

                    },

                    body:
                        new URLSearchParams({

                            grant_type:
                                "authorization_code",

                            client_id:
                                COGNITO_CLIENT_ID,

                            code:
                                code,

                            redirect_uri:
                                COGNITO_REDIRECT_URI,

                            code_verifier:
                                codeVerifier

                        })

                }
            );


        const tokenData =
            await tokenResponse.json();


        if (!tokenResponse.ok) {

            throw new Error(

                tokenData.error_description ||

                tokenData.error ||

                "Unable to complete Cognito login."

            );

        }


        ID_TOKEN =
            tokenData.id_token;

        ACCESS_TOKEN =
            tokenData.access_token;


        localStorage.setItem(
            "cloudcast_id_token",
            ID_TOKEN
        );


        localStorage.setItem(
            "cloudcast_access_token",
            ACCESS_TOKEN
        );


        localStorage.removeItem(
            "cloudcast_oauth_state"
        );


        localStorage.removeItem(
            "cloudcast_code_verifier"
        );


        window.history.replaceState(
            {},
            document.title,
            COGNITO_REDIRECT_URI
        );


        const payload =
            decodeJwt(ID_TOKEN);


        if (
            !payload ||
            !payload.sub
        ) {

            throw new Error(
                "Cognito user ID (sub) was not found."
            );

        }


        USER_ID =
            payload.sub;


        updateAuthUI(
            payload
        );


        return true;


    } catch (error) {

        console.error(
            "Cognito callback error:",
            error
        );


        alert(
            "Login failed: " +
            error.message
        );


        return false;

    }

}


// ========================================
// INITIALIZE COGNITO USER
// ========================================

async function initializeCognito() {

    console.log(
        "Initializing Cognito..."
    );


    const urlParams =
        new URLSearchParams(
            window.location.search
        );


    if (
        urlParams.has("code")
    ) {

        const loggedIn =
            await handleCognitoCallback();


        if (loggedIn) {

            await loadPreferences();

        }

        return;

    }


    const tokens =
        getStoredTokens();


    if (!tokens) {

        updateAuthUI(
            null
        );

        return;

    }


    const payload =
        decodeJwt(
            tokens.idToken
        );


    if (
        !payload ||
        !payload.sub
    ) {

        clearCognitoSession();

        updateAuthUI(
            null
        );

        return;

    }


    const currentTime =
        Math.floor(
            Date.now() / 1000
        );


    if (
        payload.exp &&
        payload.exp <= currentTime
    ) {

        clearCognitoSession();

        updateAuthUI(
            null
        );

        return;

    }


    ID_TOKEN =
        tokens.idToken;

    ACCESS_TOKEN =
        tokens.accessToken;

    USER_ID =
        payload.sub;


    updateAuthUI(
        payload
    );


    await loadPreferences();

}


// ========================================
// UPDATE LOGIN UI
// ========================================

function updateAuthUI(payload) {

    const loginButton =
        document.getElementById(
            "loginButton"
        );


    const logoutButton =
        document.getElementById(
            "logoutButton"
        );


    const userStatus =
        document.getElementById(
            "userStatus"
        );


    if (
        !loginButton ||
        !logoutButton ||
        !userStatus
    ) {

        return;

    }


    if (
        payload &&
        payload.sub
    ) {

        loginButton.style.display =
            "none";

        logoutButton.style.display =
            "inline-block";


        const email =
            payload.email || "";


        if (email) {

            userStatus.textContent =
                "Signed in as " +
                email;

        } else {

            userStatus.textContent =
                "Signed in to CloudCast";

        }


    } else {

        loginButton.style.display =
            "inline-block";

        logoutButton.style.display =
            "none";

        userStatus.textContent =
            "Please login to use your CloudCast account.";

    }

}


// ========================================
// CLEAR COGNITO SESSION
// ========================================

function clearCognitoSession() {

    localStorage.removeItem(
        "cloudcast_id_token"
    );

    localStorage.removeItem(
        "cloudcast_access_token"
    );

    localStorage.removeItem(
        "cloudcast_oauth_state"
    );

    localStorage.removeItem(
        "cloudcast_code_verifier"
    );


    USER_ID =
        null;

    ID_TOKEN =
        null;

    ACCESS_TOKEN =
        null;

}


// ========================================
// LOGOUT FROM COGNITO
// ========================================

function logoutFromCognito() {

    console.log(
        "Logging out from Cognito..."
    );


    clearCognitoSession();


    const logoutUrl =
        COGNITO_DOMAIN +
        "/logout" +
        "?client_id=" +
        encodeURIComponent(
            COGNITO_CLIENT_ID
        ) +
        "&logout_uri=" +
        encodeURIComponent(
            COGNITO_REDIRECT_URI
        );


    window.location.href =
        logoutUrl;

}


// ========================================
// GET AUTHORIZATION HEADERS
// ========================================

function getAuthHeaders() {

    const headers = {

        "Content-Type":
            "application/json"

    };


    if (ID_TOKEN) {

        headers["Authorization"] =
            "Bearer " + ID_TOKEN;

    }


    return headers;

}


// ========================================
// LOAD USER PREFERENCES
// ========================================

async function loadPreferences() {

    console.log(
        "Loading user preferences..."
    );


    if (!USER_ID) {

        return;

    }


    try {

        const response =
            await fetch(
                API_URL,
                {

                    method: "POST",

                    headers:
                        getAuthHeaders(),

                    body:
                        JSON.stringify({

                            action:
                                "getPreferences",

                            userId:
                                USER_ID

                        })

                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Unable to load preferences"
            );

        }


        const preferences =
            data.preferences;


        document.getElementById(
            "city"
        ).value =
            preferences.city || "";


        document.getElementById(
            "unit"
        ).value =
            preferences.unit || "C";


        document.getElementById(
            "alerts"
        ).checked =
            preferences.alerts === true;


        document.getElementById(
            "email"
        ).value =
            preferences.email || "";


        const notificationContainer =
            document.getElementById(
                "notificationTimes"
            );


        notificationContainer.innerHTML =
            "";


        const notificationTimes =
            preferences.notificationTimes || [];


        if (
            notificationTimes.length === 0
        ) {

            addNotificationTime();

        } else {

            notificationTimes.forEach(
                function(time) {

                    addNotificationTime(
                        time
                    );

                }
            );

        }


        console.log(
            "Preferences loaded successfully."
        );


    } catch (error) {

        console.error(
            "Preference loading error:",
            error
        );


        const container =
            document.getElementById(
                "notificationTimes"
            );


        if (
            container &&
            container.children.length === 0
        ) {

            addNotificationTime();

        }

    }

}


// ========================================
// ADD NOTIFICATION TIME
// ========================================

function addNotificationTime(
    value = ""
) {

    const container =
        document.getElementById(
            "notificationTimes"
        );


    if (!container) {

        return;

    }


    const row =
        document.createElement(
            "div"
        );


    row.className =
        "time-row";


    const input =
        document.createElement(
            "input"
        );


    input.type =
        "time";

    input.className =
        "notification-time";

    input.value =
        value;


    const removeButton =
        document.createElement(
            "button"
        );


    removeButton.type =
        "button";

    removeButton.textContent =
        "❌ Remove";


    removeButton.addEventListener(
        "click",
        function() {

            row.remove();

        }
    );


    row.appendChild(
        input
    );

    row.appendChild(
        removeButton
    );


    container.appendChild(
        row
    );

}


// ========================================
// UPDATE WEATHER METRICS
// ========================================

function updateWeatherMetrics(
    data,
    temperature,
    unitSymbol
) {

    const temperatureElement =
        document.getElementById(
            "metricTemperature"
        );

    const temperatureInfo =
        document.getElementById(
            "metricTemperatureInfo"
        );

    const humidityElement =
        document.getElementById(
            "metricHumidity"
        );

    const humidityInfo =
        document.getElementById(
            "metricHumidityInfo"
        );

    const windElement =
        document.getElementById(
            "metricWind"
        );

    const windInfo =
        document.getElementById(
            "metricWindInfo"
        );

    const conditionElement =
        document.getElementById(
            "metricCondition"
        );

    const conditionInfo =
        document.getElementById(
            "metricConditionInfo"
        );


    /*
     * Temperature
     */

    temperatureElement.textContent =
        temperature +
        unitSymbol;

    temperatureInfo.textContent =
        "Current temperature";


    /*
     * Humidity
     */

    if (
        data.humidity !== undefined &&
        data.humidity !== null
    ) {

        humidityElement.textContent =
            data.humidity +
            "%";

        humidityInfo.textContent =
            getHumidityDescription(
                Number(data.humidity)
            );

    } else {

        humidityElement.textContent =
            "--";

        humidityInfo.textContent =
            "Data unavailable";

    }


    /*
     * Wind
     */

    if (
        data.wind_speed !== undefined &&
        data.wind_speed !== null
    ) {

        windElement.textContent =
            data.wind_speed +
            " m/s";

        windInfo.textContent =
            getWindDescription(
                Number(data.wind_speed)
            );

    } else {

        windElement.textContent =
            "--";

        windInfo.textContent =
            "Data unavailable";

    }


    /*
     * Weather condition
     */

    if (
        data.weather
    ) {

        conditionElement.textContent =
            data.weather;

        conditionInfo.textContent =
            "Current condition";

    } else {

        conditionElement.textContent =
            "--";

        conditionInfo.textContent =
            "Data unavailable";

    }

}


// ========================================
// HUMIDITY DESCRIPTION
// ========================================

function getHumidityDescription(
    humidity
) {

    if (Number.isNaN(humidity)) {

        return "Humidity data";

    }

    if (humidity < 40) {

        return "Low moisture level";

    }

    if (humidity < 70) {

        return "Comfortable moisture level";

    }

    if (humidity < 85) {

        return "High moisture level";

    }

    return "Very high moisture level";

}


// ========================================
// WIND DESCRIPTION
// ========================================

function getWindDescription(
    speed
) {

    if (Number.isNaN(speed)) {

        return "Wind data";

    }

    if (speed < 1) {

        return "Calm conditions";

    }

    if (speed < 4) {

        return "Light breeze";

    }

    if (speed < 8) {

        return "Moderate breeze";

    }

    if (speed < 12) {

        return "Strong breeze";

    }

    return "Strong winds";

}


// ========================================
// UPDATE AI RECOMMENDATION
// ========================================

function updateAIRecommendation(
    recommendation,
    weather
) {

    const titleElement =
        document.getElementById(
            "aiRecommendationTitle"
        );

    const textElement =
        document.getElementById(
            "aiRecommendationText"
        );

    const footerElement =
        document.getElementById(
            "aiRecommendationFooter"
        );


    if (!recommendation) {

        titleElement.textContent =
            "AI recommendation unavailable";

        textElement.textContent =
            "CloudCast could not generate a recommendation from the current weather data.";

        footerElement.textContent =
            "AI recommendation unavailable";

        return;

    }


    /*
     * Keep the complete recommendation
     * returned by the backend.
     *
     * If the backend sends a single sentence,
     * display it directly.
     */

    const cleanRecommendation =
        String(
            recommendation
        ).trim();


    /*
     * Use the first sentence as the
     * recommendation heading when possible.
     */

    const sentenceMatch =
        cleanRecommendation.match(
            /^(.+?[.!?])(?:\s|$)/
        );


    if (
        sentenceMatch &&
        sentenceMatch[1].length <= 100
    ) {

        titleElement.textContent =
            sentenceMatch[1];

        const remainingText =
            cleanRecommendation
                .slice(
                    sentenceMatch[1].length
                )
                .trim();


        textElement.textContent =
            remainingText ||
            cleanRecommendation;

    } else {

        titleElement.textContent =
            "Personalized weather advice";

        textElement.textContent =
            cleanRecommendation;

    }


    footerElement.textContent =
        "Generated from current weather conditions";

}


// ========================================
// GET WEATHER
// ========================================

function getWeather() {

    console.log(
        "Get My Weather button clicked"
    );


    if (!USER_ID) {

        alert(
            "Please login to CloudCast first."
        );

        return;

    }


    if (!navigator.geolocation) {

        document.getElementById(
            "weather"
        ).innerHTML =
            "<p>Geolocation is not supported by your browser.</p>";

        return;

    }


    document.getElementById(
        "weather"
    ).innerHTML =
        "<p>📍 Detecting your location...</p>";


    navigator.geolocation.getCurrentPosition(

        async function(position) {

            const latitude =
                position.coords.latitude;

            const longitude =
                position.coords.longitude;


            document.getElementById(
                "weather"
            ).innerHTML =
                "<p>🌤️ Getting weather information...</p>";


            try {

                const response =
                    await fetch(
                        API_URL,
                        {

                            method: "POST",

                            headers:
                                getAuthHeaders(),

                            body:
                                JSON.stringify({

                                    latitude:
                                        latitude,

                                    longitude:
                                        longitude

                                })

                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        data.error ||
                        "Unable to get weather"
                    );

                }


                const selectedUnit =
                    document.getElementById(
                        "unit"
                    ).value;


                const temperatureCelsius =
                    Number(
                        data.temperature
                    );


                let temperature;

                let unitSymbol;


                if (
                    selectedUnit === "F"
                ) {

                    temperature =
                        (
                            temperatureCelsius *
                            9 /
                            5
                        ) +
                        32;


                    temperature =
                        temperature.toFixed(
                            1
                        );

                    unitSymbol =
                        "°F";

                } else {

                    temperature =
                        temperatureCelsius.toFixed(
                            1
                        );

                    unitSymbol =
                        "°C";

                }


                /*
                 * Main weather card
                 */

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


                /*
                 * Update location in hero
                 */

                const locationText =
                    document.getElementById(
                        "locationText"
                    );

                if (locationText) {

                    locationText.textContent =
                        data.location ||
                        "Current location";

                }


                /*
                 * Update timestamp
                 */

                const updatedText =
                    document.getElementById(
                        "updatedText"
                    );

                if (updatedText) {

                    updatedText.textContent =
                        "Updated just now";

                }


                /*
                 * Update the four
                 * weather metric cards
                 */

                updateWeatherMetrics(
                    data,
                    temperature,
                    unitSymbol
                );


                /*
                 * Update AI recommendation
                 */

                updateAIRecommendation(
                    data.ai_recommendation,
                    data
                );


                console.log(
                    "Weather data displayed successfully."
                );


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


                /*
                 * Do not leave dummy data
                 * in the metric cards.
                 */

                resetWeatherMetrics();


                updateAIRecommendation(
                    null,
                    null
                );

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


            resetWeatherMetrics();


            updateAIRecommendation(
                null,
                null
            );

        }

    );

}


// ========================================
// RESET WEATHER METRICS
// ========================================

function resetWeatherMetrics() {

    document.getElementById(
        "metricTemperature"
    ).textContent =
        "--";

    document.getElementById(
        "metricTemperatureInfo"
    ).textContent =
        "Weather data unavailable";


    document.getElementById(
        "metricHumidity"
    ).textContent =
        "--";

    document.getElementById(
        "metricHumidityInfo"
    ).textContent =
        "Weather data unavailable";


    document.getElementById(
        "metricWind"
    ).textContent =
        "--";

    document.getElementById(
        "metricWindInfo"
    ).textContent =
        "Weather data unavailable";


    document.getElementById(
        "metricCondition"
    ).textContent =
        "--";

    document.getElementById(
        "metricConditionInfo"
    ).textContent =
        "Weather data unavailable";


    const locationText =
        document.getElementById(
            "locationText"
        );

    if (locationText) {

        locationText.textContent =
            "Location unavailable";

    }


    const updatedText =
        document.getElementById(
            "updatedText"
        );

    if (updatedText) {

        updatedText.textContent =
            "Waiting for weather";

    }

}


// ========================================
// SAVE USER PREFERENCES
// ========================================

async function savePreferences() {

    console.log(
        "Save Preferences button clicked"
    );


    if (!USER_ID) {

        alert(
            "Please login to CloudCast before saving preferences."
        );

        return;

    }


    const cityElement =
        document.getElementById(
            "city"
        );

    const unitElement =
        document.getElementById(
            "unit"
        );

    const alertsElement =
        document.getElementById(
            "alerts"
        );

    const emailElement =
        document.getElementById(
            "email"
        );

    const message =
        document.getElementById(
            "preferenceMessage"
        );


    if (
        !cityElement ||
        !unitElement ||
        !alertsElement ||
        !emailElement ||
        !message
    ) {

        console.error(
            "One or more preference elements are missing from HTML."
        );

        return;

    }


    const city =
        cityElement.value.trim();

    const unit =
        unitElement.value;

    const alerts =
        alertsElement.checked;

    const email =
        emailElement.value.trim();


    /*
     * GET NOTIFICATION TIMES
     */

    const timeInputs =
        document.querySelectorAll(
            ".notification-time"
        );


    const notificationTimes =
        [];


    timeInputs.forEach(
        function(input) {

            if (
                input.value !== ""
            ) {

                notificationTimes.push(
                    input.value
                );

            }

        }
    );


    /*
     * REMOVE DUPLICATES
     */

    const uniqueNotificationTimes =
        [
            ...new Set(
                notificationTimes
            )
        ];


    /*
     * GET USER TIMEZONE
     */

    const timezone =
        Intl.DateTimeFormat()
            .resolvedOptions()
            .timeZone;


    /*
     * VALIDATION
     */

    if (
        city === ""
    ) {

        message.innerHTML =
            "<p>❌ Please enter your preferred city.</p>";

        return;

    }


    if (
        alerts &&
        email === ""
    ) {

        message.innerHTML =
            "<p>❌ Please enter an email for weather alerts.</p>";

        return;

    }


    if (
        alerts &&
        uniqueNotificationTimes.length === 0
    ) {

        message.innerHTML =
            "<p>❌ Please select at least one notification time.</p>";

        return;

    }


    message.innerHTML =
        "<p>💾 Saving preferences...</p>";


    try {

        const response =
            await fetch(
                API_URL,
                {

                    method: "POST",

                    headers:
                        getAuthHeaders(),

                    body:
                        JSON.stringify({

                            userId:
                                USER_ID,

                            city:
                                city,

                            unit:
                                unit,

                            alerts:
                                alerts,

                            email:
                                email,

                            notificationTimes:
                                uniqueNotificationTimes,

                            timezone:
                                timezone

                        })

                }
            );


        const data =
            await response.json();


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

}


// ========================================
// LOAD PREFERENCES WHEN PAGE OPENS
// ========================================

window.addEventListener(
    "DOMContentLoaded",
    initializeCognito
);