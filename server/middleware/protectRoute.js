import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

const protectRoute = async (req, res, next) => {
    try {
        // Get the Token
        const token = req.cookies.jwt;

        if (!token) {
            return res.status(400).json({ error: "Unauthorized:No Token Provided" })
        }

        // decode the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded) {
            return res.status(400).json({ error: "Unauthorized Invalid Token" })
        }

        //Find the user
        const user = await User.findOne({ _id: decoded.userId }).select("-password");

        if (!user) {
            return res.status(400).json({ error: "User not Found" })
        }

        req.user = user;
        next(); //this function is used to call the next function like my work is over 
    } catch (error) {
        console.log(`Error in protectRoute middleware: ${error}`);
        res.status(500).json({ error: "Internal Server Error" })
    }
}

export default protectRoute;