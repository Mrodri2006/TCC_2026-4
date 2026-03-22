import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import "firebase/compat/storage";

// COLAR AQUI A STRING DE CONEXÃO
const firebaseConfig = {
 apiKey: "AIzaSyDY47c79ede5r80wMLaDaNmYCDMpkPo6mU",
authDomain: "info-650fe.firebaseapp.com",
projectId: "info-650fe",
storageBucket: "info-650fe.firebasestorage.app",
messagingSenderId: "690975448573",
appId: "1:690975448573:web:bdceeb4f33bfdabcf80d94",
measurementId: "G-LEYT04758D"
};
  
  
// INICIALIZAR O FIREBASE
let app;
if (firebase.apps.length == 0) {
    app = firebase.initializeApp(firebaseConfig);
} else {
    app = firebase.app();
}

const auth = firebase.auth();
const firestore = firebase.firestore();
const storage = firebase.storage();
export { auth, firestore, storage };
