const petition = require('../models/petition.models');
const Error = require('../models/CustomError');
const AttChecker = require('../models/AttChecker');

exports.viewPetitions = async function (req, res) {
    console.log("Request to list petitions~");
    try {
        const result = await petition.getPetitions(req.query);
        res.status(200).send(result);
    } catch (err) {
        if (err instanceof Error.BadRequestError) {
            res.status(err.code).send(`[${err.code}] ${err}`);
        } else {
            res.status(500).send(`[500] ${err}`);

        }
        console.log(`[ERROR] ${err}`);
    }
};

exports.addNewPetition = async function (req, res) {
    console.log("Request to add a new petition~");
    let token = req.headers['x-authorization'];
    let title = req.body.title;
    let description = req.body.description;
    let categoryId = req.body.categoryId;
    let closingDate = req.body.closingDate;

    try {
        const result = await petition.addPetition(token, title, description, categoryId, closingDate);
        res.status(201).send(result);
    } catch (err) {
        if (err instanceof Error.BadRequestError || err instanceof Error.UnauthorizedError) {
            res.status(err.code).send(`[${err.code}] ${err}`);
        } else {
            res.status(500).send(`[500] ${err}`);
        }
        console.log(`[ERROR] ${err}`);
    }

};

exports.viewOnePetition = async function (req, res) {
    console.log("Request to view one petition~");
    let petitionId = req.params.id;
    try {
        const result = await petition.getPetition(petitionId);
        res.status(200).send(result);
    } catch (err) {
        if (err instanceof Error.NotFoundError) {
            res.status(err.code).send(`[${err.code}] ${err}`);
        } else {
            res.status(500).send(`[500] ${err}`);
        }
        console.log(`[ERROR] ${err}`);
    }

};

exports.editPetition = async function (req, res) {
    console.log("Request to edit a petition~");
    let petitionId = req.params.id;
    let token = req.headers['x-authorization'];

    try {
        const result = await petition.edit(petitionId, token, req.body);
        res.status(200).send("Petition edited successfully");

    } catch (err) {
        if (err instanceof Error.BadRequestError ||
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

exports.getCategories = async function(req, res) {
    console.log("Request to get petition categories~");
    try {
        let result = await petition.getAllCategories();
        res.status(200).send(result);
    } catch (err) {
        res.status(500).send(`[500] ${err}`);
        console.log(`[ERROR] ${err}`);
    }
};

exports.getPetitionSignatures = async function (req, res) {
    console.log("Request to get petition signatures~");
    let petitionId = req.params.id;

    try {
        let result = await petition.getSignatures(petitionId);
        res.status(200).send(result);
    } catch (err) {
        if (err instanceof Error.NotFoundError) {
            res.status(err.code).send(`[${err.code}] ${err}`);
        } else {
            res.status(500).send(`[500] ${err}`);
        }
        console.log(`[ERROR] ${err}`);
    }
};

exports.deletePetition = async function (req, res) {
    console.log("Request to delete a petition~");
    let petitionId = req.params.id;
    let token = req.headers['x-authorization'];

    try {
        let result = await petition.delete(petitionId, token);
        res.status(200).send("Petition and its signatures have been deleted");
    } catch (err) {
        if (err instanceof Error.UnauthorizedError ||
            err instanceof Error.ForbiddenError ||
            err instanceof Error.NotFoundError) {
            res.status(err.code).send(`[${err.code}] ${err}`);
        } else {
            res.status(500).send(`[500] ${err}`);
        }
        console.log(`[ERROR] ${err}`);
    }
};

exports.signPetition = async function (req, res) {
    console.log("Request to sign a petition~");
    let petitionId = req.params.id;
    let token = req.headers['x-authorization'];

    try {
        let result = await petition.sign(petitionId, token);
        res.status(201).send("Petition successfully signed");
    } catch (err) {
        if (err instanceof Error.UnauthorizedError ||
            err instanceof Error.ForbiddenError ||
            err instanceof Error.NotFoundError) {
            res.status(err.code).send(`[${err.code}] ${err}`);
        } else {
            res.status(500).send(`[500] ${err}`);
        }
        console.log(`[ERROR] ${err}`);
    }

};

exports.removeSignature = async function (req, res) {
    console.log("Request to remove a signature~");
    let petitionId = req.params.id;
    let token = req.headers['x-authorization'];
    try {
        let result = await petition.unsign(petitionId, token);
        res.status(200).send("Signature successfully removed");
    } catch (err) {
        if (err instanceof Error.UnauthorizedError ||
            err instanceof Error.ForbiddenError ||
            err instanceof Error.NotFoundError) {
            res.status(err.code).send(`[${err.code}] ${err}`);
        } else {
            res.status(500).send(`[500] ${err}`);
        }
        console.log(`[ERROR] ${err}`);
    }
};

exports.setPetitionPhoto = async function (req, res) {
    console.log("Request to set a petition photo~");


    let token = req.headers['x-authorization'];
    let petitionId = req.params.id;
    let contentType = req.headers['content-type'];
    let body = req.body;

    try {

        const status = await petition.setPhoto(petitionId, token, body, contentType);
        if (status === 201) {
            res.status(status).send("Petition photo saved successfully")
        } else if (status === 200) {
            res.status(status).send("Petition photo overwritten and saved successfully")
        }
    }  catch (err) {
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

exports.getPetitionPhoto = async function (req, res) {
    console.log("Request to get a petition photo~");

    let petitionId = req.params.id;

    try {
        let [data, contentType] = await petition.getPhoto(petitionId);
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