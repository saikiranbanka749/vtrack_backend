const express = require("express");
const router = express.Router();
const postgressqlConnection = require("../databasepg");
const schedule = require("node-schedule");
const nodemailer = require("nodemailer");

// Setup nodemailer transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'thullurivamsi25@gmail.com',
        pass: 'klggzpqfwlufmmko'  // Make sure the password has no spaces
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Execute queries and schedule jobs
(async () => {
    // Establish PostgreSQL client connection
    const client = await postgressqlConnection();

    // Query definitions
    const query1 = `SELECT TO_CHAR(dob, 'YYYY-MM-DD') AS dob, emp_id FROM emp_personal_details`;
    const query2 = `SELECT TO_CHAR(anniversary_date, 'YYYY-MM-DD') AS anniversary_date, emp_id FROM emp_additional_details_form`;

    try {
        // Execute queries
        const result1 = await client.query(query1);
        const result2 = await client.query(query2);

        const currDate = new Date();

        // Scheduling birthday reminders at 6 AM
        for (const row of result1.rows) {
            const dobDate = new Date(row.dob);
            dobDate.setHours(19, 33, 0, 0); // Set time to 6:00 AM

            if (dobDate.getDate() === currDate.getDate() && dobDate.getMonth() === currDate.getMonth()) {
                const result3 = await client.query("SELECT emp_first_name, email FROM emp_details WHERE emp_id = $1", [row.emp_id]);
                const name = result3.rows[0].emp_first_name;
                const email = result3.rows[0].email;

                schedule.scheduleJob(dobDate, () => {
                    console.log("Today is my birthday");
                    const mailOptions = {
                        from: 'thullurivamsi25@gmail.com',
                        to: email,
                        subject: 'Birthday Reminder',
                        text: `Happy Birthday, ${name}!`
                    };

                    transporter.sendMail(mailOptions, (error, info) => {
                        if (error) {
                            console.error('Error sending email:', error);
                        } else {
                            console.log('Email sent successfully:', info.response);
                        }
                    });
                });
            }
        }

        // Scheduling work anniversary reminders at 6 AM
        for (const row of result2.rows) {
            const anniversaryDate = new Date(row.anniversary_date);
            anniversaryDate.setHours(6, 0, 0, 0); // Set time to 6:00 AM

            if (anniversaryDate.getDate() === currDate.getDate() && anniversaryDate.getMonth() === currDate.getMonth()) {
                const result4 = await client.query("SELECT emp_first_name, email FROM emp_details WHERE emp_id = $1", [row.emp_id]);
                const name = result4.rows[0].emp_first_name;
                const email = result4.rows[0].email;

                schedule.scheduleJob(anniversaryDate, () => {
                    const mailOptions = {
                        from: 'thullurivamsi25@gmail.com',
                        to: email,
                        subject: 'Work Anniversary Reminder',
                        text: `Happy Work Anniversary, ${name}!`
                    };

                    transporter.sendMail(mailOptions, (error, info) => {
                        if (error) {
                            console.error('Error sending email:', error);
                        } else {
                            console.log('Email sent successfully:', info.response);
                        }
                    });
                });
            }
        }

        console.log("Jobs scheduled successfully!");
    } catch (err) {
        console.error("Error scheduling jobs:", err);
    }
})();

module.exports = router;


// const express = require("express");
// const router = express.Router();
// const schedule = require("node-schedule");
// const nodemailer = require("nodemailer");

// (async () => {
//     try {
//         const currDate = new Date();

//         // Set the target date and time for the job
//         const dobDate = new Date("2024-07-16T19:46:00.000+05:30");
//         dobDate.setHours(14, 15, 0, 0); // Set time to 6:00 AM

//         // Check if the current date matches the target date (ignoring time)
//         if (dobDate.getDate() === currDate.getDate() && dobDate.getMonth() === currDate.getMonth()) {
//             const name = "Vamsi";
//             const email = "mr.vamsithulluri25@gmail.com";
//             const transporter = nodemailer.createTransport({
//                 service: 'gmail',
//                 auth: {
//                     user: 'thullurivamsi25@gmail.com', // Replace with your email
//                     pass: 'klgg zpqf wluf mmko'   // Replace with your email password
//                 }
//             });

//             const mailOptions = {
//                 from: 'thullurivamsi25@gmail.com', // Replace with your email
//                 to: email,
//                 subject: 'Birth day wishes',
//                 text: `Hello ,\n\n Today ${name} birth day wish him`
//             };

//             // Schedule the job to run at the target date and time
//             schedule.scheduleJob(dobDate, () => {
//                 console.log("Today is my birthday");

//                 transporter.sendMail(mailOptions, (error, info) => {
//                     if (error) {
//                         console.error('Error sending email:', error);
//                     } else {
//                         console.log('Email sent successfully:', info.response);
//                     }
//                 });
//             });
//         }
//         const name = "Vamsi";
//         const email = "mr.vamsithulluri25@gmail.com";

//         const mailOptions1 = {
//             from: 'thullurivamsi25@gmail.com', // Replace with your email
//             to: email,
//             subject: 'Time sheet Reminder',
//             text: `Hello ${name},\n\nThis is your Time sheet reminder email\n\n Kindly fill it.`
//         };

//         // Schedule the job to run every Friday at 6:00 AM
//         schedule.scheduleJob({hour: 6, minute: 0, dayOfWeek: 5}, () => {
//             console.log("Sending weekly reminder email...");

//             transporter.sendMail(mailOptions1, (error, info) => {
//                 if (error) {
//                     console.error('Error sending email:', error);
//                 } else {
//                     console.log('Email sent successfully:', info.response);
//                 }
//             });
//         });
//         console.log("Jobs scheduled successfully!");
//     } catch (err) {
//         console.error("Error scheduling jobs:", err);
//     }
// })();

// module.exports = router;

