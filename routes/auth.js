const { createData, login } = require("../context/firebase");

const auth = (app) => {
    app.post("/register",function(req,res){
        const {id} = req.body;
        createData("clients",id,req.body);
        res.send({status:1,message:'SUCCESS'});
    })
    app.post("/login",function(req,res){
        const {phoneNumber,password} = req.body;
        console.log(phoneNumber)
        login(phoneNumber,password,(response) => {
            if(response.length > 0){
                res.send({status:1,companyData:response[0]})
            }else{
                res.send({status:0})
            }
        })
    })
}
module.exports = {auth};