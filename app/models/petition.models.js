const db = require('../../config/db');
const Error = require('./CustomError');
const AttChecker = require('./AttChecker');
const fs = require('file-system');

function trimString(string) {
    string = string.replace(/^"|"$/g, '');
    return string;
}

function getSortByLine(sortBy) {
    let line = "\norder by signatureCount DESC";
    if (sortBy != null) {
        if (sortBy === "SIGNATURES_DESC") {
            line = "\norder by signatureCount DESC";
        } else if (sortBy === "ALPHABETICAL_ASC") {
            line = "\norder by title ASC";
        } else if (sortBy === "ALPHABETICAL_DESC") {
            line = "\norder by title DESC";
        } else if (sortBy === "SIGNATURES_ASC") {
            line = "\norder by signatureCount ASC";
        } else {
            throw new Error.BadRequestError(`sortBy parameter has invalid value: ${sortBy}`);
        }
    }
    return line;
}

exports.getPetitions = async function (params) {
    console.log("Request to get all petitions in the database~");

    let q = null;
    // if (params.q != null) {
    //     q = `%${trimString(params.q)}%`;
    // }
    if (params.hasOwnProperty("q")) {
        AttChecker.checkString(params.q, "q", true);
        q = `%${trimString(params.q)}%`;
    }

    // let categoryId = params.categoryId;
    // if (categoryId === "") {
    //     categoryId = null;
    // }

    let categoryId = null;

    if (params.hasOwnProperty("categoryId")) {
        AttChecker.checkNonNegativeNumberNotNull(params.categoryId, "category ID");
        categoryId = params.categoryId;
    }

    let authorId = null;
    if (params.hasOwnProperty("authorId")) {
        AttChecker.checkNonNegativeNumberNotNull(params.authorId, "author ID");
        authorId = params.authorId;
    }

    // let authorId = params.authorId;
    // if (authorId === "") {
    //     authorId = null;
    // }
    let sortByLine = getSortByLine(params.sortBy);

    const connection = await db.getPool().getConnection();

    let query = 'select\n' +
        'Petition.petition_id as petitionId,\n' +
        'title,\n' +
        'Category.name as category,\n' +
        'User.name as authorName,\n' +
        'count(Signature.petition_id) as signatureCount\n' +
        'from Petition right join Category on\n' +
        'Petition.category_id = Category.category_id join User on\n' +
        'Petition.author_id = User.user_id left join Signature on\n' +
        'Petition.petition_id = Signature.petition_id\n' +
        'where\n' +
        'Petition.title LIKE COALESCE(?,Petition.title) and\n' +
        'Category.category_id = COALESCE(?,Category.category_id) and\n' +
        'User.user_id = COALESCE(?,User.user_id)\n' +
        'group by Petition.petition_id';


    query += sortByLine; // add the order by to the query

    let [rows] = await connection.query(query, [q, categoryId, authorId]);

    let startIndex = null;
    if (params.hasOwnProperty("startIndex")) {
        AttChecker.checkNonNegativeNumberNotNull(params.startIndex);
        startIndex = Number(params.startIndex);
    }


    let count = null;
    if (params.hasOwnProperty("count")) {
        AttChecker.checkNonNegativeNumberNotNull(params.count);
        count = Number(params.count);
    }

    let result_rows;
    if (count != null) {
        result_rows = rows.slice(startIndex, startIndex + count);
    } else {
        result_rows = rows.slice(startIndex);
    }

    connection.release();
    return result_rows;
};

exports.addPetition = async function (token, title, description, categoryId, closingDate) {
    console.log("Request to add a petition~");

    if (token == null) {
        throw new Error.UnauthorizedError("Token is null");
    }



    const connection = await db.getPool().getConnection();

    try {
        // Authenticating user and getting their id or throwing an error if nothing is returned
        let query = 'select user_id from User where auth_token = ?';
        let [users] = await connection.query(query, [token]);
        if (users[0] == null) {
            throw new Error.UnauthorizedError("Invalid authorization token")
        }

        let author_id = users[0].user_id;

        // Validation checking
        let created_date = new Date();
        AttChecker.checkString(title, "title", true);
        AttChecker.checkString(description, "description", true);
        AttChecker.checkNumberJSON(categoryId, "category ID");
        AttChecker.checkPetitionClosingDate(created_date, closingDate);

        query = 'insert into Petition (title, description, author_id, category_id, created_date, closing_date)\n' +
            'values (?, ?, ?, ?, ?, ?)';
        let [result] = await connection.query(query, [title, description, author_id, categoryId, created_date, closingDate]);
        return {
            petitionId: result.insertId
        }
    } catch (err) {
        if (err instanceof Error.UnauthorizedError) {
            throw err;
        } else {
            throw new Error.BadRequestError(err);
        }
    } finally {
        connection.release();
    }
};

