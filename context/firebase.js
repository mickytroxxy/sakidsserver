const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc,updateDoc, getDocs, setDoc, query, where } = require('firebase/firestore/lite');
const { Expo } = require('expo-server-sdk');
let expo = new Expo();
const firebaseConfig = {
    apiKey: "AIzaSyAGFeA3lGSbetYpwF1NkCajCx279wjymAQ",
    authDomain: "sakids-52169.firebaseapp.com",
    projectId: "sakids-52169",
    storageBucket: "sakids-52169.appspot.com",
    messagingSenderId: "743868067655",
    appId: "1:743868067655:web:2caf46c7422fcdfd86e662"
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
        console.log(e)
        return false;
    }
}
const getDescriptors = async () => {
    try {
        const querySnapshot = await getDocs(query(collection(db, "kids"), where("descriptor", "!=", '')));
        const data = querySnapshot.docs.map(doc => doc.data());
        return data;
    } catch (e) {
        return null;
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
module.exports = {createData,login,getDocumentByUserId,listenToChange,sendPushNotification,updateData,getDescriptors,getUserInfo};