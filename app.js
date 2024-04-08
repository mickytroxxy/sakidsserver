const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const upload = require("express-fileupload");
const fs = require('fs');
const {updateData, getDescriptors } = require("./context/firebase");

const { Canvas, Image, ImageData } = require('canvas');
const canvas = require("canvas");
const faceapi = require('face-api.js');
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(express.static('files'));
app.use('/files', express.static(__dirname + '/files'));
app.use(cors());
app.use(upload());
const mkdirp = require('mkdirp');

const port = 7625;
Promise.all([
    faceapi.nets.faceRecognitionNet.loadFromDisk('./models'),
    faceapi.nets.faceLandmark68Net.loadFromDisk('./models'),
    faceapi.nets.ssdMobilenetv1.loadFromDisk('./models')
]).then(startServer);

async function startServer() {
    app.get('/test', (req, res) => {
        res.send('............SAKIDS IS RUNNING.............')
    });

    app.post("/uploadavatar", async function (req, res) {
        if (req.files) {
            const file = req.files.fileUrl;
            const { schoolId, studentId } = req.body;
            mkdirp.sync('./files/' + schoolId);
            const filePath = `./files/${schoolId}/${studentId}.png`;
            file.mv(filePath, async (err) => {
                if (err) {
                    res.send({ status: 0, message: 'Failed to upload your file' })
                } else {
                    try {
                        const results = await indexFaces(filePath, studentId);
                        res.send(results);
                    } catch (error) {
                        console.error(error);
                        res.send({ status: 0, message: 'Internal server error' });
                    }
                }
            });
        }
    });

    app.post("/recognize", async function (req, res) {
        if (req.files) {
            const file = req.files.fileUrl;
            const { parentId } = req.body;
            mkdirp.sync('./searches/');
            const filePath = `./searches/${parentId}.png`;
            file.mv(filePath, async (err) => {
                if (err) {
                    res.send({ status: 0, message: 'Failed to upload your file' })
                } else {
                    try {
                        const result = await searchByImage(filePath);
                        res.send(result);
                    } catch (error) {
                        console.error(error);
                        res.send({ status: 500, message: 'Internal server error' });
                    }
                }
            });
        }
    });

    app.listen(port, () => {
        console.log(`Listening on port ${port} (HTTP)...>`);
        //searchByImage("./files/FR70416925/EN77469711.png")
        //searchByImage("./searches/MI83892218.png")
    });
}

async function indexFaces(filePath, studentId) {
    const img = await canvas.loadImage(filePath);
    const results = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors();
    if(results.length === 1) {
        const descriptor = results[0].descriptor.toString();
        const response = await updateData('kids',studentId,{descriptor});
        if(response){
            return { status: 200, message: 'Your profile photo has been enrolled successfully' }
        }else{
            return { status: 0, message: 'There was an error while trying to save your avatar!' }
        }
    }else if(results.length > 1){
        return { status: 200, message: 'Oops, we found more than 1 faces in the image!' }
    }else {
        return { status: 200, message: 'No face detected in the image!' }
    }
}

async function searchByImage(filePath) {
    const img = await canvas.loadImage(filePath);
    const results = await faceapi.detectAllFaces(img).withFaceLandmarks().withFaceDescriptors();
    if(results.length === 1) {
        const queryDescriptor = results[0].descriptor;
        let descriptors = await getDescriptors();
        if(descriptors?.length > 0){
            descriptors = descriptors.map(face => {
                const {descriptor = '',id:schoolId,...rest} = face;
                if (descriptor) {
                    const FloatDescriptor = new Float32Array(descriptor.split(',').map(parseFloat));
                    return new faceapi.LabeledFaceDescriptors(schoolId, [FloatDescriptor]);
                }
            })
            
            const faceMatcher = new faceapi.FaceMatcher(descriptors, 0.6);
            const bestMatch = faceMatcher.findBestMatch(queryDescriptor);
            if(bestMatch?.distance < 0.3){
                return { status: 200, message: {studentId:bestMatch.label,confidence:bestMatch.distance} }
            }else{
                return { status: 0, message: 'Not Recognized, please try again!' }
            }
        }else{
            return { status: 0, message: 'No faces found to compare with!' }
        }
    }else if(results.length > 1){
        return { status: 0, message: 'Oops, we found more than 1 faces in the image!' }
    }else {
        return { status: 0, message: 'No face detected in the image!' }
    }

}