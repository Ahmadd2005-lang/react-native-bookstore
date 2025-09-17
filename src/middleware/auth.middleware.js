import jwt from "jsonwebtoken";
import User from "../models/User.js";

const protectRoute = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    if (!authHeader) {
      return res
        .status(401)
        .json({ message: "No authentication token, access denied" });
    }

    // get token safely
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return res
        .status(401)
        .json({ message: "No authentication token, access denied" });
    }

    // verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // find user
    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return res.status(401).json({ message: "Token is not valid" });
    }

    req.user = user;
    next();
  } catch (e) {
    console.log("Authentication error:", e.message);
    return res.status(401).json({ message: "Token is not valid" });
  }
};

export default protectRoute;
