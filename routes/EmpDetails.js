const express = require('express');
const postgressqlConnection = require('../databasepg');
const router = express.Router();
const multer = require('multer');
const path= require("path");
const fs = require('fs');
const jwt = require('jsonwebtoken');


const secretKey = 'your_secret_key';

router.post("/login-employeePortal", async (req, res, next) => {
    const client = await postgressqlConnection();

    try {
        const { email, pwd } = req.body;

        const query = 'SELECT * FROM employeePortal WHERE email = $1';
        const values = [email];

        const result = await client.query(query, values);

        if (result.rows.length > 0 && result.rows[0].email === email && result.rows[0].pwd === pwd) {
            const token = jwt.sign({ email: result.rows[0].email, id: result.rows[0].id }, secretKey, { expiresIn: '24h' });

            res.status(200).json({ msg: "Data fetched successfully", data: result.rows[0], token: token });
        } else {
            res.status(404).json({ msg: "Employee not found or incorrect password" });
        }
    } catch (e) {
        console.error("Error:::", e);
        res.status(500).json({ msg: "Internal Server Error", error: e.message });
    } finally {
        await client.end();
    }
});



const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../public/images')); 
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix);
    },
});


const upload = multer({ storage: storage });


router.put("/update-employeePortal",
    function(req, res, next){
        const headerData=req.headers.authorization;
        if(headerData){
        jwt.verify(headerData,"your_secret_key",function(error, success){
           if(error){
            res.send("Invalid token");
           }
           else{
            next();
           }
            })
        }
        else{
            res.send("No token found");
        }
       
        
    },
    upload.single('photo'), async (req, res) => {
    try {
        const { id, ...data } = req.body;
        console.log("Received Data:", data);

        let photoData = null;
        if (req.file) {
            // Read the file contents as binary data if a new photo is uploaded
            const photoPath = req.file.path; 
            photoData = fs.readFileSync(photoPath);
        }

        const connection = await postgressqlConnection();

        let query = `
            UPDATE employeePortal 
            SET 
                e_name = $1, 
                email = $2, 
                e_role = $3, 
                designation = $4,
                manager = $5,
                e_location = $6, 
                contact = $7, 
                gender = $8, 
                project_name = $9, 
                joining_date = $10, 
                relieving_date = $11, 
                blood_group = $12, 
                status = $13, 
                updated_date = $14, 
                dob = $15, 
                anniversary_date = $16, 
                father_name = $17, 
                mother_name = $18,
                present_address = $19,
                permenant_address = $20,
                family_contact = $21,
                pwd = $22
        `;

        const queryParams = [
            data.e_name, data.email, data.e_role, data.designation, data.manager, data.e_location, data.contact,
            data.gender, data.project_name, data.joining_date,
            data.relieving_date === 'null' ? null : data.relieving_date, // Handle nullable relieving_date
            data.blood_group, data.status, data.updated_date, data.dob, data.anniversary_date,
            data.father_name, data.mother_name, data.present_address, data.permenant_address, data.family_contact, data.pwd
        ];

        if (photoData) {
            // Update photo if a new photo is uploaded
            query += ', photo = $23';
            queryParams.push(photoData);
        }

        query += ` WHERE id = $${queryParams.length + 1}`;
        queryParams.push(id);

        const result = await connection.query(query, queryParams);

        res.status(200).json({ msg: "Data updated successfully...", responseData: result });

        await connection.end();
    } catch (error) {
        console.error("Error updating data:", error);
        res.status(500).json({ error: "An error occurred while updating data" });
    }
});





router.post("/post-employeePortal",
    function(req, res, next){
        const headerData=req.headers.authorization;
        if(headerData){
        jwt.verify(headerData,"your_secret_key",function(error, success){
           if(error){
            res.send("Invalid token");
           }
           else{
            next();
           }
            })
        }
        else{
            res.send("No token found");
        }
       
        
    },
     upload.single('photo'), async (req, res) => {
    try {
        const data = req.body;
        console.log("Received Data:", data);

        const photoPath = req.file.path; 

        const photoData = fs.readFileSync(photoPath);

        const connection = await postgressqlConnection();

        const query = `
            INSERT INTO employeePortal (
                id, e_name, email, e_role, designation,manager,e_location, contact, gender, 
                project_name, joining_date, blood_group, 
                photo, status, updated_date, dob, anniversary_date, 
                father_name, mother_name,present_address,permenant_address,family_contact,pwd
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19 , $20, $21, $22, $23)
        `;

        const result = await connection.query(query, [
            data.id, data.e_name, data.email, data.e_role, data.designation,data.manager, data.e_location,data.contact,
            data.gender, data.project_name, data.joining_date,
            data.blood_group, photoData, 
            data.status, data.updated_date,
            data.dob, data.anniversary_date, data.father_name, data.mother_name,data.permenant_address,data.present_address,data.family_contact,
            data.pwd
        ]);

        res.status(200).json({ msg: "Data posted successfully...", responseData: result });

        await connection.end();
    } catch (error) {
        console.error("Error posting data:", error);
        res.status(500).json({ error: "An error occurred while posting data" });
    }
});

