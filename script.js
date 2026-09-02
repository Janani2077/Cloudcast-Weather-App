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
//
// USER_ID is no longer hardcoded.
//
// It will be filled automatically from
// the Cognito user's "sub" value.
//

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
//
// PKCE is used here.
//
// The code verifier is generated BEFORE
// redirecting to Cognito and stored in
// localStorage.
//
// The callback later retrieves the same
// verifier and sends it to /oauth2/token.
//

async function loginWithCognito() {

    console.log(
        "Opening Cognito Managed Login..."
    );


    // ========================================
    // CREATE OAUTH STATE
    // ========================================

    const state =
        crypto.randomUUID();


    // ========================================
    // CREATE PKCE CODE VERIFIER
    // ========================================

    const codeVerifier =
        generateRandomString(64);


    // ========================================
    // CREATE PKCE CODE CHALLENGE
    // ========================================

    const hashedVerifier =
        await sha256(codeVerifier);

    const codeChallenge =
        arrayBufferToBase64Url(
            hashedVerifier
        );


    // ========================================
    // SAVE STATE
    // ========================================

    localStorage.setItem(
        "cloudcast_oauth_state",
        state
    );


    // ========================================
    // SAVE PKCE CODE VERIFIER
    // ========================================

    localStorage.setItem(
        "cloudcast_code_verifier",
        codeVerifier
    );

    console.log(
        "PKCE code verifier saved."
    );


    // ========================================
    // CREATE COGNITO AUTHORIZE URL
    // ========================================

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


    console.log(
        "Redirecting to Cognito..."
    );


    // ========================================
    // REDIRECT TO COGNITO
    // ========================================

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


    console.log(
        "Cognito authorization code received."
    );


    // ========================================
    // VALIDATE OAUTH STATE
    // ========================================

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

        // ========================================
        // GET PKCE CODE VERIFIER
        // ========================================

        const codeVerifier =
            localStorage.getItem(
                "cloudcast_code_verifier"
            );


        if (!codeVerifier) {

            throw new Error(
                "PKCE code verifier is missing."
            );

        }


        // ========================================
        // EXCHANGE AUTHORIZATION CODE
        // FOR TOKENS
        // ========================================

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


        console.log(
            "Cognito token response:",
            tokenData
        );


        if (!tokenResponse.ok) {

            throw new Error(

                tokenData.error_description ||

                tokenData.error ||

                "Unable to complete Cognito login."

            );

        }


        // ========================================
        // STORE TOKENS
        // ========================================

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


        // ========================================
        // REMOVE TEMPORARY OAUTH DATA
        // ========================================

        localStorage.removeItem(
            "cloudcast_oauth_state"
        );


        localStorage.removeItem(
            "cloudcast_code_verifier"
        );


        // ========================================
        // REMOVE ?code=... FROM URL
        // ========================================

        window.history.replaceState(
            {},
            document.title,
            COGNITO_REDIRECT_URI
        );


        // ========================================
        // DECODE ID TOKEN
        // ========================================

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


        // ========================================
        // SET USER ID
        // ========================================

        USER_ID =
            payload.sub;


        console.log(
            "Cognito USER_ID:",
            USER_ID
        );


        // ========================================
        // UPDATE AUTH UI
        // ========================================

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


    // ========================================
    // CHECK COGNITO REDIRECT
    // ========================================

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


    // ========================================
    // CHECK EXISTING LOGIN
    // ========================================

    const tokens =
        getStoredTokens();


    if (!tokens) {

        console.log(
            "No Cognito login found."
        );


        updateAuthUI(
            null
        );


        return;

    }


    // ========================================
    // DECODE STORED TOKEN
    // ========================================

    const payload =
        decodeJwt(
            tokens.idToken
        );


    if (
        !payload ||
        !payload.sub
    ) {

        console.log(
            "Stored Cognito token is invalid."
        );


        clearCognitoSession();


        updateAuthUI(
            null
        );


        return;

    }


    // ========================================
    // CHECK TOKEN EXPIRATION
    // ========================================

    const currentTime =
        Math.floor(
            Date.now() / 1000
        );


    if (
        payload.exp &&
        payload.exp <= currentTime
    ) {

        console.log(
            "Cognito ID token expired."
        );


        clearCognitoSession();


        updateAuthUI(
            null
        );


        return;

    }


    // ========================================
    // RESTORE SESSION
    // ========================================

    ID_TOKEN =
        tokens.idToken;


    ACCESS_TOKEN =
        tokens.accessToken;


    USER_ID =
        payload.sub;


    console.log(
        "Existing Cognito user:",
        USER_ID
    );


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

        console.log(
            "No Cognito user logged in."
        );


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


        console.log(
            "Preferences response status:",
            response.status
        );


        const data =
            await response.json();


        console.log(
            "Preferences API response:",
            data
        );


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Unable to load preferences"
            );

        }


        const preferences =
            data.preferences;


        // ========================================
        // LOAD CITY
        // ========================================

        document.getElementById(
            "city"
        ).value =
            preferences.city || "";


        // ========================================
        // LOAD TEMPERATURE UNIT
        // ========================================

        document.getElementById(
            "unit"
        ).value =
            preferences.unit || "C";


        // ========================================
        // LOAD ALERTS SETTING
        // ========================================

        document.getElementById(
            "alerts"
        ).checked =
            preferences.alerts === true;


        // ========================================
        // LOAD EMAIL
        // ========================================

        document.getElementById(
            "email"
        ).value =
            preferences.email || "";


        // ========================================
        // LOAD NOTIFICATION TIMES
        // ========================================

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

    console.log(
        "Add Another Time button clicked"
    );


    const container =
        document.getElementById(
            "notificationTimes"
        );


    if (!container) {

        console.error(
            "notificationTimes element not found."
        );


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


            console.log(
                "Latitude:",
                latitude
            );


            console.log(
                "Longitude:",
                longitude
            );


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


    // ========================================
    // GET NOTIFICATION TIMES
    // ========================================

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


    // ========================================
    // REMOVE DUPLICATE TIMES
    // ========================================

    const uniqueNotificationTimes =
        [
            ...new Set(
                notificationTimes
            )
        ];


    // ========================================
    // GET USER TIMEZONE
    // ========================================

    const timezone =
        Intl.DateTimeFormat()
            .resolvedOptions()
            .timeZone;


    console.log(
        "Notification times:",
        uniqueNotificationTimes
    );


    console.log(
        "Timezone:",
        timezone
    );


    // ========================================
    // VALIDATION
    // ========================================

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


    // ========================================
    // SAVE TO AWS
    // ========================================

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

                            /*
                             * Cognito's unique "sub"
                             * becomes the DynamoDB userId.
                             */

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

}


// ========================================
// LOAD PREFERENCES WHEN PAGE OPENS
// ========================================

window.addEventListener(
    "DOMContentLoaded",
    initializeCognito
);
