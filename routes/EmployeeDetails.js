const express = require("express");
const postgressqlConnection = require("../databasepg");
const crypto = require('crypto');
const router = express.Router();
const multer = require("multer");
const path = require("path");
const jwt = require("jsonwebtoken");
const { default: axios } = require("axios");

const SHARED_VECTOR = Buffer.from([0x01, 0x02, 0x03, 0x05, 0x07, 0x0B, 0x0D, 0x11]);
const KEY = 'vensaiVtrack';

// Key generation function
const getKey = () => {
    const keyHash = crypto.createHash('md5').update(KEY, 'utf8').digest();
    const keyArray = Buffer.alloc(24);
    for (let i = 0; i < keyArray.length; i++) {
        keyArray[i] = keyHash[i % keyHash.length];
    }
    return keyArray;
};

// Encryption function
const encrypt = (rawText) => {
    const keyBytes = getKey();
    const cipher = crypto.createCipheriv('des-ede3-cbc', keyBytes, SHARED_VECTOR);
    cipher.setAutoPadding(true);
    let encrypted = cipher.update(rawText, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
};

// Decryption function
const decrypt = (encText) => {
    try {
        const keyBytes = getKey();
        const decipher = crypto.createDecipheriv('des-ede3-cbc', keyBytes, SHARED_VECTOR);
        decipher.setAutoPadding(true);
        let decrypted = decipher.update(encText, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (err) {
        console.error("Decryption error:", err.message);
        return null;
    }
};

// Example usage
const rawText = "Vensai";
const encryptedText = encrypt(rawText);
console.log("Encrypted:", encryptedText);

// Note: Ensure that encryptedText is used correctly for decryption
const decryptedText = decrypt(encryptedText);
console.log("Decrypted:", decryptedText);
const secretKey = 'your_secret_key';


router.post("/login_emp_details", async (req, res, next) => {
    const client = await postgressqlConnection();
    try {
        const data = req.body;
        const encText = encrypt(data.emp_password);
        console.log(":::",encText)

        const query = `SELECT * FROM emp_details WHERE emp_id = $1`;
        const queryParams = [data.emp_id];
        const result = await client.query(query, queryParams);

        if (result.rows.length > 0) {
            const encPwdResponse = await axios.get(`http://192.168.2.86:9090/encryptionORdecryption/getEncryptionDecryption?rawtext=${data.emp_password}&encryptionordecryption=encryption`);
            const encPwd = encPwdResponse.data;
            console.log("::::check::::",encPwd);

            console.log(":::+++>",result.rows[0].emp_password);

            if (result.rows[0].emp_password === encText || result.rows[0].emp_password === encPwd) {
                const token = jwt.sign({ email: result.rows[0].email, id: result.rows[0].id }, secretKey, { expiresIn: '24h' });
                return res.status(200).json({ message: "Login successful", data: result.rows, token: token });
            } else {
                return res.status(401).json({ message: "Incorrect password" });
            }
        } else {
            return res.status(404).json({ message: "No data found" });
        }
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: "Internal server error" });
    }
});

router.get("/get_skill_set_form",async(req,res,next)=>{
    try{
        const client =await postgressqlConnection();
        const emp_id=req.query.emp_id;
        console.log(":::",emp_id)
        const query=`select * from skill_set_form where emp_id=$1`;
        const queryParams=[emp_id];
        const result=await client.query(query,queryParams);
        if(result.rows.length>0){
            res.status(200).json({message:"Data fetched successfully",data:result.rows});
        }
        else{
            res.status(404).json("No data found");
        }
    }
    catch(e){
        console.log(e);
        res.status(500).json("Internal server error");
    }
})

router.get("/get_emp_details", async (req, res) => {
    let client;
    try {
        client = await postgressqlConnection();
        const emp_id = req.query.emp_id;
        console.log(":::", emp_id)

        const query1 = ` SELECT emp_id,emp_first_name,emp_last_name,emp_password,gender,doj,email,manager_id,
            current_designation,contact_number,role,department_id,status,location, 
                   project_name,emp_photo
            FROM emp_details WHERE emp_id = $1`;
        const query2 = `select TO_CHAR(updated_date, 'YYYY-MM-DD') AS updated_date,blood_group,TO_CHAR(anniversary_date, 'YYYY-MM-DD') AS anniversary_date,family_contact,relieving_date from emp_additional_details_form WHERE emp_id = $1`;
        const query3 = `select title,primary_skill, nationality,TO_CHAR(dob, 'YYYY-MM-DD') AS dob,father_name,mother_name,personal_email,present_address,
        perminent_address from emp_personal_details WHERE emp_id = $1`;
        const query4=`select * from skill_set_form where emp_id=$1`;
        const result1 = await client.query(query1, [emp_id]);
        const result2 = await client.query(query2, [emp_id]);
        const result3 = await client.query(query3, [emp_id]);
        const result4 = await client.query(query4, [emp_id]);

        if (result1.rows.length > 0 || result2.rows.length > 0 || result3.rows.length > 0 || result4.rows.length > 0) {
            const empDetails = { ...result1.rows[0], ...result2.rows[0], ...result3.rows[0], ...result4.rows[0] }
            // empDetails.emp_password = decrypt(empDetails.emp_password);
            res.status(200).json(empDetails);
            // res.send("Data fetched successfully");

        } else {
            res.status(404).json({ message: "Employee not found" });
        }
    } catch (e) {
        console.error("Error occurred:", e.message);
        res.status(500).json({ message: "Internal server error" });
    } finally {
        if (client) await client.end();  // Ensure connection is closed
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

router.post("/post_emp_details", upload.single('emp_photo'), async (req, res, next) => {
    let client;
    try {
        client = await postgressqlConnection();
        const data = req.body;
        console.log(data);
        const photoPath = req.file.filename;



        const encrypt = (rawText) => {
            const keyBytes = getKey();
            const cipher = crypto.createCipheriv('des-ede3-cbc', keyBytes, SHARED_VECTOR);
            cipher.setAutoPadding(true);
            let encrypted = cipher.update(rawText, 'utf8', 'base64');
            encrypted += cipher.final('base64');
            return encrypted;
        };

        const encText = encrypt(data.emp_password);

        const query1 = `INSERT INTO emp_details(emp_id, emp_first_name, emp_last_name, emp_password, gender, doj, email, manager_id, current_designation, department_id, contact_number, role, status, location, project_name, emp_photo)
                        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`;
        const queryParams1 = [data.emp_id, data.emp_first_name, data.emp_last_name, encText, data.gender, data.doj, data.email, data.manager_id, data.current_designation, data.department_id, data.contact_number, data.role, data.status, data.location, data.project_name, photoPath];

        const query2 = `INSERT INTO emp_additional_details_form(emp_id, updated_date, blood_group, anniversary_date, family_contact)
                        VALUES($1, $2, $3, $4, $5)`;
        const queryParams2 = [data.emp_id, data.updated_date, data.blood_group, data.anniversary_date, data.family_contact];

        const query3 = `INSERT INTO emp_personal_details(emp_id, title, primary_skill, nationality, dob, father_name, mother_name, personal_email, present_address, perminent_address)
                        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`;
        const queryParams3 = [data.emp_id, data.title, data.primary_skill, data.nationality, data.dob, data.father_name, data.mother_name, data.personal_email, data.present_address, data.perminent_address];

        await client.query('BEGIN');

        await client.query(query1, queryParams1);

        await client.query(query2, queryParams2);

        await client.query(query3, queryParams3);

        await client.query('COMMIT');

        res.status(200).json({ message: "Data added successfully" });
    } catch (e) {
        console.error("Error occurred:", e.message);
        if (client) await client.query('ROLLBACK');
        res.status(500).json({ message: "Internal server error" });
    } finally {
        if (client) await client.end();  // Ensure connection is closed
    }
});

router.put("/update_emp_details", upload.single('emp_photo'), async (req, res) => {
    const client = await postgressqlConnection();

    try {
        const data = req.body;
        console.log("Received Data:", data);

        const photoPath = req.file ? req.file.filename : data.emp_photo;

        const query1 = `
            UPDATE emp_details 
            SET 
                emp_first_name=$1, emp_last_name=$2, gender=$3, doj=$4,
                email=$5, manager_id=$6, current_designation=$7, department_id=$8, contact_number=$9,
                role=$10, status=$11, location=$12, project_name=$13, emp_photo=$14
            WHERE emp_id=$15
        `;

        const queryParams1 = [
            data.emp_first_name, data.emp_last_name, data.gender, data.doj, data.email, data.manager_id,
            data.current_designation, data.department_id, data.contact_number, data.role, data.status,
            data.location, data.project_name, photoPath, data.emp_id
        ];

        const query2 = `
            UPDATE emp_additional_details_form
            SET 
                updated_date=$1, blood_group=$2, anniversary_date=$3, family_contact=$4, relieving_date=$5 
            WHERE emp_id=$6
        `;
        const queryParams2 = [
            data.updated_date, data.blood_group, data.anniversary_date, data.family_contact,
            data.relieving_date === 'null' ? null : data.relieving_date, data.emp_id
        ];

        const query3 = `
            UPDATE emp_personal_details
            SET 
                title=$1, primary_skill=$2, nationality=$3, dob=$4, father_name=$5, mother_name=$6,
                personal_email=$7, present_address=$8, perminent_address=$9
            WHERE emp_id=$10
        `;
        const queryParams3 = [
            data.title, data.primary_skill, data.nationality, data.dob, data.father_name, data.mother_name,
            data.personal_email, data.present_address, data.perminent_address, data.emp_id
        ];

        const result1 = await client.query(query1, queryParams1);
        const result2 = await client.query(query2, queryParams2);
        const result3 = await client.query(query3, queryParams3);

        let result4 = null;
        let result5 = null;

        if (result1.rowCount > 0 && result2.rowCount > 0 && result3.rowCount > 0) {
            res.status(200).json({ msg: "Data updated successfully..." });
        } else {
            if (result2.rowCount <= 0) {
                const query4 = `INSERT INTO emp_additional_details_form(emp_id, updated_date, blood_group, anniversary_date, family_contact)
                                VALUES($1, $2, $3, $4, $5)`;
                const queryParams4 = [data.emp_id, data.updated_date, data.blood_group, data.anniversary_date, data.family_contact];
                result4 = await client.query(query4, queryParams4);
            }
            
            if (result3.rowCount <= 0) {
                const query5 = `INSERT INTO emp_personal_details(emp_id, title, primary_skill, nationality, dob, father_name, mother_name, personal_email, present_address, perminent_address)
                                VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`;
                const queryParams5 = [data.emp_id, data.title, data.primary_skill, data.nationality, data.dob, data.father_name, data.mother_name, data.personal_email, data.present_address, data.perminent_address];
                result5 = await client.query(query5, queryParams5);
            }

            if ((result4 && result4.rowCount > 0) && (result5 && result5.rowCount > 0)) {
                res.status(200).json({ message: "Data added successfully" });
            } else {
                res.status(404).json({ message: "No data found" });
            }
        }

        await client.end();
    } catch (error) {
        console.error("Error updating data:", error);
        res.status(500).json({ error: "An error occurred while updating data" });
    }
});

router.get("/getAll_emp_details",
    function (req, res, next) {
        const headerData = req.headers.authorization;
        if (headerData) {
            jwt.verify(headerData, "your_secret_key", function (error, success) {
                if (error) {
                    res.send("Invalid token");
                }
                else {
                    next();
                }
            })
        }
        else {
            res.send("No token found");
        }


    },
    async (req, res, next) => {
        try {
            const client = await postgressqlConnection();

            const query1 = `
            SELECT emp_id,emp_first_name,emp_last_name,emp_password,gender,doj,email,manager_id,
            current_designation,contact_number,role,department_id,status,location, 
                   project_name,emp_photo
            FROM emp_details
        `;
            const query2 = `select TO_CHAR(updated_date, 'YYYY-MM-DD') AS updated_date,blood_group,TO_CHAR(anniversary_date, 'YYYY-MM-DD') AS anniversary_date,family_contact,relieving_date from emp_additional_details_form`;
            const query3 = `select title, primary_skill, nationality,TO_CHAR(dob, 'YYYY-MM-DD') AS dob,father_name,mother_name,personal_email,present_address,
        perminent_address from emp_personal_details`

            // const result = await client.query(query);
            await client.query("BEGIN");
            const result1 = await client.query(query1);
            const result2 = await client.query(query2);
            const result3 = await client.query(query3);
            await client.query("COMMIT");
            const result = { ...result1.rows, ...result2.rows, ...result3.rows };
            res.status(200).json({ msg: "Data fetched successfully...", data: result });

            await client.end();
        } catch (error) {
            console.error("Error fetching data:", error);
            res.status(500).json({ error: "An error occurred while fetching data" });
        }
    });

router.get("/getAll_emp_details_data", async (req, res, next) => {
    try {
        const client = await postgressqlConnection();
        const query = `
                SELECT emp_id, emp_first_name, emp_last_name, emp_password, gender, doj, email, manager_id,
                       current_designation, contact_number, role, department_id, status, location, 
                       project_name, emp_photo
                FROM emp_details`;
        const result = await client.query(query);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "No data found" });
        }

        res.status(200).json({ message: "Data fetched successfully", data: result.rows });
    } catch (e) {
        console.log(e);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.put("/delete_emp_details", async (req, res, next) => {
    try {
        const data = req.body;
        console.log("delete::::", data);
        const connection = await postgressqlConnection();
        const query = `update emp_details set status=$1 where emp_id=$2`;
        const result = await connection.query(query, [data.status, data.emp_id]);

        // if (result.rowCount === 0) {
        //     // No rows affected, meaning no data to delete
        //     res.status(404).json({ error: "No data found to delete" });
        // } else {
        // Data deleted successfully
        res.status(200).json({ msg: "Data deleted successfully", response: result });
        // }
    } catch (error) {
        console.error("Error deleting data:", error); // Use 'error' instead of 'e' for consistency
        res.status(500).json({ error: "An error occurred while deleting data" });
    }
});


const storageData = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../public/files'));
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname); // Save the file with its original name
    },
});

