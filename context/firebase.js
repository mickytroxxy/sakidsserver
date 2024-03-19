const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc,updateDoc, getDocs, setDoc, query, where } = require('firebase/firestore/lite');
const { Expo } = require('expo-server-sdk');
let expo = new Expo();
const firebaseConfig = {
    apiKey: "AIzaSyADeaY6ODRICSJoK4ThUXedwMrFwc2ZP40",
    authDomain: "myguy-a78d0.firebaseapp.com",
    projectId: "myguy-a78d0",
    storageBucket: "myguy-a78d0.appspot.com",
    messagingSenderId: "743810339840",
    appId: "1:743810339840:web:e9a54dd0e53c8cd61074e5"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const createData = async (tableName,docId,data) => {
    try {
        await setDoc(doc(db, tableName, docId), data);
        return true;
    } catch (e) {
        console.log(e)
        return false;
    }
}
const updateData = async (tableName,docId,obj) => {
    try {
        const docRef = doc(db, tableName, docId);
        await updateDoc(docRef, obj);
        return true;
    } catch (e) {
        return false;
    }
}
const getDocumentById = async (documentId,cb) => {
    try {
        const querySnapshot = await getDocs(query(collection(db, "documents"), where("documentId", "==", documentId)));
        const data = querySnapshot.docs.map(doc => doc.data());
        cb(data)
    } catch (e) {
        cb(e);
    }
}
const getDocumentByUserId = async (documentOwner,cb) => {
    try {
        const querySnapshot = await getDocs(query(collection(db, "documents"), where("documentOwner", "==", documentOwner)));
        const data = querySnapshot.docs.map(doc => doc.data());
        cb(data)
    } catch (e) {
        cb(e);
    }
}
const getUserInfo = async (id,cb) => {
    try {
        const querySnapshot = await getDocs(query(collection(db, "clients"), where("id", "==", id)));
        const data = querySnapshot.docs.map(doc => doc.data());
        cb(data)
    } catch (e) {
        cb(e);
    }
}
const login = async (phoneNumber,password,cb) => {
    try {
        const querySnapshot = await getDocs(query(collection(db, "clients"), where("phoneNumber", "==", phoneNumber), where("password", "==", password)));
        const data = querySnapshot.docs.map(doc => doc.data());
        cb(data)
    } catch (e) {
        cb(e);
    }
}
const sendPushNotification = async (to,body) => {
    const messages = [
        {
            to,
            sound: 'default',
            body,
            data: {},
        }
    ]
    let chunks = expo.chunkPushNotifications(messages);
    for (let chunk of chunks) {
        try {
          let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          console.log(ticketChunk);
        } catch (error) {
          console.error(error);
        }
    }
}
const listenToChange =  (requestId,cb) => {
    
}
module.exports = {createData,login,getDocumentByUserId,listenToChange,sendPushNotification,updateData,getDocumentById,getUserInfo};