const mkdirp = require('mkdirp');
const QRCode = require('qrcode')
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const Rekognition = require('node-rekognition');
const bcrypt = require("bcrypt");
const AWSParameters = {
    "accessKeyId": "",
    "secretAccessKey": "",
    "region": "ap-southeast-2",
}
const requests = [];
const rekognition = new Rekognition(AWSParameters);
const responseToClient = (requestId,obj) => {
    if(requests.length > 0){
        const requestInfo = requests.filter(item => item.requestId === requestId);
        if(requestInfo.length > 0){
            requestInfo[0].res.send(obj);
            requests.splice(requests.indexOf(requestInfo[0]), 1)
        }else{
            console.log(requestInfo)
        }
    }else{
        console.log("Requests array is empty")
    }
}
const detectFaces = async (documentId,cb) =>{
    const bitmap = fs.readFileSync('./files/'+documentId+'.png')
    const imageFaces = await rekognition.detectFaces(bitmap)
    if(imageFaces?.FaceDetails?.length > 0){
        cb(true);
    }else{
        cb(false)
    }
}
const recogizeFaces = async (documentId,cb) =>{
    const selfiePhoto = fs.readFileSync('./files/'+documentId+'.png')
    const documentPhoto = fs.readFileSync('./files/'+documentId.split("_")[0]+'.png')
    const imageFaces = await rekognition(selfiePhoto,documentPhoto);
    if(imageFaces){
        if(imageFaces.FaceMatches?.length > 0){
            if(imageFaces.FaceMatches[0]?.Similarity > 74){
                cb(imageFaces.FaceMatches[0]?.Similarity)            
            }else{
                cb(false)
            }
        }else{
            cb(false)
        }
    }else{
        cb(false)
    }
}
const addWaterMark = async (documentId,res) => {
    const opts = {
        errorCorrectionLevel: 'H',
        quality: 1,
        margin: 2,
        width:50,
        color: {
            dark: '#000',
            light: '#fff',
        },
    }
    QRCode.toDataURL(documentId, opts, async (err,url)=>{
        const doc = await PDFDocument.load(fs.readFileSync('./files/'+documentId+'.pdf'));
        const pages = doc.getPages();
        const img = await doc.embedPng(url);
        for (const [i, page] of Object.entries(pages)) {
            page.drawImage(img, {
                x: page.getWidth() - 60,
                y: page.getHeight() - (page.getHeight() - 10)
            });
        }
        fs.writeFileSync('./files/'+documentId+'.pdf', await doc.save());
        console.log("Document Signed")
        res.send(true);
    })
}
module.exports = {detectFaces,recogizeFaces,addWaterMark,mkdirp,QRCode,PDFDocument,fs,rekognition,requests,bcrypt,responseToClient}