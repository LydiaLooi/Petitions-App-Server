const Error = require('./CustomError');

function checkEmail(email) {
    if (email == null) {
        throw new Error.BadRequestError("Email is null");
    } else {
        // let pattern = /((([a-z]|[0-9])+(([.])(([a-z]|[0-9]))+)*([@])([a-z]|[0-9])+)(([.])([a-z]|[0-9])+)+)/;
        let pattern = /(([a-z]|[0-9])+(([.])([a-z]|[0-9])+)*([@])([a-z]|[0-9])+(([.])([a-z]|[0-9])+)+)/;
        // https://www.w3resource.com/javascript/form/email-validation.php
        //let pattern = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w)+$/;
        if (!email.match(pattern)) {
            throw new Error.BadRequestError(`Invalid email: ${email}`);
        }
    }
}

/***
 * Validates a string is not null (if notNull is true) and has a length of at least 1 character
 * @param string - the string to be checked
 * @param type - the type of string that is being checked (will be in the error message)
 * @param notNull -  boolean. True = Cannot be null. False = Can be null/
 */
function checkString(string, type, notNull) {

    if (notNull) {
        if (string == null || string.length < 1 || (typeof string != "string")) {
            throw new Error.BadRequestError(`Invalid ${type}`);
        }
    } else {
        if (string != null && string.length < 1 && (typeof string != "string")) {
            throw new Error.BadRequestError(`Invalid ${type}`);
        }
    }
}

function checkPassword(password) {
    if (password == null || (typeof password != "string") || password.length < 1) {
        throw new Error.BadRequestError("Invalid password");
    }
}

function checkPetitionClosingDate(current, closing) {
    let closingDate = new Date(Date.parse(closing));
    if (closing != null && isNaN(closingDate.getDate())) {
        throw new Error.BadRequestError("Invalid closing date");
    } else if ( closingDate <= current ) {
        throw new Error.BadRequestError("Invalid closing date, must be in the future");
    }
}

/***
 * Just checks that something is not null. Nicer than copy pasting if not null statements.
 * @param toCheck - the thing to check
 * @param type - what it is, will be in the error message
 */
function checkNotNull(toCheck, type) {
    if (toCheck == null || toCheck.length <= 0) {
        throw new Error.BadRequestError(`Invalid ${type}: cannot be null`);
    }
}

function checkNumber(toCheck, type) {
    if (isNaN(Number(toCheck)) || !Number.isInteger(Number(toCheck))) {
        throw new Error.BadRequestError(`Invalid ${type}: should be an integer`);
    }
}

function checkNonNegativeNumber(toCheck, type) {
    if (isNaN(Number(toCheck)) || !Number.isInteger(Number(toCheck))) {
        throw new Error.BadRequestError(`Invalid ${type}: should be an integer`);
    }
    if (Number(toCheck) < 0) {
        throw new Error.BadRequestError(`Invalid ${type}: should be an integer >= 0`);
    }
}

function checkNonNegativeNumberNotNull(toCheck, type) {
    checkNotNull(toCheck, type);
    if (isNaN(Number(toCheck)) || !Number.isInteger(Number(toCheck))) {
        throw new Error.BadRequestError(`Invalid ${type}: should be an integer`);
    }
    if (Number(toCheck) < 0) {
        throw new Error.BadRequestError(`Invalid ${type}: should be an integer >= 0`);
    }
}

function checkNumberJSON(toCheck, type) {
    checkNotNull(toCheck, type);
    if (typeof toCheck == "string") {
        throw new Error.BadRequestError(`Invalid ${type}: should be an integer`);
    }
    if (isNaN(Number(toCheck)) || !Number.isInteger(Number(toCheck))) {
        throw new Error.BadRequestError(`Invalid ${type}: should be an integer`);
    }
    if (Number(toCheck) < 0) {
        throw new Error.BadRequestError(`Invalid ${type}: should be an integer >= 0`);
    }
}
module.exports = {
    checkEmail,
    checkPassword,
    checkPetitionClosingDate,
    checkString,
    checkNotNull,
    checkNumber,
    checkNonNegativeNumber,
    checkNonNegativeNumberNotNull,
    checkNumberJSON
};