const uploadData = multer({ storage: storageData });

router.post("/skill_Set_form", uploadData.single("resume"), async (req, res, next) => {
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
        const query = `select * from skill_set_form where emp_id=$1`
        const queryParams = [emp_id];
        const result = await client.query(query, queryParams);
        if (result.rowCount > 0) {
            res.status(200).json({ message: "Data fetched successfully", data: result.rows });
        }
        else {
            res.status(404).json("No data found");
        }
    }
    catch (e) {
        res.status(500).json("Internal server error");
        console.log(e);
    }
})

router.get('/forgot_emp_detials', async function(req, res, next) {
    try {
        const emp_id = req.query.emp_id;
        console.log(":::", emp_id);

        const client = await postgressqlConnection();
        const query = `SELECT * FROM emp_details WHERE emp_id = $1`;
        const result = await client.query(query, [emp_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ msg: "No data found for the given employee id" });
        }

        res.status(200).json({ msg: "Data fetched successfully...", data: result.rows });
    } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).json({ error: "An error occurred while fetching data" });
    } 
});

router.post("/confirmemp_password_emp_details", async (req, res, next) => {
    const client = await postgressqlConnection();
    try {
        const encrypt = (rawText) => {
            const keyBytes = getKey();
            const cipher = crypto.createCipheriv('des-ede3-cbc', keyBytes, SHARED_VECTOR);
            cipher.setAutoPadding(true);
            let encrypted = cipher.update(rawText, 'utf8', 'base64');
            encrypted += cipher.final('base64');
            return encrypted;
        };

        const { emp_id, emp_password } = req.body;
        const encText = encrypt(emp_password);
        console.log(":::data:::", req.body);

        if (!emp_password || !emp_id) {
            return res.status(400).json({ message: "Password and ID are required" });
        }
        
        const query = `
            UPDATE emp_details SET emp_password = $1 WHERE emp_id = $2
        `;

        const queryParams = [encText, emp_id];
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

router.put("/update_skill_set_form",uploadData.single("resume"),async(req,res,next)=>{
    try{
        const client =await postgressqlConnection();
        const data=req.body;
        const pathName=req.file ? req.file.filename : data.resume;
        const query=`update skill_set_form set
        skill_set=$1,previous_exp=$2,resume=$3, certifications=$4 where emp_id=$5`
        const queryParams=[data.skill_set,data.previous_exp, pathName, data.certifications,data.emp_id];
        const result=await client.query(query,queryParams);
        if(result){
            res.status(200).json("Data added successfully");
        }
        else{
            res.status(404||400).json("Data not inseted");
        }
    }
    catch(e){
        console.log(e);
        res.status(500).json("Internal server error");
    }
})



//=============================================================================================================================================

// const express = require('express');
// const crypto = require('crypto');
// const router = express.Router();

// // const crypto = require('crypto');

// // Key and IV definition
// const key = 'vensaiVtrack';
// let keyArray = Buffer.alloc(24); // Ensure the keyArray is 24 bytes long

// const sharedVector = Buffer.from([0x01, 0x02, 0x03, 0x05, 0x07, 0x0B, 0x0D, 0x11]);

// // Create the MD5 hash of the key
// const hash = crypto.createHash('md5');
// hash.update(key, 'utf8');

// const temporaryKeyBuffer = hash.digest();

// // Copy the temporaryKeyBuffer into keyArray, repeating if necessary
// for (let i = 0; i < keyArray.length; i++) {
//   keyArray[i] = temporaryKeyBuffer[i % temporaryKeyBuffer.length];
// }

// // Data to encrypt
// const toEncrypt = '0T4154P2';
// const toEncryptArray = Buffer.from(toEncrypt, 'utf8');

// // Create the cipher
// const cipher = crypto.createCipheriv('des-ede3-cbc', keyArray, sharedVector);
// cipher.setAutoPadding(true);

// // Encrypt the data
// let encrypted = cipher.update(toEncryptArray);
// encrypted = Buffer.concat([encrypted, cipher.final()]);

// console.log(":::encrypted::", encrypted.toString('hex'));

//==============================================================================================================================================


// Shared vector (IV)
// const sharedVector = Buffer.from([0x01, 0x02, 0x03, 0x05, 0x07, 0x0B, 0x0D, 0x11]);

// // Decryption key
// const key = 'vensaiVtrack';
// let keyArray = crypto.createHash('md5').update(key, 'utf-8').digest();
// keyArray = Buffer.concat([keyArray, keyArray.slice(0, 8)]); // Ensure key length is 24 bytes

// // Decrypt function
// function decrypt(encText) {
//     try {
//         // Decode base64 to get the binary data
//         const encryptedData = Buffer.from(encText, 'base64');

//         // Create decipher with 'des-ede3-cbc' algorithm
//         const decipher = crypto.createDecipheriv('DESede/CBC/PKCS5Padding', keyArray, sharedVector);
//         decipher.setAutoPadding(true);

//         // Perform decryption
//         let decrypted = decipher.update(encryptedData, 'binary', 'utf-8');
//         decrypted += decipher.final('utf-8');
//         return decrypted;
//     } catch (err) {
//         console.error('Decryption error:', err);
//         return null;
//     }
// }

// router.get('/get_emp_details_data', async (req, res) => {
//     try {
//         // Connect to PostgreSQL
//         const client = new Client({
//             host: '192.168.2.86',
//             port: 5432,
//             user: 'postgres',
//             password: 'postgres',
//             database: 'postgres'
//         });
//         await client.connect();

//         // Query the database
//         const empId = req.query.emp_id;
//         const query = 'SELECT emp_password FROM emp_details WHERE emp_id = $1';
//         const result = await client.query(query, [empId]);

//         if (result.rows.length > 0) {
//             const encryptedPassword = result.rows[0].emp_password;
//             const decryptedPassword = decrypt(encryptedPassword);
//             if (decryptedPassword !== null) {
//                 res.status(200).json({ message: 'Data retrieved successfully', decryptedPassword });
//             } else {
//                 res.status(500).json({ message: 'Decryption failed' });
//             }
//         } else {
//             res.status(404).json({ message: 'No data found' });
//         }

//         await client.end();
//     } catch (e) {
//         console.error(e);
//         res.status(500).json({ message: 'Internal server error' });
//     }
// });

// })();

module.exports = router;