exports.getPetition = async function (petition_id) {
    console.log("Request to get petition info of petition: " + petition_id);
    let connection = await db.getPool().getConnection();

    try {
        let query = 'select \n' +
            'Petition.petition_id as petitionId,\n' +
            'Petition.title,\n' +
            'Category.name as category,\n' +
            'User.name as authorName,\n' +
            'count(Signature.petition_id) as signatureCount,\n' +
            'Petition.description,\n' +
            'User.user_id as authorId,\n' +
            'User.city as authorCity,\n' +
            'User.country as authorCountry,\n' +
            'Petition.created_date as createdDate,\n' +
            'Petition.closing_date as closingDate\n' +
            'from\n' +
            'Petition join User on \n' +
            'Petition.author_id = User.user_id join Category on\n' +
            'Petition.category_id = Category.category_id\n' +
            'left join Signature on\n' +
            'Petition.petition_id = Signature.petition_id\n' +
            'where Petition.petition_id = ?\n' +
            'group by Petition.petition_id;';
        let [result] = await connection.query(query, [petition_id]);
        if (result[0] == null) {
            throw new Error.NotFoundError(`Petition with id ${petition_id} does not exist`);
        }
        return result[0];
    } catch (err) {
        throw err;
    } finally {
        connection.release();
    }
};

function editTitle(user, data) {
    if (data.hasOwnProperty("title")) {
        return data.title;
    } else {
        return user.title;
    }
}

function editDescription(user, data) {
    if (data.hasOwnProperty("description")) {
        return data.description;
    } else {
        return user.description;
    }
}

function editCategoryId(user, data) {
    if (data.hasOwnProperty("category_id")) {
        return data.category_id;
    } else {
        return user.category_id;
    }
}


function editClosingDate(user, data) {
    //TODO: make data.closingDate a date cos yea different formatting and stuff
    let closingDate = new Date(data.closingDate);
    if (data.hasOwnProperty("closingDate")) {
        return closingDate;
    } else {
        return user.closingDate;
    }
}

function createEditedPetition(original_petition, data) {
    return {
        title: editTitle(original_petition, data),
        description: editDescription(original_petition, data),
        category_id: editCategoryId(original_petition, data),
        closing_date: editClosingDate(original_petition, data)
    }
}

function isSamePetition(originalPetition, editedPetition) {
    return originalPetition.title === editedPetition.title &&
        originalPetition.description === editedPetition.description &&
        originalPetition.category_id === editedPetition.category_id &&
        originalPetition.closing_date == editedPetition.closing_date;
}


exports.edit = async function (petitionId, token, body) {
    console.log(`Request to edit the petition ${petitionId}~`);

    if (token == null) {
        throw new Error.UnauthorizedError;
    }

    let connection = await db.getPool().getConnection();

    try {
        // Authenticating user and getting their id or throwing an error if nothing is returned
        let query = 'select user_id from User where auth_token = ?';
        let [users] = await connection.query(query, [token]);
        if (users[0] == null) {
            throw new Error.UnauthorizedError("Invalid authorization token")
        }
        let userId = users[0].user_id;

        let originalPetition;
        query = 'select petition_id, title, description, author_id, category_id, closing_date from Petition where petition_id = ?';
        let [results] = await connection.query(query, [petitionId]);

        if (results[0] == null) {
            throw new Error.NotFoundError(`Petition with ID ${petitionId} does not exist`);
        } else {
            originalPetition = results[0];
        }

        if (userId !== originalPetition.author_id) {
            throw new Error.ForbiddenError(`User ${userId} is not the author of petition ${petitionId}`);
        }

        let currentClosingDate = results[0].closing_date;
        let currentDate = new Date();
        if (currentClosingDate != null && currentClosingDate < currentDate) {
            throw new Error.BadRequestError(`Cannot edit a petition that has been closed. ${currentClosingDate} < ${currentDate} `);
        }

        let title;
        let description;
        let categoryId; // CategoryId must reference an existing category
        let closingDate;


        // Validation checks if the attribute is present
        if (body.hasOwnProperty("title")) {
            title = body.title;
            AttChecker.checkString(title, "title", true);
        }

        if (body.hasOwnProperty("description")) {
            description = body.description;
            AttChecker.checkString(description, "description", true);
        }

        if (body.hasOwnProperty("closingDate")) {
            let currentDate = new Date();
            closingDate = body.closingDate;
            // AttChecker.checkNotNull(closingDate, "closing date"); // It is allowed to be null in the database
            AttChecker.checkNotNull(closingDate, "closing date");
            AttChecker.checkPetitionClosingDate(currentDate, closingDate);
        }

        // Check that category ID is one that exists

        if (body.hasOwnProperty("categoryId")) {
            categoryId = body.categoryId;
            AttChecker.checkNumberJSON(categoryId, "category ID");
            query = 'select category_id from Category where category_id = ?';
            [results] = await connection.query(query, [categoryId]);
            if (results[0] == null) {
                throw new Error.BadRequestError(`Category ID ${categoryId} is not an existing category`);
            }
        }


        // Throw bad request if the patch won't change anything
        // let editedPetition = createEditedPetition(originalPetition, body);

        // console.log(editedPetition);
        // console.log(originalPetition);
        // if (isSamePetition(originalPetition, editedPetition)) {
        //     throw new Error.BadRequestError("No changes were given");
        // }

        console.log("Passed all tests");

        query = 'update Petition set title = COALESCE(?,title), description = COALESCE(?,description), category_id = COALESCE(?,category_id), closing_date = COALESCE(?,closing_date) where petition_id = ?';
        [results] = await connection.query(query, [title, description, categoryId, closingDate, petitionId]);
        return results;

    } catch (err) {
        throw err;
    } finally {
        connection.release();
    }
};