router.put("/delete-employeePortal", async (req, res, next) => {
    try {
        const data = req.body;
        console.log("delete::::", data);
        const connection = await postgressqlConnection();
        const query = `update employeePortal set status=$1 where id=$2`; 
        const result = await connection.query(query, [data.status,data.id]); 
        
        // if (result.rowCount === 0) {
        //     // No rows affected, meaning no data to delete
        //     res.status(404).json({ error: "No data found to delete" });
        // } else {
            // Data deleted successfully
            res.status(200).json({ msg: "Data deleted successfully",response:result });
        // }
    } catch (error) {
        console.error("Error deleting data:", error); // Use 'error' instead of 'e' for consistency
        res.status(500).json({ error: "An error occurred while deleting data" });
    }
});

router.get("/getAll-employeePortal",
    function(req, res, next){
        const headerData=req.headers.authorization;
        if(headerData){
        jwt.verify(headerData,"your_secret_key",function(error, success){
           if(error){
            res.send("Invalid token");
           }
           else{
            next();
           }
            })
        }
        else{
            res.send("No token found");
        }
       
        
    },
    async (req, res, next) => {
    try {
        const client = await postgressqlConnection();

        const query = `
            SELECT id, e_name, email, e_role, designation, manager, e_location, contact, gender, 
                   project_name, TO_CHAR(joining_date, 'YYYY-MM-DD') AS joining_date, 
                   TO_CHAR(relieving_date, 'YYYY-MM-DD') AS relieving_date, blood_group, 
                   photo, status, TO_CHAR(updated_date, 'YYYY-MM-DD') AS updated_date, 
                   TO_CHAR(dob, 'YYYY-MM-DD') AS dob, TO_CHAR(anniversary_date, 'YYYY-MM-DD') AS anniversary_date, 
                   father_name, mother_name, present_address, permenant_address, family_contact, pwd 
            FROM employeePortal
        `;
        
        const result = await client.query(query);
        res.status(200).json({ msg: "Data fetched successfully...", data: result.rows });

        await client.end();
    } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).json({ error: "An error occurred while fetching data" });
    }
});


router.get('/get-employeePortal', async function(req, res, next) {
    try {
        const email = req.query.email;
        console.log(":::", email);

        const client = await postgressqlConnection();
        const query = `SELECT * FROM employeePortal WHERE email = $1`;
        const result = await client.query(query, [email]);

        if (result.rows.length === 0) {
            return res.status(404).json({ msg: "No data found for the given email" });
        }

        res.status(200).json({ msg: "Data fetched successfully...", data: result.rows });
    } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).json({ error: "An error occurred while fetching data" });
    } 
});

router.put("/confirmPwd-employeePortal", async function(req, res, next) {
    const client = await postgressqlConnection();

    try {
        const { pwd, id } = req.body;

        if (!pwd || !id) {
            return res.status(400).json({ message: "Password and ID are required" });
        }

        const query = `
            UPDATE employeePortal SET pwd = $1 WHERE id = $2
        `;

        const queryParams = [pwd, id];
        const result = await client.query(query, queryParams);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: "No user found with the given ID" });
        }

        res.status(200).json({ message: "Data updated successfully" });
    } catch (e) {
        console.error('Error updating password:', e); 
        res.status(500).json({ message: "Internal server error" });
    } 
});



module.exports = router;



// const { Client } = require("pg");

// const client = new Client({
//     host: "localhost",
//     user: "postgres",
//     port: 5432,
//     password: "Vamsi1725@",
//     database: "vensai"
// });

