const requiredVariables = [
    "MONGO_URI",
    "JWT_SECRET",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_REDIRECT_URI"
];

const validateEnv = () => {
    const missingVariables = requiredVariables.filter(
        (name) => !process.env[name]
    );

    if (missingVariables.length) {
        throw new Error(
            `Missing required environment variables: ${missingVariables.join(", ")}`
        );
    }
};

module.exports = { validateEnv };