exports.getAllCategories = async function () {
    console.log("Request to get all categories~");

    let connection = await db.getPool().getConnection();

    try {
        let query = 'select category_id as categoryId, name from Category';
        let [results] = await connection.query(query);
        return results;

    } catch (err) {
        throw err;
    } finally {
        connection.release();
    }
};

exports.getSignatures = async function (petitionId) {
    console.log(`Request to get signatures of petition ${petitionId}~`);

    let connection = await db.getPool().getConnection();

    try {
        // Query to see if petition with the petition ID exists
        let query = 'select petition_id from Petition where petition_id = ?';
        let [results] = await connection.query(query, [petitionId]);
        if (results[0] == null) {
            throw new Error.NotFoundError(`Petition with ID ${petitionId} does not exist`);
        }

        query = 'select \n' +
            'Signature.signatory_id as signatoryId,\n' +
            'User.name as name,\n' +
            'User.city as city,\n' +
            'User.country as country,\n' +
            'Signature.signed_date as signedDate\n' +
            'from\n' +
            'Petition join Signature on Petition.petition_id = Signature.petition_id join User on User.user_id = Signature.signatory_id\n' +
            'where Petition.petition_id = ?\n' +
            'order by Signature.signed_date ASC';

        [results] = await connection.query(query, [petitionId]);
        return results;
    } catch (err) {
        throw err;
    } finally {
        connection.release();
    }
};

exports.delete = async function (petitionId, token) {
    console.log(`Request to delete petition with petition ID ${petitionId}~`);

    if (token == null) {
        throw new Error.UnauthorizedError("Token is null");
    }

    let connection = await db.getPool().getConnection();

    try {
        let query;
        // Check that the petition exists
        query = 'select petition_id, author_id from Petition where petition_id = ?';
        let [result] = await connection.query(query, [petitionId]);
        if (result[0] == null) {
            throw new Error.NotFoundError(`Petition ${petitionId} not found.`);
        }
        let authorId = result[0].author_id;

        // Check that user with token matches author user
        query = 'select user_id from User where auth_token = ?';
        [result] = await connection.query(query, [token]);
        if (result[0] == null) {
            throw new Error.UnauthorizedError(`User with given token does not exist`);
        }

        let userId = result[0].user_id;

        if (authorId != userId) {
            throw new Error.ForbiddenError(`User ${userId} cannot delete the petition ${petitionId} who's author is ${authorId}`);
        }

        // Delete the petition from the Petition table (Signature table deletes as well cos cascade)
        query = 'delete from Petition where petition_id = ?';
        [result] = await connection.query(query, [petitionId]);
        return result;

    } catch (err) {
        throw err;
    } finally {
        connection.release();
    }

};

exports.sign = async function (petitionId, token) { //TODO: Forbidden cannot sign a petition more than once
    console.log(`Request to sign petition ${petitionId}~`);
    if (token == null) {
        throw new Error.UnauthorizedError("Token is null");
    }

    let connection = await db.getPool().getConnection();

    let query;

    try {
        // Check that the petition exists
        query = 'select petition_id from Petition where petition_id = ?';
        let [result] = await connection.query(query, [petitionId]);
        if (result[0] == null) {
            throw new Error.NotFoundError(`Petition ${petitionId} not found.`);
        }

        // Check that user with token matches author user
        query = 'select user_id from User where auth_token = ?';
        [result] = await connection.query(query, [token]);
        if (result[0] == null) {
            throw new Error.UnauthorizedError(`User with given token does not exist`);
        }

        let userId = result[0].user_id;
        try {
            let signedDate = new Date();
            query = 'insert into Signature (petition_id, signatory_id, signed_date) values (?, ?, ?)';
            [result] = await connection.query(query, [petitionId, userId, signedDate]);
        } catch (err) {
            throw new Error.ForbiddenError(err);
        }
    } catch (err) {
        throw err;
    } finally {
        connection.release();
    }

};

