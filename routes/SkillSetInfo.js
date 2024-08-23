// File: routes/SkillSetInfo.js
const express = require('express');
const postgressqlConnection = require('../databasepg');
const router = express.Router();
const multer = require('multer');
const path = require("path");

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../public/files'));
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname); // Save the file with its original name
    },
});

const upload = multer({ storage: storage });

// Ensure body-parser is used for parsing JSON bodies
router.use(express.json());

router.post("/skill_Set_form", upload.single("resume"), async (req, res, next) => {
    try {
        const client = await postgressqlConnection();
        const data = req.body;
        const fileName = req.file ? req.file.filename : null;

        console.log("Data::::==>", data);

        const query = `
            INSERT INTO skill_set_form(emp_id, skill_set, previous_exp, resume, certifications) 
            VALUES ($1, $2, $3, $4, $5) 
            RETURNING *`; // Add RETURNING * to get the inserted row

        const queryParams = [data.emp_id, data.skill_set, data.previous_exp, fileName, data.certifications];
        const result = await client.query(query, queryParams);

        if (result.rowCount > 0) {
            res.status(200).json({ message: "Data inserted successfully", data: result.rows });
        } else {
            res.status(404).json({ message: "No data found" });
        }
    } catch (e) {
        res.status(500).json({ message: "Internal server error" });
        console.log(e);
    }
});

router.get("/get_skill_set_data", async (req, res, next) => {
    try {
        const client = await postgressqlConnection();
        const emp_id = req.query.emp_id;
        console.log(emp_id);
        const query = `SELECT * FROM skill_set_form WHERE emp_id=$1`;
        const queryParams = [emp_id];
        const result = await client.query(query, queryParams);
        if (result.rowCount > 0) {
            res.status(200).json({ message: "Data fetched successfully", data: result.rows });
        } else {
            res.status(404).json("No data found");
        }
    } catch (e) {
        res.status(500).json("Internal server error");
        console.log(e);
    }
});

module.exports = router;
