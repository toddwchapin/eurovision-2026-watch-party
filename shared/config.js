/* Single configuration source. Emulator mode is restricted to loopback and a demo project. */
window.EurovisionConfig = {
  "year": "2026",
  "firebaseConfig": {
    "apiKey": "AIzaSyBQ1OT4gV8j0uOeltypIAq4IWZ1vkvIx2Y",
    "authDomain": "eurovision-watch-party.firebaseapp.com",
    "databaseURL": "https://eurovision-watch-party-default-rtdb.firebaseio.com",
    "projectId": "eurovision-watch-party",
    "storageBucket": "eurovision-watch-party.firebasestorage.app",
    "messagingSenderId": "267617361444",
    "appId": "1:267617361444:web:cdcb248eacd071dde842b1"
  }
};
if (new URLSearchParams(location.search).get("emulator") === "1" || sessionStorage.getItem("ev_emulator") === "1") {
  if (!["localhost", "127.0.0.1"].includes(location.hostname)) throw new Error("Emulators require localhost");
  sessionStorage.setItem("ev_emulator", "1");
  EurovisionConfig.emulator = true;
  EurovisionConfig.firebaseConfig = { apiKey: "demo-key", projectId: "demo-eurovision", authDomain: "demo-eurovision.firebaseapp.com", databaseURL: "http://127.0.0.1:9000?ns=demo-eurovision-default-rtdb" };
}
// To enable App Check, set appCheckSiteKey here after provisioning reCAPTCHA.
