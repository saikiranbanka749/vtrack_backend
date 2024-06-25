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

router.post("/skillSetInfo-employeePortal", upload.single('resume'), async function (req, res, next) {
    try {
        const data = req.body;
        console.log("Received data:", data);
        
        const connection = await postgressqlConnection();
        if (!connection) {
            throw new Error("Failed to connect to the database");
        }

        const photoPath = req.file.filename;

        const query = `
            INSERT INTO emp_skillSetForm (id, skill_set, previous_exp, resume, certifications)
            VALUES ($1, $2, $3, $4, $5)
        `;
        
        const values = [data.id, data.skill_set, data.previous_exp, photoPath, data.certifications];
        const result = await connection.query(query, values);
        
        res.status(200).json({ message: "Data added successfully", response: result });
    } catch (e) {
        console.error("Error occurred:", e.message);
        res.status(500).json({ message: "An error occurred", error: e.message });
    }
});

router.get("/getSingleRow-employeePortal", async function(req, res, next) {
    try {
        const { id } = req.query; // Destructuring to get 'id' from 'req.query'
        console.log(req.query);

        const connection = await postgressqlConnection();

        // Using parameterized query to prevent SQL injection
        const query = 'SELECT * FROM emp_skillsetForm WHERE id = $1';
        const values = [id];
        const result = await connection.query(query, values);

        res.status(200).json({ message: "Data fetched successfully", result: result.rows });
        
        await connection.end();
    } catch (e) {
        res.status(500).json({ message: "Internal server error" });
        console.log(e);
    }
});

module.exports = router;
