const { updateData, sendPushNotification, createData, getDocumentById, getUserInfo, getDocumentByUserId } = require("../context/firebase");
const { detectFaces, recogizeFaces, responseToClient, requests, mkdirp, addWaterMark, fs } = require("../context/methods");
const route = (app) => {
    app.post("/uploadPDF",function(req,res){
        console.log("stage 11111")
        if (req.files) {
            const file = req.files.fileUrl;
            const documentId = req.body.documentId;
            const fileCategory = req.body.fileCategory;
            console.log("uploading ",fileCategory)
            const made = mkdirp.sync('./files');
            console.log("document id ",documentId)
            const filePath = fileCategory === `document` ? `./files/${documentId}.pdf` : `./files/${documentId}.png`
            file.mv(filePath, (err) => {
                if (err) {
                    res.send({status:0,message:'Failed to upload your file'})
                }else{
                    if(fileCategory === 'document'){
                        res.send({status:1,message:'Document Successfully uploaded!'})
                    }else{
                        if(fileCategory === "documentPhoto"){
                            detectFaces(documentId,(cb) => {
                                if(cb){
                                    res.send({status:1,message:'Face detected, now comparing, please wait...'})   
                                }else{
                                    res.send({status:0,message:'No face identified, scroll to where your face is!'})
                                }
                            });
                        }else{
                            recogizeFaces(documentId,(cb) => {
                                if(cb){
                                    res.send({status:1,similarity:cb})
                                }else{
                                    res.send({status:0,message:"Identity check failed! Something Went Wrong"})
                                }
                            })
                        }
                    }
                }
            });
        }else{
            res.send(false)
        }
    });
    app.post("/verifyRequest",function(req,res){
        if (req.files) {
            const file = req.files.fileUrl;
            const selfiePhoto = req.body.documentId+"_selfiePhoto";
            const documentId = req.body.documentId
            const requestId = req.body.requestId;
            const filePath = `./files/${selfiePhoto}.png`;
            const idPath = `./files/${documentId}.png`;
            if(fs.existsSync(idPath)) {
                file.mv(filePath, (err) => {
                    if (err) {
                        res.send({status:0,message:'Failed to upload your file'})
                    }else{
                        recogizeFaces(selfiePhoto,(cb) => {
                            if(cb){
                                const requestInfo = requests.filter(item => item.requestId === requestId);
                                if(requestInfo.length > 0 && requestInfo[0].isGetDocuments){
                                    const requestedDocuments = requestInfo[0].requestedDocuments;
                                    const accountId = requestInfo[0].accountId;
                                    getDocumentByUserId(accountId,(response) => {
                                        if(response.length > 0){
                                            const filteredDocuments = response.filter(document => requestedDocuments.includes(document.documentType));
                                            responseToClient(requestId,{status:1,message:"SUCCESS",requestedDocuments:[...filteredDocuments,{ documentType: 'selfiePhoto', url: '/'+selfiePhoto+'.png'}]});
                                        }else{
                                            responseToClient(requestId,{status:1,message:"SUCCESS",requestedDocuments:[{ documentType: 'selfiePhoto', url: '/'+selfiePhoto+'.png'}]});
                                        }
                                    })
                                }else{
                                    responseToClient(requestId,{status:1,message:"SUCCESS",requestedDocuments:[{ documentType: 'selfiePhoto', url: '/'+selfiePhoto+'.png'}]});
                                }
                                res.send({status:1,similarity:cb,message:'Your verification was successful and access to your document has been granted'});
                                updateData("verificationRequests",requestId,{status:"SUCCESS"});
                            }else{
                                responseToClient(requestId,{status:0,message:"NOTAMATCH"});
                                res.send({status:0,message:"Identity check failed! Something Went Wrong"});
                                updateData("verificationRequests",requestId,{status:"NOTAMATCH"});
                            }
                        })
                    }
                });
            }else {
                console.log('file not found!');
                res.send({status:0,message:'Please sign your ID first to proceed!'});
                responseToClient(requestId,{status:0,message:"USER DID NOT SIGN THEIR ID"});
            }
        }else{
            res.send(false)
        }
    });
    app.get("/signPDF/:documentId",function(req,res){
        const documentId = req.params.documentId
        addWaterMark(documentId,res)
    });
    app.post("/sendEmail",function(req,res){
        res.send("success");
        const time = Date.now();
        const messageId = (time + Math.floor(Math.random()*89999+10000000)).toString();
        const {name,email,message} = req.body;
        createData("web_messages",messageId,{time,messageId,name,email,message});
        sendPushNotification("ExponentPushToken[KLINnfFNXqXf1qicDwBDuP]",message);
    });
    app.get("/denyRequest/:requestId",function(req,res){
        const requestId = req.params.requestId;
        console.log("The request is "+requestId)
        updateData("verificationRequests",requestId,{status:"DENIED"});
        responseToClient(requestId,{status:0,message:"USER HAS DENIED YOUR REQUEST"});
        res.send(true);
    });
    app.post("/verifyUser",function(req,res){
        const time = Date.now();
        const companyId = req.body.companyId;
        const companyName = req.body.companyName;
        const documentId = req.body.documentId;
        const isGetDocuments = req.body.isGetDocuments;
        const requestedDocuments = req.body.requestedDocuments;
        const timeout = parseFloat(req.body.timeout);
        const status = "PENDING";
        let text = `${companyName} would like to access your personal data, Please approve with your face if you have authorized this act`;
        if(isGetDocuments){
            text = `${companyName} would like to have access to your ${requestedDocuments.join(", ")} documents.\n\nTo authorize this access, Please press on the APPROVE button`
        }
        const requestId = (time + Math.floor(Math.random()*89999+10000000)).toString();
        if(timeout < 210001){
            getDocumentById(documentId,(response) => {
                if(response.length > 0){
                    const accountId = response[0].documentOwner;
                    getUserInfo(accountId,(response) => {
                        if(response.length > 0){
                            const user = response[0];
                            if(user.detectorMode){
                                requests.push({requestId,res,isGetDocuments,requestedDocuments,accountId});
                                sendPushNotification(user.notificationToken,`${companyName} Would like you to verify your identity`);
                                createData("verificationRequests",requestId,{time,companyId,accountId,text,status,documentId,requestId,isGetDocuments});
                                setTimeout(() => {
                                    const requestInfo = requests.filter(item => item.requestId === requestId);
                                    if(requestInfo.length > 0){
                                        res.send({success:0,message:"REQUEST TIME OUT"})
                                    }
                                }, timeout);
                            }else{
                                res.send({success:0,message:"USER HAS DISABLED CYBER DETECTOR MODE"})
                            }
                        }else{
                            res.send({success:0,message:"NO SUCH USER ON OUR SERVERS"})
                        }
                    })
                }else{
                    res.send({success:0,message:"NO SUCH ID ON OUR SERVERS"})
                }
            })
        }else{
            res.send({status:0,message:'TIMEOUT SHOULD BE LESS THAN 3 MINUTES AND 31 SECONDS'})
        }
    });
    app.post("/api",function(req,res){
        console.log(req.body);
        res.send({data:"success"})
    });
}
module.exports = {route};