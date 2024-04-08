const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const upload = require("express-fileupload");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(express.static('files'));
app.use('/files', express.static(__dirname + '/files'));
app.use(cors());
app.use(upload());
const mkdirp = require('mkdirp');
app.get('/test', (req,res) =>{
  res.send('............SAKIDS IS RUNNING.............')
});
const AWS = require('aws-sdk');
const { fs } = require('./context/methods');
const AWSParameters = {
  "accessKeyId": "AKIA2QFUB2ASLPANDXX3",
  "secretAccessKey": "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",
  "region": "ap-southeast-2",
}
const s3 = new AWS.S3(AWSParameters)
const port = 7625;
var rekognition = new AWS.Rekognition(AWSParameters);


const uploadFile = (filePath,bucketName,newFileNameKey) => {
  const fileStream = fs.createReadStream(filePath);
  fileStream.on('error',(err) => {
    console.log('File Error', err)
  })

  const params = {
    Bucket:bucketName,
    Key:newFileNameKey,
    Body: fileStream
  }
  s3.upload(params,(err,data) => {
    if(err){
      console.log(err)
    }
    if(data){
      console.log('SUCCESS', data?.Location)
    }
  })
}

app.post("/uploadavatar",function(req,res){
  if (req.files) {
    const file = req.files.fileUrl;
    const {schoolId,studentId} = req.body;
    mkdirp.sync('./files/'+schoolId);
    const filePath = `./files/${schoolId}/${studentId}.png`;
    file.mv(filePath, (err) => {
      if (err) {
        res.send({status:0,message:'Failed to upload your file'})
      }else{
        indexFaces(filePath,studentId,(status) => {
          if(status){
            res.send({status:200,message:'Your profile photo has been enrolled successfully'})
          }
        })
        res.send({status:200,message:'Your profile photo has been enrolled successfully'})
      }
    });
  }
});
app.post("/recognize",function(req,res){
  console.log('wowowow--------')
	if (req.files) {
    const file = req.files.fileUrl;
    const {parentId} = req.body;
    mkdirp.sync('./searches/');
    const filePath = `./searches/${parentId}.png`;
    file.mv(filePath, (err) => {
      if (err) {
        res.send({status:0,message:'Failed to upload your file'})
      }else{
        searchByImage(filePath,(response)=> {
          if(!response){
            res.send({status:0,message:'Not Recognized, please try again!'})
          }else{
            res.send({status:200,message:response})
          }
        })
      }
    });
  }
});
const searchByImage =  (filePath,cb) => {
  var bitmap = fs.readFileSync(filePath);
  console.log(bitmap)
	rekognition.searchFacesByImage({
	 	"CollectionId": "sakids-first",
	 	"FaceMatchThreshold": 0,
	 	"Image": { 
	 		"Bytes": bitmap,
	 	},
	 	"MaxFaces": 1
	}, function(err, data) {
    console.log(data)
	 	if (err) {
	 		console.log(err);
       cb(false)
	 	} else {
			if(data.FaceMatches && data.FaceMatches.length > 0 && data.FaceMatches[0].Face){
        console.log(JSON.stringify(data.FaceMatches[0].Face))
        cb({studentId:data.FaceMatches[0].Face?.ExternalImageId,confidence:data.FaceMatches[0].Face?.Confidence}) 
			} else {
				console.log("Not recognized");
        cb(false)
			}
		}
	});
}
const indexFaces = (filePath,studentId,cb) => {
  var bitmap = fs.readFileSync(filePath);
  rekognition.indexFaces({
    "CollectionId": "sakids-first", "DetectionAttributes": [ "ALL" ],
    "ExternalImageId": studentId,"Image": {"Bytes": bitmap}
  }, function(err, data) {
    if (err) {
      console.log('failed', err)
      cb(false);
    } else {
      cb(true)
      console.log(JSON.stringify(data))
    }
  });
}
app.listen(port, () => {
    console.log(`Listening on port ${port} (HTTP)...`);
    const phoneNumber = "23367839300";
    const formattedNumber = formatPhoneNumber(phoneNumber);
    console.log(formattedNumber)
});

const formatPhoneNumber = (phoneNumber) => {
    phoneNumber = phoneNumber.replace(/\D/g, '');
    if (phoneNumber.length !== 11) {
        console.error("Invalid phone number length.");
        return phoneNumber;
    }
    const formattedPhoneNumber = phoneNumber.replace(/(\d{3})(\d{4})(\d{4})/, '+$1 $2 $3');
    return formattedPhoneNumber;
}

