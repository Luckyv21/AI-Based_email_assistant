const notFoundHandler = (req, res, next) => {
    const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
    error.statusCode = 404;
    next(error);
};

const errorHandler = (error, req, res, next) => {
    const statusCode = error.statusCode || error.status || 500;

    if (res.headersSent) {
        return next(error);
    }

    if (statusCode >= 500) {
        console.error("Unhandled server error:", error.message);
    }

    res.status(statusCode).json({
        message: statusCode === 404 ? "Route not found" : "Internal server error"
    });
};

module.exports = {
    notFoundHandler,
    errorHandler
};