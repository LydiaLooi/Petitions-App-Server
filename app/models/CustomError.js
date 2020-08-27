class BadRequestError extends Error {
    constructor(message) {
        super(message);
        this.name = "Bad Request Error";
        this.code = 400;
    }
}

class UnauthorizedError extends Error {
    constructor(message) {
        super(message);
        this.name = "Unauthorized Error";
        this.code = 401;
    }
}

class NotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = "Not Found Error";
        this.code = 404;
    }
}

class ForbiddenError extends Error {
    constructor(message) {
        super(message);
        this.name = "Forbidden Error";
        this.code = 403;
    }
}

module.exports = {
    BadRequestError,
    UnauthorizedError,
    NotFoundError,
    ForbiddenError
};
