import { initializeApp } from "firebase/app";

import {
  getFirestore,
} from "firebase/firestore";

import {
  getStorage,
} from "firebase/storage";

import {
  getAuth,
} from "firebase/auth";

const firebaseConfig = {

  apiKey:
    "AIzaSyB9Y1zFuunRzIwPTYEixpWFB4tO52YdnsU",

  authDomain:
    "laboratorio-android-e82a4.firebaseapp.com",

  projectId:
    "laboratorio-android-e82a4",

  storageBucket:
    "laboratorio-android-e82a4.firebasestorage.app",

  messagingSenderId:
    "289048533770",

  appId:
    "1:289048533770:web:8870683999263f1d0538f3",

};

const app =
  initializeApp(firebaseConfig);

export const db =
  getFirestore(app);

export const storage =
  getStorage(app);

export const auth =
  getAuth(app);