const mongoose = require('mongoose');
const mysql   =     require("mysql");
const mongoConnector = async () => {
    try {
        const connection = await mongoose.connect("mongodb+srv://empiredigitals:empireDigitals@empiredigitals.3y8feyb.mongodb.net/?retryWrites=true&w=majority");
        console.log("Connected To The DB!")
    } catch (error) {
        console.log("Could not connect to the DB!")
    }
}
const mysqlConnector = async (cb) =>{
    const connection    =    mysql.createPool({
        connectionLimit   :   150,
        host              :   'localhost',
        port              :   3306,
        user              :   'root',
        password          :   '',
        database          :   'valid',
        debug             :   false,
        multipleStatements : true
    });
    cb(connection)
}

const dbConnection = (type,cb) => type === 'mongo' ? mongoConnector() : mysqlConnector(cb)
module.exports = {dbConnection}