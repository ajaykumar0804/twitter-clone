import express from 'express';
import dotenv from 'dotenv';
import connectDB from './db/connectDB.js';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import authRoute from './routes/auth.route.js';
import userRoute from './routes/user.route.js';
import postRoute from './routes/post.route.js';
import notificationRoute from './routes/notificationRoute.js';
import cloudinary from 'cloudinary';
import path from 'path';

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET_KEY
})



const app = express();
const __dirname = path.resolve();


const PORT = process.env.PORT;
app.use(express.json({
    limit:"5mb" //default value 100kb
}));
app.use(express.urlencoded({ extended: true }));

app.use(cors({
    origin : "http://localhost:3000",
    credentials:true
}));



app.use(cookieParser());

app.use("/api/auth", authRoute);
app.use("/api/users", userRoute);
app.use("/api/posts",postRoute);
app.use("/api/notifications",notificationRoute);

if(process.env.NODE_ENV === "production"){
    app.use(express.static(path.join(__dirname,"/frontend/build")))
    app.use("*",(req,res)=>{
        res.sendFile(path.resolve(__dirname,"frontend","build","index.html"))
    })
}

app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`);
    connectDB();
});
