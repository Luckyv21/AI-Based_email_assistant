const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        const token = authHeader?.startsWith("Bearer ")
            ? authHeader.slice(7).trim()
            : req.query.token;

        if (!token) {
            return res.status(401).json({
                message: "Not authorized. Please login."
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = decoded;

        next();

    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
};

module.exports = protect;