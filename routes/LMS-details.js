const express = require("express");
const postgressqlConnection = require("../databasepg");
const router = express.Router();

router.get("/get_leave_types", async (req, res, next) => {
    try {
        const client = await postgressqlConnection();
        const { emp_id, department_id } = req.query;

        console.log(emp_id);
        console.log(department_id);

        // Query to get leave types for the year 2024
        const leaveTypesQuery = `SELECT * FROM leave_types WHERE leaves_year = $1`;
        const leaveTypesResult = await client.query(leaveTypesQuery, ['2024']);

        // Query to get user leaves for the year 2024
        const userLeavesQuery = `SELECT * 
                                 FROM user_leaves 
                                 WHERE emp_id = $1 AND EXTRACT(YEAR FROM leave_applied_date) = $2`;
        const userLeavesResult = await client.query(userLeavesQuery, [emp_id, '2024']);

        // Query to get department details based on department_id
        const departmentQuery = `SELECT * FROM department WHERE department_id = $1`;
        const departmentResult = await client.query(departmentQuery, [department_id]);

        // Query to get the employee's manager_id and first name
        const empDetailsQuery = `SELECT manager_id, emp_first_name FROM emp_details WHERE emp_id = $1`;
        const empDetailsResult = await client.query(empDetailsQuery, [emp_id]);

        // Get manager_id from the result of the previous query
        const manager_id = empDetailsResult.rows[0].manager_id;

        // Query to get the manager's details (first name and email) based on manager_id
        const managerDetailsQuery = `SELECT emp_first_name, email FROM emp_details WHERE emp_id = $1`;
        const managerDetailsResult = await client.query(managerDetailsQuery, [manager_id]);

        res.status(200).json({
            message: "Data fetched successfully",
            leaveTypes: leaveTypesResult.rows,
            userLeaves: userLeavesResult.rows,
            departmentDetails: departmentResult.rows,
            managerDetails: managerDetailsResult.rows,
        });

    } catch (e) {
        console.log(e);
        res.status(500).json("Internal server error");
    }
});

router.post("/leave_monthly_generator", async (req, res, next) => {
    try {
        const client = await postgressqlConnection();
        const { employee, year, month } = req.body; // Destructure the data from the request body
        console.log(employee+ "   "+ year +"   "+ month);
        

        const query = `
            SELECT *
            FROM user_leaves
            WHERE emp_id = $1 
              AND EXTRACT(YEAR FROM leave_applied_date) = $2
              AND EXTRACT(MONTH FROM leave_applied_date) = $3;
        `;

        const queryParams = [employee, year, month];
        const result = await client.query(query, queryParams);

        const query2=`select * from leave_types where leaves_year=$1`
        const result2=await client.query(query2,[year]);

        const query3=`select * from user_leaves where  emp_id=$1 AND EXTRACT(YEAR FROM fromdate)=$2`;
        const queryParams3=[employee,year];
        const result3=await client.query(query3,queryParams3);

        res.status(200).json({ message: "Data fetched successfully", user_leaves: result.rows, leave_types:result2.rows, userLeavesData:result3.rows });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: "Internal server error" });
    }
});



router.get("/get_emp_details", async (req, res) => {
    try {
        const client = await postgressqlConnection();
        const query = 'SELECT emp_id, emp_first_name FROM emp_details';
        const result = await client.query(query);

        res.status(200).json({
            message: "Data fetched successfully",
            data: result.rows // Only return the rows from the result
        });
    } catch (error) {
        console.error('Error fetching employee details:', error);
        res.status(500).json({ message: "Internal server error" });
    } finally {
        client.release(); // Ensure the client is released after the query
    }
});



router.post("/post_leave_form", async (req, res, next) => {
    try {
        const client = await postgressqlConnection();
        const data = req.body;
        const query = `INSERT INTO user_leaves(
            leave_id, leave_applied_date, fromdate, todate, leavemode, duration, reason, leavetypeid, emp_id, privilage_id,status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,$11)`;
        const queryParams = [
            data.leave_id,
            data.leave_applied_date,
            data.fromdate,
            data.todate,
            data.leavemode,
            data.duration,
            data.reason,
            data.leavetypeid,
            data.emp_id,
            data.privilage_id === "" ? null : data.privilage_id,
            data.status
        ];
        const result = await client.query(query, queryParams);
        res.status(200).json({ message: "Data added successfully" });
    } catch (e) {
        console.log(e);
        res.status(500).json({ error: "Internal server error" });
    }
});




module.exports = router;