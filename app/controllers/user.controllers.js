const user = require('../models/user.models');
const Error = require('../models/CustomError');
const path = require('path');

exports.registerUser = async function (req, res) {
    console.log("Request to register a user~");

    try {
        const response = await user.register(req);
        res.status(201).send(response);
    } catch (err) {
        if (err instanceof Error.BadRequestError) {
            res.status(err.code).send(`[${err.code}] ${err}`);
        } else {
            res.status(500).send(`[500] ${err}`);
        }
        console.log(`[ERROR] ${err}`)
    }

};


exports.loginUser = async function (req, res) {
    console.log("Request to login a user~");
    const email = req.body.email;
    const password = req.body.password;

    try {
        console.log("Passed Email and Password checks~");
        const response = await user.login(email, password);
        res.status(200).send(response);
    } catch (err) {
        if (err instanceof Error.BadRequestError) {
            res.status(err.code).send(`[${err.code}] ${err}`);
        } else {
            res.status(500).send(`[500] ${err}`);
        }
        console.log(`[ERROR] ${err}`)
    }

};

exports.logoutUser = async function (req, res) {
    console.log("Request to logout a user");
    let token = req.headers['x-authorization'];

    try {
        const response = await user.logout(token);
        res.status(200).send("[200] User logged out");

    } catch (err) {
        if (err instanceof Error.UnauthorizedError) {
            res.status(err.code).send(`[${err.code}] ${err}`);
        } else {
            res.status(500).send(`[500] ${err}`);
        }
        console.log(`[ERROR] ${err}`);
    }
};

exports.getUser = async function (req, res) {
    console.log("Request to get a user~");
    let token = req.headers['x-authorization'];
    let user_id = req.params.id;

    try {
        const response = await user.getInfo(user_id, token);
        res.status(200).send(response);
    } catch (err) {
        if (err instanceof Error.NotFoundError) {
            res.status(err.code).send(`[${err.code}] ${err}`);
        } else {
            res.status(500).send(`[500] ${err}`);
        }
        console.log(`[ERROR] ${err}`);
    }
};

exports.editUser = async function (req, res) {
    console.log("Request to edit a user~");
    let token = req.headers['x-authorization'];
    let user_id = req.params.id;

    try {
        const response = await user.edit(user_id, token, req.body);
        res.status(200).send("Patched!");
    } catch (err) {
        if (err instanceof Error.BadRequestError) {
            res.status(err.code).send(`[${err.code}] ${err}`);
        } else if (err instanceof Error.UnauthorizedError) {
            res.status(err.code).send(`[${err.code}] ${err}`);
        } else if (err instanceof Error.ForbiddenError) {
            res.status(err.code).send(`[${err.code}] ${err}`);
        } else {
            res.status(500).send(`[500] ${err}`);
        }
        console.log(`[ERROR] ${err}`);
    }
};

exports.getUserPhoto = async function (req, res) {
    console.log("Request to get user photo~");
    let userId = req.params.id;

    try {
        let [data, contentType] = await user.getPhoto(userId);
        console.log("Content type: ", contentType);
        res.contentType(contentType);
        res.status(200).send(data);
    } catch (err) {
        if (err instanceof Error.NotFoundError) {
            res.status(err.code).send(`[${err.code}] ${err}`);
        } else {
            res.status(500).send(`[500] ${err}`);
        }
        console.log(`[ERROR] ${err}`);
    }

};

exports.setUserPhoto = async function (req, res) {
    console.log("Request to set a user's photo~");



    let token = req.headers['x-authorization'];
    let userId = req.params.id;
    let contentType = req.headers['content-type'];
    let body = req.body;


    try {
        const status = await user.setPhoto(userId, token, body, contentType);
        if (status === 201) {
            res.status(status).send("User photo saved successfully")
        } else if (status === 200) {
            res.status(status).send("User photo overwritten and saved successfully")
        }
    } catch (err) {
        if (
            err instanceof Error.BadRequestError ||
            err instanceof Error.UnauthorizedError ||
            err instanceof Error.ForbiddenError ||
            err instanceof Error.NotFoundError) {
            res.status(err.code).send(`[${err.code}] ${err}`);
        } else {
            res.status(500).send(`[500] ${err}`);
        }
        console.log(`[ERROR] ${err}`);
    }
};

exports.deleteUserPhoto = async function (req, res) {
    console.log("Request to delete a user photo~");


    let token = req.headers['x-authorization'];
    let userId = req.params.id;
    try {
        let result = await user.deletePhoto(userId, token);
        res.status(200).send("User photo deleted!");
    } catch (err) {
        if (
            err instanceof Error.UnauthorizedError ||
            err instanceof Error.ForbiddenError ||
            err instanceof Error.NotFoundError) {
            res.status(err.code).send(`[${err.code}] ${err}`);
        } else {
            res.status(500).send(`[500] ${err}`);
        }
        console.log(`[ERROR] ${err}`);
    }

};