exports.unsign = async function (petitionId, token) {
    console.log(`Request to unsign from petition ${petitionId}~`);

    if (token == null) {
        throw new Error.UnauthorizedError("Token is null");
    }

    let connection = await db.getPool().getConnection();
    let query;

    try {

        // Check that user with token matches author user
        let query = 'select user_id from User where auth_token = ?';
        let [result] = await connection.query(query, [token]);
        if (result[0] == null) {
            throw new Error.UnauthorizedError(`User with given token does not exist`);
        }

        let userId = result[0].user_id;

        // Check that the petition exists
        query = 'select petition_id from Petition where petition_id = ?';
        [result] = await connection.query(query, [petitionId]);
        if (result[0] == null) {
            throw new Error.NotFoundError(`Petition ${petitionId} not found.`);
        }


        // Check if user has even signed the petition
        query = 'select petition_id from Signature where petition_id = ? and signatory_id = ?';
        [result] = await connection.query(query, [petitionId, userId]);
        if (result[0] == null) {
            throw new Error.ForbiddenError(`Cannot unsign from a petition you haven't signed`);
        }

        try {
            query = 'delete from Signature where petition_id = ? and signatory_id = ?';
            [result] = await connection.query(query, [petitionId, userId]);
            console.log("RESULT:", result);
        } catch (err) {
            throw new Error.ForbiddenError(err);
        }

    } catch (err) {
        throw err;
    } finally {
        connection.release();
    }

};

exports.setPhoto = async function (petitionId, token, body, type) {
    console.log(`Request to set the photo of petition ${petitionId}`);

    let connection = await db.getPool().getConnection();

    // Validation of user
    if (token == null) {
        throw new Error.UnauthorizedError("Token is null");
    }

    try {
        let query;
        // Check that the petition exists
        query = 'select petition_id, author_id, photo_filename from Petition where petition_id = ?';
        let [result] = await connection.query(query, [petitionId]);
        if (result[0] == null) {
            throw new Error.NotFoundError(`User ${petitionId} not found.`);
        }

        let authorId = result[0].author_id;
        let currentPhoto = result[0].photo_filename;

        // Check that user with token matches actual user
        query = 'select user_id from User where auth_token = ?';
        [result] = await connection.query(query, [token]);
        if (result[0] == null) {
            throw new Error.UnauthorizedError(`User with given token does not exist`);
        }

        let userId = result[0].user_id;

        // Check that user is same as petition author
        if (userId !== authorId) {
            throw new Error.ForbiddenError(`User ${userId} cannot delete the photo for petition ${petitionId} who's author is ${authorId}`);
        }


        let status = 200;
        if (currentPhoto == null) {
            status = 201;
        }

        let storagePath = '.\\storage\\photos';
        let fileType;
        if (type === 'image/png') {
            fileType = 'png';
        } else if (type === 'image/jpeg') {
            fileType = 'jpg';
        } else if (type === 'image/gif') {
            fileType = 'gif'
        } else {
            throw new Error.BadRequestError(`File type ${type} is not a valid file type`)
        }
        let fileName = `petition_${petitionId}`;
        let filePath = `${storagePath}\\${fileName}.${fileType}`;

        fs.writeFileSync(filePath, body, 'binary', function (err) {
            if (err) throw err;
        });

        query = 'update Petition set photo_filename = ? where petition_id = ?';
        [result] = await connection.query(query, [`${fileName}.${fileType}`, petitionId]);

        return status;

    }  catch (err) {
        throw err;
    } finally {
        connection.release();
    }
};

function getFileType(filename) {
    let index = filename.lastIndexOf('.');
    let type =  (index < 0) ? '' : filename.substr(index + 1);
    return type;
}

exports.getPhoto = async function (petitionId) {
    console.log(`Request to get photo of petition ${petitionId}`);

    let connection = await db.getPool().getConnection();

    try {
        let query = 'select photo_filename from Petition where petition_id = ?';
        let [result] = await connection.query(query, [petitionId]);
        if (result[0] == null) {
            throw new Error.NotFoundError(`Petition with ID ${petitionId} does not exist`);
        }
        let filename = result[0].photo_filename;
        if (filename == null) {
            throw new Error.NotFoundError("No photo");
        }
        let storagePath = '.\\storage\\photos';
        let path = `${storagePath}\\${filename}`;

        console.log("PATH:", path);

        let data = fs.readFileSync(path, (err, data) =>  {
            if (err) throw err;
            return data;
        });
        let type = getFileType(filename);
        let contentType = 'image/';
        if (type === "jpg") {
            type = "jpeg";
        }
        contentType += type;

        return [data, contentType];


    } catch (err) {
        throw err
    } finally {
        connection.release();
    }

};