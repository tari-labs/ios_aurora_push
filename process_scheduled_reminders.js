require('dotenv').config();
const reminders = require("./lib/reminders");

(async () => {
    const {found_count, sent_count} = await reminders.process_reminders();
    console.log(`Processed ${found_count} reminders. Sent ${sent_count} reminder push notifications.`);
    process.exit();
})();