// async function postgressqlConnection() {
//     await client.connect();
//     return client; // Return the client itself
// }

// const express = require('express');
// const postgressqlConnection = require('../databasepg');
// const router = express.Router();
// const multer = require('multer');

// router.get('/get-employeePortal', async function (req, res, next) {
//     try {
//         const data = req.query.id;
//         console.log("data:::::", data);
//         const connection = await postgressqlConnection();
//         const query = `SELECT * FROM employeePortal WHERE id = ${data}`;
//         const result = await connection.query(query);

//         if (result.rows.length > 0) {
//             res.status(200).json({ msg: "Data fetched successfully...", data: result.rows });
//         } else {
//             console.log("No data found for the given id:", data);
//             res.status(404).json({ error: "No data found for the given id" });
//         }

//         await connection.end();
//     } catch (error) {
//         console.error("Error fetching data:", error);
//         res.status(500).json({ error: "An error occurred while fetching data" });
//     }
// });

// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         cb(null, '../public/images/');
//     },
//     filename: function (req, file, cb) {
//         cb(null, file.originalname);
//     },
// });
// const upload = multer({ storage: storage });

// router.post("/post-employeePortal", upload.single('photo'), async (req, res) => {
//     try {
//         const data = req.body;
//         console.log("Received Data:", data);

//         const photoPath = req.file.path; 
        
//         const connection = await postgressqlConnection();

//         const query = `
//             INSERT INTO employeePortal (
//                 id, e_name, email, e_role, contact, gender, 
//                 project_name, joining_date, relieving_date, blood_group, 
//                 photo, status, updated_date, dob, e_anniversarydate, 
//                 father_name, mother_name
//             ) 
//             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
//         `;

//         const result = await connection.query(query, [
//             data.id, data.e_name, data.email, data.e_role, data.contact,
//             data.gender, data.project_name, data.joining_date, data.relieving_date,
//             data.blood_group, photoPath, data.status, data.updated_date,
//             data.dob, data.e_anniversarydate, data.father_name, data.mother_name
//         ]);

//         res.status(200).json({ msg: "Data posted successfully...", resposeData: result });

//         await connection.end(); 
//     } catch (error) {
//         console.error("Error posting data:", error);
//         res.status(500).json({ error: "An error occurred while posting data" });
//     }
// });





// router.put("/update-employeePortal/:id", async function (req, res, next) {
//     try {
//         const id = req.params.id;
//         const data = req.body;
//         console.log("::Data::", data);
//         const connection = await postgressqlConnection();
        
//         const photoData = Buffer.from(data.photo, 'base64');

//         const query = `
//             UPDATE employeePortal SET 
//                 e_name = '${data.e_name}', 
//                 email = '${data.email}', 
//                 e_role = '${data.e_role}', 
//                 contact = '${data.contact}', 
//                 gender = '${data.gender}', 
//                 project_name = '${data.project_name}', 
//                 joining_date = '${data.joining_date}', 
//                 relieving_date = '${data.relieving_date}', 
//                 blood_group = '${data.blood_group}', 
//                 photo = $1, 
//                 status = '${data.status}', 
//                 updated_date = '${data.updated_date}', 
//                 dob = '${data.dob}', 
//                 e_anniversarydate = '${data.e_anniversarydate}', 
//                 father_name = '${data.father_name}', 
//                 mother_name = '${data.mother_name}' 
//             WHERE id = ${id}
//         `;

//         const result = await connection.query(query, [photoData]);

//         res.status(200).json({ msg: "Data updated successfully..." });

//         await connection.end();
//     } catch (error) {
//         console.error("Error updating data:", error);
//         res.status(500).json({ error: "An error occurred while updating data" });
//     }
// });



// router.delete("/delete-employeePortal/", async function (req, res, next) {
//     try {
//         const id = req.query.id;
//         const connection = await postgressqlConnection();
//         const query = `DELETE FROM employeePortal WHERE id = ${id}`;
//         const result = await connection.query(query);

//         if (result.rowCount > 0) {
//             res.status(200).json({ msg: "Data deleted successfully..." });
//         } else {
//             console.log("No data found for the given id:", id);
//             res.status(404).json({ error: "No data found for the given id" });
//         }

//         await connection.end();
//     } catch (error) {
//         console.error("Error deleting data:", error);
//         res.status(500).json({ error: "An error occurred while deleting data" });
//     }
// });


// module.exports = router;


